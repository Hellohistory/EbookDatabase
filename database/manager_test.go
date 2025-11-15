// path: database/manager_test.go
package database

import (
	"os"
	"path/filepath"
	"testing"

	"ebookdatabase/config"
)

func TestInitFromConfigRegistersSources(t *testing.T) {
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, "legacy.db")
	if _, err := os.Create(legacyPath); err != nil {
		t.Fatalf("failed to create legacy db file: %v", err)
	}

	cfg := &config.Config{
		PageSize:           20,
		DefaultSearchField: "title",
		Datasources: []config.DatasourceConfig{
			{
				Name: "legacy",
				Type: "legacy_db",
				Path: legacyPath,
			},
		},
	}

	manager := NewDBManager()
	t.Cleanup(func() {
		_ = manager.Close()
	})

	if err := manager.InitFromConfig(cfg); err != nil {
		t.Fatalf("InitFromConfig returned error: %v", err)
	}

	names := manager.ListSources()
	if len(names) != 1 || names[0] != "legacy" {
		t.Fatalf("expected single source 'legacy', got %v", names)
	}

	if _, ok := manager.GetDatasource("legacy"); !ok {
		t.Fatalf("expected datasource 'legacy' to be registered")
	}
}

func TestInitFromConfigUnsupportedType(t *testing.T) {
	cfg := &config.Config{
		PageSize:           20,
		DefaultSearchField: "title",
		Datasources: []config.DatasourceConfig{
			{
				Name: "invalid",
				Type: "unknown",
				Path: "noop",
			},
		},
	}

	manager := NewDBManager()
	if err := manager.InitFromConfig(cfg); err == nil {
		t.Fatalf("expected error for unsupported datasource type")
	}
}

func TestCloseReleasesDatasources(t *testing.T) {
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, "legacy.db")
	if _, err := os.Create(legacyPath); err != nil {
		t.Fatalf("failed to create legacy db file: %v", err)
	}

	cfg := &config.Config{
		PageSize:           10,
		DefaultSearchField: "title",
		Datasources: []config.DatasourceConfig{
			{
				Name: "legacy",
				Type: "legacy_db",
				Path: legacyPath,
			},
		},
	}

	manager := NewDBManager()
	if err := manager.InitFromConfig(cfg); err != nil {
		t.Fatalf("InitFromConfig returned error: %v", err)
	}

	if err := manager.Close(); err != nil {
		t.Fatalf("Close returned error: %v", err)
	}

	if src, ok := manager.GetDatasource("legacy"); ok && src != nil {
		t.Fatalf("expected datasource map to be cleared after Close")
	}
}
