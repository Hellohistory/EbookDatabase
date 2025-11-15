// path: database/manager.go
package database

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"

	"ebookdatabase/config"
)

// DBManager 负责管理系统中注册的数据源实例。
type DBManager struct {
	mu      sync.RWMutex
	sources map[string]Datasource
}

// NewDBManager 创建一个新的 DBManager 实例。
func NewDBManager() *DBManager {
	return &DBManager{
		sources: make(map[string]Datasource),
	}
}

// InitFromConfig 根据配置初始化所有数据源。
func (m *DBManager) InitFromConfig(cfg *config.Config) error {
	if cfg == nil {
		return fmt.Errorf("配置不能为空")
	}

	newSources := make(map[string]Datasource)
	var errs []error

	for _, item := range cfg.Datasources {
		adapter, err := m.createAdapter(item)
		if err != nil {
			errs = append(errs, err)
			continue
		}
		if err := adapter.Init(); err != nil {
			if closer, ok := adapter.(interface{ Close() error }); ok {
				_ = closer.Close()
			}
			errs = append(errs, fmt.Errorf("数据源 %s 初始化失败: %w", item.Name, err))
			continue
		}
		newSources[item.Name] = adapter
	}

	if len(errs) > 0 {
		for _, src := range newSources {
			if closer, ok := src.(interface{ Close() error }); ok {
				_ = closer.Close()
			}
		}
		return errors.Join(errs...)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	for name, src := range m.sources {
		if closer, ok := src.(interface{ Close() error }); ok {
			_ = closer.Close()
		}
		delete(m.sources, name)
	}

	m.sources = newSources
	return nil
}

func (m *DBManager) createAdapter(cfg config.DatasourceConfig) (Datasource, error) {
	switch strings.ToLower(cfg.Type) {
	case "calibre":
		return NewCalibreAdapter(cfg), nil
	case "legacy_db":
		return NewLegacyAdapter(cfg), nil
	default:
		return nil, fmt.Errorf("不支持的数据源类型: %s", cfg.Type)
	}
}

// GetDatasource 返回指定名称的数据源实例。
func (m *DBManager) GetDatasource(name string) (Datasource, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	src, ok := m.sources[name]
	return src, ok
}

// ListSources 返回当前已注册的数据源名称列表。
func (m *DBManager) ListSources() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	names := make([]string, 0, len(m.sources))
	for name := range m.sources {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// GetDBList 保留原有命名，兼容旧代码。
func (m *DBManager) GetDBList() []string {
	return m.ListSources()
}

// Close 关闭所有已注册的数据源。
func (m *DBManager) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	var errs []error
	for name, src := range m.sources {
		if closer, ok := src.(interface{ Close() error }); ok {
			if err := closer.Close(); err != nil {
				errs = append(errs, fmt.Errorf("关闭数据源 %s 失败: %w", name, err))
			}
		}
		delete(m.sources, name)
	}

	if len(errs) > 0 {
		return errors.Join(errs...)
	}
	return nil
}
