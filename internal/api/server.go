// path: internal/api/server.go
package api

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"ebookdatabase/config"
	"ebookdatabase/internal/core"
	"ebookdatabase/internal/infra"
	"ebookdatabase/utils"
)

// Server 负责注册 Gin 路由并处理 API 请求。
type Server struct {
	engine     *gin.Engine
	dbManager  *infra.DBManager
	config     *config.Config
	configPath string
	jwtSecret  []byte
	cache      *searchCache
	listenAddr string
}

// NewServer 根据配置构建 Server 并注册所有路由。
func NewServer(cfg *config.Config, manager *infra.DBManager, configPath, listenAddr string, cacheTTL time.Duration) (*Server, error) {
	if cfg == nil {
		return nil, fmt.Errorf("配置不能为空")
	}
	if manager == nil {
		return nil, fmt.Errorf("数据库管理器不能为空")
	}
	srv := &Server{
		dbManager:  manager,
		config:     cfg,
		configPath: configPath,
		jwtSecret:  []byte(cfg.AdminPassword),
		cache:      newSearchCache(cacheTTL),
		listenAddr: listenAddr,
	}

	engine := gin.New()
	engine.Use(panicRecoveryMiddleware())
	engine.Use(corsMiddleware())

	engine.Static("/assets", "./frontend/dist/assets")
	engine.StaticFile("/github-mark.svg", "./frontend/dist/github-mark.svg")
	engine.StaticFile("/gitee-svgrepo-com.svg", "./frontend/dist/gitee-svgrepo-com.svg")
	engine.StaticFile("/settings-icon.svg", "./frontend/dist/settings-icon.svg")
	engine.StaticFile("/setting_logo.svg", "./frontend/dist/setting_logo.svg")
	engine.GET("/", srv.serveSPAIndex)
	engine.NoRoute(srv.serveSPAIndex)

	apiV1 := engine.Group("/api/v1")
	{
		apiV1.GET("/search", srv.handleSearch)
		apiV1.GET("/available-dbs", srv.handleGetDatasources)
		apiV1.GET("/settings", srv.handleGetSettings)
		apiV1.POST("/login", srv.handleLogin)
		apiV1.GET("/qr-code-url", srv.handleGetQRCodeURL)
		apiV1.GET("/download", srv.handleDownload)
		apiV1.GET("/cover", srv.handleCover)
	}

	admin := apiV1.Group("/admin")
	admin.Use(srv.AuthMiddleware())
	{
		admin.GET("/config", srv.handleGetFullConfig)
		admin.POST("/config", srv.handleSetFullConfig)
	}

	srv.engine = engine
	return srv, nil
}

// Run 启动 HTTP 服务。
func (s *Server) Run() error {
	if s.engine == nil {
		return fmt.Errorf("Gin 引擎尚未初始化")
	}
	if err := s.engine.Run(s.listenAddr); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("Gin 服务启动失败: %w", err)
	}
	return nil
}

// Engine 暴露内部的 Gin 引擎，便于测试。
func (s *Server) Engine() *gin.Engine {
	return s.engine
}

func corsMiddleware() gin.HandlerFunc {
	cfg := cors.DefaultConfig()
	cfg.AllowAllOrigins = true
	cfg.AllowCredentials = true
	cfg.AddAllowMethods("PUT", "DELETE", "OPTIONS")
	cfg.AddAllowHeaders("Authorization", "Content-Type", "X-Requested-With")
	return cors.New(cfg)
}

func (s *Server) serveSPAIndex(c *gin.Context) {
	c.File("./frontend/dist/index.html")
}

func (s *Server) handleGetDatasources(c *gin.Context) {
	names := s.dbManager.ListSources()
	c.JSON(http.StatusOK, gin.H{
		"available_dbs": names,
	})
}

func (s *Server) handleGetSettings(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"pageSize":           s.config.PageSize,
		"defaultSearchField": s.config.DefaultSearchField,
	})
}

func (s *Server) handleLogin(c *gin.Context) {
	if len(s.jwtSecret) == 0 {
		slog.Error("管理员密码未配置或为空")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "管理员密码未配置"})
		return
	}

	var payload struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求体格式错误"})
		return
	}

	if payload.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "密码不能为空"})
		return
	}

	if !s.verifyPassword(payload.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "密码错误"})
		return
	}

	claims := jwt.MapClaims{
		"sub": "admin",
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		slog.Error("生成 JWT 失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成凭证失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": signed})
}

func (s *Server) handleGetFullConfig(c *gin.Context) {
	payload, err := s.readSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, payload)
}

func (s *Server) handleSetFullConfig(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求体格式错误"})
		return
	}

	bytes, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		slog.Error("序列化配置失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存配置失败"})
		return
	}

	if err := os.WriteFile(s.configPath, bytes, 0o644); err != nil {
		slog.Error("写入配置失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "写入配置文件失败"})
		return
	}

	cfg, err := config.LoadConfig(s.configPath)
	if err != nil {
		slog.Error("重新加载配置失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "配置刷新失败"})
		return
	}

	if err := s.dbManager.InitFromConfig(cfg); err != nil {
		slog.Error("重新初始化数据源失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据源初始化失败"})
		return
	}

	s.config = cfg
	s.jwtSecret = []byte(cfg.AdminPassword)

	latest, err := s.readSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, latest)
}

