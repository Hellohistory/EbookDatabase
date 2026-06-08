// path: internal/infra/db_manager_test.go
package infra

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"

	"ebookdatabase/config"
)

func TestInitFromConfigRegistersSources(t *testing.T) {
	dir := t.TempDir()
	legacyPath := filepath.Join(dir, "legacy.db")
	createMinimalLegacyDB(t, legacyPath)

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
	createMinimalLegacyDB(t, legacyPath)

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

func createMinimalLegacyDB(t *testing.T, path string) {
	t.Helper()

	file, err := os.Create(path)
	if err != nil {
		t.Fatalf("failed to create legacy db file: %v", err)
	}
	if err := file.Close(); err != nil {
		t.Fatalf("failed to close legacy db file: %v", err)
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("failed to open legacy db file: %v", err)
	}
	defer db.Close()

	if _, err := db.Exec(`CREATE TABLE books (
id INTEGER PRIMARY KEY,
title TEXT,
author TEXT,
publisher TEXT,
publish_date TEXT,
ISBN TEXT,
SS_code TEXT,
dxid TEXT
)`); err != nil {
		t.Fatalf("failed to create legacy books table: %v", err)
	}
}
