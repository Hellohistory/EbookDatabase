// path: main.go
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"ebookdatabase/config"
	"ebookdatabase/database"
	"ebookdatabase/logger"
	"ebookdatabase/models"
	"ebookdatabase/search"
	"ebookdatabase/utils"
)

const (
	defaultInstanceDir = "instance"
	defaultSettingsRel = "static/settings.json"
	defaultListenAddr  = ":10223"
)

type server struct {
	dbManager  *database.DBManager
	config     *config.Config
	configPath string
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
	if err := mgr.Init(defaultInstanceDir); err != nil {
		slog.Error("初始化数据库连接池失败", slog.String("error", err.Error()))
	}
	defer func() {
		if err := mgr.Close(); err != nil {
			slog.Error("关闭数据库连接失败", slog.String("error", err.Error()))
		}
	}()

	srv := &server{
		dbManager:  mgr,
		config:     cfg,
		configPath: defaultSettingsRel,
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	router.Static("/static", "./static/static")
	router.GET("/", serveSPAIndex)
	router.NoRoute(serveSPAIndex)

	apiV1 := router.Group("/api/v1")
	{
		apiV1.GET("/search", srv.handleSearch)
		apiV1.GET("/available-dbs", srv.handleGetDBs)
		apiV1.GET("/settings", srv.handleGetSettings)
		apiV1.POST("/settings", srv.handleSetSettings)
		apiV1.GET("/about-content", srv.handleGetAboutContent)
		apiV1.GET("/qr-code-url", handleGetQRCodeURL)
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
	c.File("./static/index.html")
}

func (s *server) handleGetDBs(c *gin.Context) {
	names := s.dbManager.GetDBList()
	c.JSON(http.StatusOK, gin.H{"databases": names})
}

func (s *server) handleGetSettings(c *gin.Context) {
	data, err := os.ReadFile(s.configPath)
	if err != nil {
		slog.Error("读取设置失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取设置文件失败"})
		return
	}

	var payload any
	if err := json.Unmarshal(data, &payload); err != nil {
		slog.Error("解析设置失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "解析设置文件失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": payload})
}

func (s *server) handleSetSettings(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求体格式错误"})
		return
	}

	bytes, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		slog.Error("序列化设置失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存设置失败"})
		return
	}

	if err := os.WriteFile(s.configPath, bytes, 0o644); err != nil {
		slog.Error("写入设置失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "写入设置文件失败"})
		return
	}

	cfg, err := config.LoadConfig(s.configPath)
	if err != nil {
		slog.Error("重新加载设置失败", slog.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "配置刷新失败"})
		return
	}
	s.config = cfg

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func (s *server) handleGetAboutContent(c *gin.Context) {
	id := c.Query("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 id 参数"})
		return
	}

	filename := map[string]string{
		"content1": "Pillory.md",
		"content2": "EbookDataTools.md",
		"content3": "UpdateLog.md",
		"content4": "DatabaseDownload.md",
		"content5": "LICENSE.txt",
	}[id]

	if filename == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到对应的内容"})
		return
	}

	path := filepath.Join("Markdown", filename)
	data, err := os.ReadFile(path)
	if err != nil {
		slog.Error("读取 About 内容失败", slog.String("error", err.Error()), slog.String("path", path))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "读取内容失败"})
		return
	}

	c.Data(http.StatusOK, "text/plain; charset=utf-8", data)
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

	querySQL, countSQL, args, err := buildSQLSafe(params)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(args) < 2 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "构建查询参数失败"})
		return
	}

	queryArgs := append([]any(nil), args...)
	countArgs := append([]any(nil), args[:len(args)-2]...)

	dbNames := s.resolveDBNames(c)
	if len(dbNames) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "没有可用的数据库"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	start := time.Now()

	var (
		books        []models.Book
		totalRecords int64
		queryErr     error
		countErr     error
	)

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		books, queryErr = s.dbManager.QueryConcurrent(ctx, dbNames, querySQL, queryArgs)
	}()

	go func() {
		defer wg.Done()
		totalRecords, countErr = s.dbManager.QueryConcurrentCount(ctx, dbNames, countSQL, countArgs)
	}()

	wg.Wait()

	if queryErr != nil || countErr != nil {
		combined := errors.Join(queryErr, countErr)
		slog.Error("搜索失败", slog.String("error", combined.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": combined.Error()})
		return
	}

	elapsed := time.Since(start).Milliseconds()
	totalPages := 0
	if params.PageSize > 0 {
		totalPages = int(math.Ceil(float64(totalRecords) / float64(params.PageSize)))
	}

	c.JSON(http.StatusOK, gin.H{
		"books":        books,
		"totalPages":   totalPages,
		"totalRecords": totalRecords,
		"searchTimeMs": elapsed,
	})
}

func (s *server) resolveDBNames(c *gin.Context) []string {
	candidates := [][]string{
		c.QueryArray("dbs[]"),
		c.QueryArray("dbs"),
		c.QueryArray("dbNames[]"),
		c.QueryArray("dbNames"),
		c.QueryArray("db_names[]"),
		c.QueryArray("db_names"),
	}
	for _, list := range candidates {
		if len(list) > 0 {
			cleaned := make([]string, 0, len(list))
			for _, name := range list {
				if trimmed := strings.TrimSpace(name); trimmed != "" {
					cleaned = append(cleaned, trimmed)
				}
			}
			if len(cleaned) > 0 {
				return cleaned
			}
		}
	}
	return s.dbManager.GetDBList()
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
		Fields:   fields,
		Queries:  queries,
		Logics:   logics,
		Fuzzies:  fuzzies,
		Page:     page,
		PageSize: pageSize,
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

func buildSQLSafe(params *search.QueryParams) (query string, count string, args []any, err error) {
	if params == nil {
		return "", "", nil, fmt.Errorf("查询参数不能为空")
	}

	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("构建查询失败: %v", r)
		}
	}()

	query, count, args = search.BuildSQLQuery(*params)
	return
}