func (s *Server) handleGetQRCodeURL(c *gin.Context) {
	ip, err := utils.GetLocalIP()
	if err != nil {
		slog.Error("获取本地 IP 失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "无法获取本地 IP"})
		return
	}

	url := fmt.Sprintf("http://%s%s", ip, s.listenAddr)
	c.JSON(http.StatusOK, gin.H{"url": url})
}

func (s *Server) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		secret := s.jwtSecret
		if len(secret) == 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
			return
		}

		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
			return
		}

		tokenString := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %T", token.Method)
			}
			return secret, nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "未授权"})
			return
		}

		c.Next()
	}
}

func (s *Server) verifyPassword(candidate string) bool {
	stored := s.config.AdminPassword
	if stored == "" {
		return false
	}

	if isBcryptHash(stored) {
		if err := bcrypt.CompareHashAndPassword([]byte(stored), []byte(candidate)); err != nil {
			return false
		}
		return true
	}

	if len(candidate) != len(stored) {
		return false
	}

	return subtle.ConstantTimeCompare([]byte(candidate), []byte(stored)) == 1
}

func isBcryptHash(value string) bool {
	return strings.HasPrefix(value, "$2a$") || strings.HasPrefix(value, "$2b$") || strings.HasPrefix(value, "$2y$")
}

func (s *Server) readSettings() (map[string]any, error) {
	data, err := os.ReadFile(s.configPath)
	if err != nil {
		slog.Error("读取设置失败", slog.String("error", err.Error()))
		return nil, fmt.Errorf("读取设置文件失败")
	}

	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		slog.Error("解析设置失败", slog.String("error", err.Error()))
		return nil, fmt.Errorf("解析设置文件失败")
	}

	return payload, nil
}

func (s *Server) resolveSources() []string {
	return s.dbManager.ListSources()
}

func (s *Server) handleDownload(c *gin.Context) {
	source := strings.TrimSpace(c.Query("source"))
	bookID := strings.TrimSpace(c.Query("id"))
	if source == "" || bookID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少必要参数"})
		return
	}

	datasource, ok := s.dbManager.GetDatasource(source)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "数据源不存在"})
		return
	}

	path, err := datasource.GetBookFile(bookID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.File(path)
}

func (s *Server) handleCover(c *gin.Context) {
	source := strings.TrimSpace(c.Query("source"))
	bookID := strings.TrimSpace(c.Query("id"))
	if source == "" || bookID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少必要参数"})
		return
	}

	datasource, ok := s.dbManager.GetDatasource(source)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "数据源不存在"})
		return
	}

	path, err := datasource.GetBookCover(bookID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.File(path)
}

func (s *Server) handleSearch(c *gin.Context) {
	params, err := s.buildQueryParams(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pageSize := params.PageSize

	sources := s.resolveSources()
	if len(sources) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "没有可用的数据源"})
		return
	}

	start := time.Now()

	cacheKey := ""
	if s.cache != nil {
		cacheKey = buildSearchCacheKey(params, sources)
		if books, total, ok := s.cache.Get(cacheKey); ok {
			elapsed := time.Since(start).Milliseconds()
			c.JSON(http.StatusOK, gin.H{
				"books":        books,
				"totalPages":   computeTotalPages(total, pageSize),
				"totalRecords": total,
				"searchTimeMs": elapsed,
			})
			return
		}
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	type searchResult struct {
		books []core.CanonicalBook
		total int64
		err   error
		order int
	}

	results := make(chan searchResult, len(sources))
	var wg sync.WaitGroup

	for idx, name := range sources {
		datasource, ok := s.dbManager.GetDatasource(name)
		if !ok {
			results <- searchResult{err: fmt.Errorf("数据源 %s 未初始化", name)}
			continue
		}

		wg.Add(1)
		go func(order int, dsName string, src core.Datasource) {
			defer wg.Done()
			books, total, err := src.Search(ctx, params)
			if err != nil {
				results <- searchResult{err: fmt.Errorf("数据源 %s 搜索失败: %w", dsName, err)}
				return
			}

			normalized := make([]core.CanonicalBook, len(books))
			copy(normalized, books)
			for i := range normalized {
				if normalized[i].Source == "" {
					normalized[i].Source = dsName
				}
			}

			results <- searchResult{books: normalized, total: total, order: order}
		}(idx, name, datasource)
	}

	wg.Wait()
	close(results)

	combinedBySource := make([][]core.CanonicalBook, len(sources))
	var (
		totalRecords int64
		errs         []error
	)

	for res := range results {
		if res.err != nil {
			errs = append(errs, res.err)
			continue
		}
		totalRecords += res.total
		if res.order >= 0 && res.order < len(combinedBySource) {
			combinedBySource[res.order] = res.books
		} else {
			combinedBySource = append(combinedBySource, res.books)
		}
	}

	if len(errs) > 0 {
		combinedErr := errors.Join(errs...)
		slog.Error("搜索失败", slog.String("error", combinedErr.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": combinedErr.Error()})
		return
	}

	pageItems := mergeBooksByIDDesc(combinedBySource)
	if totalRecords < int64(len(pageItems)) {
		totalRecords = int64(len(pageItems))
	}

	elapsed := time.Since(start).Milliseconds()

	c.JSON(http.StatusOK, gin.H{
		"books":        pageItems,
		"totalPages":   computeTotalPages(totalRecords, pageSize),
		"totalRecords": totalRecords,
		"searchTimeMs": elapsed,
	})

	if s.cache != nil && cacheKey != "" {
		s.cache.Set(cacheKey, pageItems, totalRecords)
	}
}
