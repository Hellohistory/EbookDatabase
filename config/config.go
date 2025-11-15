// Path: config/config.go
package config

import (
	"fmt"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/spf13/viper"
)

const (
	defaultConfigDirectory = "static"
	defaultConfigName      = "settings"
	defaultConfigType      = "json"
	defaultPageSize        = 20
)

// DatasourceConfig 描述单个数据源的必要信息。
type DatasourceConfig struct {
	Name string `mapstructure:"name"`
	Type string `mapstructure:"type"`
	Path string `mapstructure:"path"`
}

// Config 描述 static/settings.json 中的关键配置项。
type Config struct {
	PageSize           int                `mapstructure:"pageSize"`
	DefaultSearchField string             `mapstructure:"defaultSearchField"`
	AdminPassword      string             `mapstructure:"adminPassword"`
	Datasources        []DatasourceConfig `mapstructure:"datasources"`
}

// LoadConfig 读取配置文件并解析为 Config 结构体。configPath 参数允许调用方指定自定义配置路径。
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

	if cfg.PageSize <= 0 {
		raw := v.Get("pageSize")
		parsed, err := parsePageSize(raw)
		if err != nil {
			return nil, err
		}
		cfg.PageSize = parsed
	}
	if cfg.PageSize <= 0 {
		cfg.PageSize = defaultPageSize
	}

	if cfg.PageSize <= 0 {
		return nil, fmt.Errorf("配置项 pageSize 必须为大于 0 的整数")
	}

	if cfg.DefaultSearchField == "" {
		cfg.DefaultSearchField = strings.TrimSpace(v.GetString("defaultSearchField"))
	}
	if cfg.DefaultSearchField == "" {
		cfg.DefaultSearchField = "title"
	}

	cfg.AdminPassword = strings.TrimSpace(cfg.AdminPassword)

	normalized, err := normalizeDatasources(cfg.Datasources)
	if err != nil {
		return nil, err
	}
	cfg.Datasources = normalized

	if path := v.ConfigFileUsed(); path != "" {
		if absPath, err := filepath.Abs(path); err == nil {
			_ = absPath // 预留位置以便未来记录日志
		}
	}

	return &cfg, nil
}

func parsePageSize(value any) (int, error) {
	switch v := value.(type) {
	case nil:
		return defaultPageSize, nil
	case int:
		return v, nil
	case int64:
		return int(v), nil
	case float64:
		return int(v), nil
	case string:
		trimmed := strings.TrimSpace(v)
		if trimmed == "" {
			return defaultPageSize, nil
		}
		parsed, err := strconv.Atoi(trimmed)
		if err != nil {
			return 0, fmt.Errorf("配置项 pageSize 无法解析为整数: %w", err)
		}
		return parsed, nil
	default:
		return 0, fmt.Errorf("配置项 pageSize 类型不受支持: %T", value)
	}
}

func normalizeDatasources(items []DatasourceConfig) ([]DatasourceConfig, error) {
	if len(items) == 0 {
		return nil, nil
	}

	normalized := make([]DatasourceConfig, 0, len(items))
	seen := make(map[string]struct{})

	for _, item := range items {
		name := strings.TrimSpace(item.Name)
		if name == "" {
			return nil, fmt.Errorf("数据源名称不能为空")
		}
		if _, ok := seen[name]; ok {
			return nil, fmt.Errorf("数据源名称重复: %s", name)
		}
		seen[name] = struct{}{}

		dsType := strings.TrimSpace(item.Type)
		if dsType == "" {
			return nil, fmt.Errorf("数据源 %s 的类型不能为空", name)
		}

		path := strings.TrimSpace(item.Path)
		if path == "" {
			return nil, fmt.Errorf("数据源 %s 的路径不能为空", name)
		}

		normalized = append(normalized, DatasourceConfig{
			Name: name,
			Type: dsType,
			Path: path,
		})
	}

	return normalized, nil
}
