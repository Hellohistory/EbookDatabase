// Path: logger/logger.go
package logger

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/lumberjack/lumberjack"
)

// Options 定义 InitLogger 的自定义配置。
type Options struct {
	Filename   string
	MaxSizeMB  int
	MaxBackups int
	MaxAgeDays int
	Compress   bool
	Level      slog.Level
	AddSource  bool
	Writers    []io.Writer
}

// DefaultOptions 返回一份可安全修改的默认日志配置。
func DefaultOptions() *Options {
	return &Options{
		Filename:   filepath.Join("log", "app.log"),
		MaxSizeMB:  100,
		MaxBackups: 7,
		MaxAgeDays: 30,
		Compress:   true,
		Level:      slog.LevelInfo,
		AddSource:  true,
	}
}

// InitLogger 使用 lumberjack 和 slog 初始化结构化日志记录。返回创建的 slog.Logger，并将其设置为全局默认 logger。
func InitLogger(opts *Options) (*slog.Logger, error) {
	if opts == nil {
		opts = DefaultOptions()
	}

	if opts.Filename == "" {
		return nil, fmt.Errorf("日志文件路径不能为空")
	}

	if err := os.MkdirAll(filepath.Dir(opts.Filename), 0o755); err != nil {
		return nil, fmt.Errorf("创建日志目录失败: %w", err)
	}

	writer := &lumberjack.Logger{
		Filename:   opts.Filename,
		MaxSize:    opts.MaxSizeMB,
		MaxBackups: opts.MaxBackups,
		MaxAge:     opts.MaxAgeDays,
		Compress:   opts.Compress,
	}

	var outputs []io.Writer
	outputs = append(outputs, writer)
	if len(opts.Writers) > 0 {
		outputs = append(outputs, opts.Writers...)
	} else {
		outputs = append(outputs, os.Stdout)
	}

	handler := slog.NewJSONHandler(io.MultiWriter(outputs...), &slog.HandlerOptions{
		Level:     opts.Level,
		AddSource: opts.AddSource,
	})

	logger := slog.New(handler)
	slog.SetDefault(logger)

	return logger, nil
}
