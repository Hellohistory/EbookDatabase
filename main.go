// path: main.go
package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"ebookdatabase/config"
	"ebookdatabase/database"
	"ebookdatabase/logger"
	"ebookdatabase/search"
	"ebookdatabase/utils"
	"golang.org/x/crypto/bcrypt"
)

const (
	defaultSettingsRel = "static/settings.json"
	defaultListenAddr  = ":10223"
)

type server struct {
	dbManager  *database.DBManager
	config     *config.Config
	configPath string
	jwtSecret  []byte
}

func main() {
	gin.SetMode(gin.ReleaseMode)

	cfg, err := config.LoadConfig(defaultSettingsRel)
	if err != nil {
		panic(fmt.Errorf("加载配置失败: %w", err))
	}

	logOptions := logger.DefaultOptions()
	if _, err := logger.InitLogger(logOptions); err != nil {
		panic(fmt.Errorf("初始化日志失败: %w", err))
	}

	mgr := database.NewDBManager()
	if err := mgr.InitFromConfig(cfg); err != nil {
		slog.Error("初始化数据源失败", slog.String("error", err.Error()))
	}
	defer func() {
		if err := mgr.Close(); err != nil {
			slog.Error("关闭数据源失败", slog.String("error", err.Error()))
		}
	}()

	srv := &server{
		dbManager:  mgr,
		config:     cfg,
		configPath: defaultSettingsRel,
		jwtSecret:  []byte(cfg.AdminPassword),
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	router.Static("/assets", "./frontend/dist/assets")
	router.StaticFile("/github-mark.svg", "./frontend/dist/github-mark.svg")
	router.StaticFile("/gitee-svgrepo-com.svg", "./frontend/dist/gitee-svgrepo-com.svg")
	router.StaticFile("/settings-icon.svg", "./frontend/dist/settings-icon.svg")
	router.StaticFile("/setting_logo.svg", "./frontend/dist/setting_logo.svg")
	router.GET("/", serveSPAIndex)
	router.NoRoute(serveSPAIndex)

	apiV1 := router.Group("/api/v1")
	{
		apiV1.GET("/search", srv.handleSearch)
		apiV1.GET("/available-dbs", srv.handleGetDatasources)
		apiV1.GET("/settings", srv.handleGetSettings)
		apiV1.POST("/login", srv.handleLogin)
		apiV1.GET("/qr-code-url", handleGetQRCodeURL)
		apiV1.GET("/download", srv.handleDownload)
		apiV1.GET("/cover", srv.handleCover)
	}

	adminApi := apiV1.Group("/admin")
	adminApi.Use(srv.AuthMiddleware())
	{
		adminApi.GET("/config", srv.handleGetFullConfig)
		adminApi.POST("/config", srv.handleSetFullConfig)
	}

	if err := router.Run(defaultListenAddr); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("Gin 服务启动失败", slog.String("error", err.Error()))
	}
}

func corsMiddleware() gin.HandlerFunc {
	cfg := cors.DefaultConfig()
	cfg.AllowAllOrigins = true
	cfg.AllowCredentials = true
	cfg.AddAllowMethods("PUT", "DELETE", "OPTIONS")
	cfg.AddAllowHeaders("Authorization", "Content-Type", "X-Requested-With")
	return cors.New(cfg)
}

func serveSPAIndex(c *gin.Context) {
	c.File("./frontend/dist/index.html")
}

func (s *server) handleGetDatasources(c *gin.Context) {
	names := s.dbManager.ListSources()
	c.JSON(http.StatusOK, gin.H{
		"available_dbs": names,
	})
}

func (s *server) handleGetSettings(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"pageSize":           s.config.PageSize,
		"defaultSearchField": s.config.DefaultSearchField,
	})
}

func (s *server) handleLogin(c *gin.Context) {
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

func (s *server) handleGetFullConfig(c *gin.Context) {
	payload, err := s.readSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, payload)
}

