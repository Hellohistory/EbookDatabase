// Path: config/config.go
package config

import (
	"fmt"
	"path/filepath"

	"github.com/spf13/viper"
)

const (
	defaultConfigDirectory = "static"
	defaultConfigName      = "settings"
	defaultConfigType      = "json"
)

// Config 描述 static/settings.json 中的关键配置项。
type Config struct {
	PageSize           int    `mapstructure:"pageSize"`
	DefaultSearchField string `mapstructure:"defaultSearchField"`
}

// LoadConfig 读取配置文件并解析为 Config 结构体。configPath 参数允许调用方指定自定义配置路径。若为空，函数会在默认目录中查找 settings.json。
func LoadConfig(configPath string) (*Config, error) {
	v := viper.New()

	if configPath != "" {
		v.SetConfigFile(configPath)
	} else {
		v.AddConfigPath(".")
		v.AddConfigPath(defaultConfigDirectory)
		v.SetConfigName(defaultConfigName)
		v.SetConfigType(defaultConfigType)
	}

	v.SetEnvPrefix("ebookdatabase")
	v.AutomaticEnv()

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("读取配置文件失败: %w", err)
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("解析配置失败: %w", err)
	}

	// 强制转换数值字段，兼容字符串形式的配置。
	if cfg.PageSize <= 0 {
		cfg.PageSize = v.GetInt("pageSize")
	}

	if cfg.PageSize <= 0 {
		return nil, fmt.Errorf("配置项 pageSize 必须为大于 0 的整数")
	}

	if cfg.DefaultSearchField == "" {
		cfg.DefaultSearchField = v.GetString("defaultSearchField")
	}

	if cfg.DefaultSearchField == "" {
		return nil, fmt.Errorf("配置项 defaultSearchField 不能为空")
	}

	// 将最终生效的配置文件路径写入绝对路径，便于日志与错误定位。
	if path := v.ConfigFileUsed(); path != "" {
		if absPath, err := filepath.Abs(path); err == nil {
			_ = absPath // 保留在此便于未来扩展，例如记录日志
		}
	}

	return &cfg, nil
}
