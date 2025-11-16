// path: main.go
package main

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"

	"ebookdatabase/config"
	"ebookdatabase/internal/api"
	"ebookdatabase/internal/infra"
	"ebookdatabase/logger"
)

const (
	defaultSettingsRel = "static/settings.json"
	defaultListenAddr  = ":10223"
)

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

	mgr := infra.NewDBManager()
	if err := mgr.InitFromConfig(cfg); err != nil {
		slog.Error("初始化数据源失败", slog.String("error", err.Error()))
	}
	defer func() {
		if err := mgr.Close(); err != nil {
			slog.Error("关闭数据源失败", slog.String("error", err.Error()))
		}
	}()

	server, err := api.NewServer(cfg, mgr, defaultSettingsRel, defaultListenAddr, 5*time.Minute)
	if err != nil {
		panic(fmt.Errorf("创建 HTTP 服务失败: %w", err))
	}

	if err := server.Run(); err != nil {
		slog.Error("Gin 服务启动失败", slog.String("error", err.Error()))
	}
}