func (s *server) handleSetFullConfig(c *gin.Context) {
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

func (s *server) readSettings() (map[string]any, error) {
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

func (s *server) AuthMiddleware() gin.HandlerFunc {
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

func (s *server) verifyPassword(candidate string) bool {
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

func handleGetQRCodeURL(c *gin.Context) {
	ip, err := utils.GetLocalIP()
	if err != nil {
		slog.Error("获取本地 IP 失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "无法获取本地 IP"})
		return
	}

	url := fmt.Sprintf("http://%s%s", ip, defaultListenAddr)
	c.JSON(http.StatusOK, gin.H{"url": url})
}

func (s *server) handleSearch(c *gin.Context) {
	params, err := s.buildQueryParams(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	page := params.Page
	pageSize := params.PageSize

	searchParams := *params
	searchParams.DisablePagination = true

	sources := s.resolveSources()
	if len(sources) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "没有可用的数据源"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	start := time.Now()

	type searchResult struct {
		books []database.CanonicalBook
		total int64
		err   error
	}

	results := make(chan searchResult, len(sources))
	var wg sync.WaitGroup

	for _, name := range sources {
		datasource, ok := s.dbManager.GetDatasource(name)
		if !ok {
			results <- searchResult{err: fmt.Errorf("数据源 %s 未初始化", name)}
			continue
		}

		wg.Add(1)
		go func(dsName string, src database.Datasource) {
			defer wg.Done()
			books, total, err := src.Search(ctx, &searchParams)
			if err != nil {
				results <- searchResult{err: fmt.Errorf("数据源 %s 搜索失败: %w", dsName, err)}
				return
			}

			normalized := make([]database.CanonicalBook, len(books))
			copy(normalized, books)
			for i := range normalized {
				if normalized[i].Source == "" {
					normalized[i].Source = dsName
				}
			}

			results <- searchResult{books: normalized, total: total}
		}(name, datasource)
	}

	wg.Wait()
	close(results)

	var (
		combined     []database.CanonicalBook
		totalRecords int64
		errs         []error
	)

	for res := range results {
		if res.err != nil {
			errs = append(errs, res.err)
			continue
		}
		totalRecords += res.total
		combined = append(combined, res.books...)
	}

	if len(errs) > 0 {
		combinedErr := errors.Join(errs...)
		slog.Error("搜索失败", slog.String("error", combinedErr.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": combinedErr.Error()})
		return
	}

	sort.SliceStable(combined, func(i, j int) bool {
		left := strings.ToLower(combined[i].Title)
		right := strings.ToLower(combined[j].Title)
		if left == right {
			if combined[i].Source == combined[j].Source {
				return combined[i].ID < combined[j].ID
			}
			return combined[i].Source < combined[j].Source
		}
		return left < right
	})

	if totalRecords < int64(len(combined)) {
		totalRecords = int64(len(combined))
	}

	startIndex := (page - 1) * pageSize
	if startIndex < 0 {
		startIndex = 0
	}
	endIndex := startIndex + pageSize
	if endIndex > len(combined) {
		endIndex = len(combined)
	}

	var pageItems []database.CanonicalBook
	if startIndex >= len(combined) {
		pageItems = []database.CanonicalBook{}
	} else {
		pageItems = combined[startIndex:endIndex]
	}

	totalPages := 0
	if pageSize > 0 {
		totalPages = int(math.Ceil(float64(totalRecords) / float64(pageSize)))
	}

	elapsed := time.Since(start).Milliseconds()

	c.JSON(http.StatusOK, gin.H{
		"books":        pageItems,
		"totalPages":   totalPages,
		"totalRecords": totalRecords,
		"searchTimeMs": elapsed,
	})
}

func (s *server) handleDownload(c *gin.Context) {
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

func (s *server) handleCover(c *gin.Context) {
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

func (s *server) resolveSources() []string {
	return s.dbManager.ListSources()
}

func (s *server) buildQueryParams(c *gin.Context) (*search.QueryParams, error) {
	fields := normalizeValues(firstNonEmpty(c.QueryArray("fields[]"), c.QueryArray("fields")))
	queries := normalizeValues(firstNonEmpty(c.QueryArray("queries[]"), c.QueryArray("queries")))
	logics := normalizeValues(firstNonEmpty(c.QueryArray("logics[]"), c.QueryArray("logics")))

	if len(fields) == 0 {
		if field := c.Query("field"); field != "" {
			fields = []string{strings.TrimSpace(field)}
		}
	}

	if len(queries) == 0 {
		if query := c.Query("query"); query != "" {
			queries = []string{strings.TrimSpace(query)}
		}
	}

	if len(fields) == 0 {
		fields = []string{strings.TrimSpace(s.config.DefaultSearchField)}
	}

	if len(fields) == 0 || len(queries) == 0 {
		return nil, fmt.Errorf("缺少搜索字段或关键字")
	}

	if len(fields) != len(queries) {
		return nil, fmt.Errorf("字段与关键字数量不匹配")
	}

	if len(fields) > 1 && len(logics) != len(fields)-1 {
		return nil, fmt.Errorf("逻辑运算符数量不正确")
	}

	fuzzyRaw := normalizeValues(firstNonEmpty(c.QueryArray("fuzzies[]"), c.QueryArray("fuzzies")))
	if len(fuzzyRaw) == 0 {
		if value := c.Query("fuzzy"); value != "" {
			fuzzyRaw = []string{strings.TrimSpace(value)}
		}
	}

	fuzzies := make([]*bool, len(fields))
	for i := range fuzzies {
		if i < len(fuzzyRaw) {
			if value, err := strconv.ParseBool(fuzzyRaw[i]); err == nil {
				v := value
				fuzzies[i] = &v
			}
		}
	}

	page := parsePositiveInt(c.Query("page"), 1)
	pageSize := parsePositiveInt(firstNonBlank(c.Query("pageSize"), c.Query("page_size")), s.config.PageSize)
	if pageSize <= 0 {
		pageSize = s.config.PageSize
	}

	if page <= 0 {
		page = 1
	}

	if pageSize <= 0 {
		return nil, fmt.Errorf("无效的分页大小")
	}

	return &search.QueryParams{
		Fields:            fields,
		Queries:           queries,
		Logics:            logics,
		Fuzzies:           fuzzies,
		Page:              page,
		PageSize:          pageSize,
		DisablePagination: false,
	}, nil
}

func parsePositiveInt(value string, fallback int) int {
	if value == "" {
		return fallback
	}
	v, err := strconv.Atoi(value)
	if err != nil || v <= 0 {
		return fallback
	}
	return v
}

func firstNonEmpty(primary, secondary []string) []string {
	if len(primary) > 0 {
		return primary
	}
	return secondary
}

func firstNonBlank(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func normalizeValues(values []string) []string {
	if len(values) == 0 {
		return values
	}
	normalized := make([]string, 0, len(values))
	for _, v := range values {
		if trimmed := strings.TrimSpace(v); trimmed != "" {
			normalized = append(normalized, trimmed)
		}
	}
	return normalized
}
