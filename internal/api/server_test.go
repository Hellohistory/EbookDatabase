package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	_ "modernc.org/sqlite"

	"ebookdatabase/config"
	"ebookdatabase/internal/infra"
)

func TestPublicAPIAndAdminAuth(t *testing.T) {
	server, cleanup := newTestServer(t)
	defer cleanup()

	settings := performRequest(server, http.MethodGet, "/api/v1/settings", "", nil)
	if settings.Code != http.StatusOK {
		t.Fatalf("GET settings status = %d, body = %s", settings.Code, settings.Body.String())
	}
	var settingsPayload struct {
		PageSize          int    `json:"pageSize"`
		ResultDisplayMode string `json:"resultDisplayMode"`
		ResultDensity     string `json:"resultDensity"`
		ShowCovers        bool   `json:"showCovers"`
		ShowIdentifiers   bool   `json:"showIdentifiers"`
	}
	if err := json.Unmarshal(settings.Body.Bytes(), &settingsPayload); err != nil {
		t.Fatalf("failed to decode settings response: %v", err)
	}
	if settingsPayload.PageSize != 5 ||
		settingsPayload.ResultDisplayMode != "compact" ||
		settingsPayload.ResultDensity != "compact" ||
		settingsPayload.ShowCovers ||
		!settingsPayload.ShowIdentifiers {
		t.Fatalf("unexpected settings response: %+v", settingsPayload)
	}

	health := performRequest(server, http.MethodGet, "/api/v1/health", "", nil)
	if health.Code != http.StatusOK {
		t.Fatalf("GET health status = %d, body = %s", health.Code, health.Body.String())
	}

	var healthPayload struct {
		Status      string `json:"status"`
		Datasources int    `json:"datasources"`
	}
	if err := json.Unmarshal(health.Body.Bytes(), &healthPayload); err != nil {
		t.Fatalf("failed to decode health response: %v", err)
	}
	if healthPayload.Status != "ok" || healthPayload.Datasources != 1 {
		t.Fatalf("unexpected health response: %+v", healthPayload)
	}

	datasources := performRequest(server, http.MethodGet, "/api/v1/available-dbs", "", nil)
	if datasources.Code != http.StatusOK {
		t.Fatalf("GET available dbs status = %d, body = %s", datasources.Code, datasources.Body.String())
	}

	var datasourcesPayload struct {
		AvailableDBs []string `json:"available_dbs"`
	}
	if err := json.Unmarshal(datasources.Body.Bytes(), &datasourcesPayload); err != nil {
		t.Fatalf("failed to decode datasources response: %v", err)
	}
	if len(datasourcesPayload.AvailableDBs) != 1 || datasourcesPayload.AvailableDBs[0] != "legacy" {
		t.Fatalf("unexpected datasources response: %+v", datasourcesPayload)
	}

	qrCodeURL := performRequest(server, http.MethodGet, "/api/v1/qr-code-url", "", nil)
	if qrCodeURL.Code != http.StatusOK {
		t.Fatalf("GET qr-code-url status = %d, body = %s", qrCodeURL.Code, qrCodeURL.Body.String())
	}
	var qrPayload struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(qrCodeURL.Body.Bytes(), &qrPayload); err != nil {
		t.Fatalf("failed to decode qr-code-url response: %v", err)
	}
	if !strings.HasPrefix(qrPayload.URL, "http://") || !strings.HasSuffix(qrPayload.URL, ":10223") {
		t.Fatalf("unexpected qr-code-url response: %+v", qrPayload)
	}

	search := performRequest(server, http.MethodGet, "/api/v1/search?field=title&query=Go%20Systems&page=1&pageSize=5", "", nil)
	if search.Code != http.StatusOK {
		t.Fatalf("GET search status = %d, body = %s", search.Code, search.Body.String())
	}

	var searchPayload struct {
		Books        []map[string]any `json:"books"`
		TotalPages   int              `json:"totalPages"`
		TotalRecords int              `json:"totalRecords"`
	}
	if err := json.Unmarshal(search.Body.Bytes(), &searchPayload); err != nil {
		t.Fatalf("failed to decode search response: %v", err)
	}
	if searchPayload.TotalRecords != 1 || searchPayload.TotalPages != 1 || len(searchPayload.Books) != 1 {
		t.Fatalf("unexpected search response: %+v", searchPayload)
	}
	if searchPayload.Books[0]["title"] != "Go Systems" {
		t.Fatalf("unexpected book title: %#v", searchPayload.Books[0]["title"])
	}

	badSearch := performRequest(server, http.MethodGet, "/api/v1/search?fields[]=title&fields[]=author&queries[]=Go", "", nil)
	if badSearch.Code != http.StatusBadRequest {
		t.Fatalf("bad search status = %d, body = %s", badSearch.Code, badSearch.Body.String())
	}

	unknownField := performRequest(server, http.MethodGet, "/api/v1/search?field=unknown&query=Go", "", nil)
	if unknownField.Code != http.StatusBadRequest {
		t.Fatalf("unknown field search status = %d, body = %s", unknownField.Code, unknownField.Body.String())
	}

	badLogic := performRequest(server, http.MethodGet, "/api/v1/search?fields[]=title&fields[]=author&queries[]=Go&queries[]=Alice&logics[]=XOR", "", nil)
	if badLogic.Code != http.StatusBadRequest {
		t.Fatalf("bad logic search status = %d, body = %s", badLogic.Code, badLogic.Body.String())
	}

	missingDownloadParams := performRequest(server, http.MethodGet, "/api/v1/download?source=legacy", "", nil)
	if missingDownloadParams.Code != http.StatusBadRequest {
		t.Fatalf("missing download params status = %d, body = %s", missingDownloadParams.Code, missingDownloadParams.Body.String())
	}

	unsupportedDownload := performRequest(server, http.MethodGet, "/api/v1/download?source=legacy&id=1", "", nil)
	if unsupportedDownload.Code != http.StatusNotFound {
		t.Fatalf("unsupported download status = %d, body = %s", unsupportedDownload.Code, unsupportedDownload.Body.String())
	}

	unsupportedCover := performRequest(server, http.MethodGet, "/api/v1/cover?source=legacy&id=1", "", nil)
	if unsupportedCover.Code != http.StatusNotFound {
		t.Fatalf("unsupported cover status = %d, body = %s", unsupportedCover.Code, unsupportedCover.Body.String())
	}

	unauthorized := performRequest(server, http.MethodGet, "/api/v1/admin/config", "", nil)
	if unauthorized.Code != http.StatusUnauthorized {
		t.Fatalf("unauthorized admin status = %d, body = %s", unauthorized.Code, unauthorized.Body.String())
	}

	badLogin := performRequest(server, http.MethodPost, "/api/v1/login", `{"password":"wrong"}`, nil)
	if badLogin.Code != http.StatusUnauthorized {
		t.Fatalf("bad login status = %d, body = %s", badLogin.Code, badLogin.Body.String())
	}

	login := performRequest(server, http.MethodPost, "/api/v1/login", `{"password":"secret"}`, nil)
	if login.Code != http.StatusOK {
		t.Fatalf("login status = %d, body = %s", login.Code, login.Body.String())
	}

	var loginPayload struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(login.Body.Bytes(), &loginPayload); err != nil {
		t.Fatalf("failed to decode login response: %v", err)
	}
	if loginPayload.Token == "" {
		t.Fatal("expected login token")
	}

	admin := performRequest(server, http.MethodGet, "/api/v1/admin/config", "", map[string]string{
		"Authorization": "Bearer " + loginPayload.Token,
	})
	if admin.Code != http.StatusOK {
		t.Fatalf("authorized admin status = %d, body = %s", admin.Code, admin.Body.String())
	}

	updatedConfig := `{
  "pageSize": 7,
  "defaultSearchField": "title",
  "resultDisplayMode": "detail",
  "resultDensity": "comfortable",
  "showCovers": true,
  "showIdentifiers": false,
  "adminPassword": "secret",
  "corsAllowedOrigins": ["http://localhost:5173"],
  "datasources": [
    {"name": "legacy", "type": "legacy_db", "path": "` + filepath.ToSlash(server.config.Datasources[0].Path) + `"}
  ]
}`
	saveConfig := performRequest(server, http.MethodPost, "/api/v1/admin/config", updatedConfig, map[string]string{
		"Authorization": "Bearer " + loginPayload.Token,
	})
	if saveConfig.Code != http.StatusOK {
		t.Fatalf("save admin config status = %d, body = %s", saveConfig.Code, saveConfig.Body.String())
	}

	settingsAfterSave := performRequest(server, http.MethodGet, "/api/v1/settings", "", nil)
	if settingsAfterSave.Code != http.StatusOK {
		t.Fatalf("settings after save status = %d, body = %s", settingsAfterSave.Code, settingsAfterSave.Body.String())
	}

	var savedSettings struct {
		PageSize          int    `json:"pageSize"`
		ResultDisplayMode string `json:"resultDisplayMode"`
		ResultDensity     string `json:"resultDensity"`
		ShowCovers        bool   `json:"showCovers"`
		ShowIdentifiers   bool   `json:"showIdentifiers"`
	}
	if err := json.Unmarshal(settingsAfterSave.Body.Bytes(), &savedSettings); err != nil {
		t.Fatalf("failed to decode settings after save: %v", err)
	}
	if savedSettings.PageSize != 7 ||
		savedSettings.ResultDisplayMode != "detail" ||
		savedSettings.ResultDensity != "comfortable" ||
		!savedSettings.ShowCovers ||
		savedSettings.ShowIdentifiers {
		t.Fatalf("unexpected saved settings: %+v", savedSettings)
	}

	adminAfterSave := performRequest(server, http.MethodGet, "/api/v1/admin/config", "", map[string]string{
		"Authorization": "Bearer " + loginPayload.Token,
	})
	if adminAfterSave.Code != http.StatusOK {
		t.Fatalf("admin config after save status = %d, body = %s", adminAfterSave.Code, adminAfterSave.Body.String())
	}

	var savedConfig struct {
		ResultDisplayMode  string   `json:"resultDisplayMode"`
		ResultDensity      string   `json:"resultDensity"`
		ShowCovers         bool     `json:"showCovers"`
		ShowIdentifiers    bool     `json:"showIdentifiers"`
		CORSAllowedOrigins []string `json:"corsAllowedOrigins"`
	}
	if err := json.Unmarshal(adminAfterSave.Body.Bytes(), &savedConfig); err != nil {
		t.Fatalf("failed to decode admin config after save: %v", err)
	}
	if savedConfig.ResultDisplayMode != "detail" ||
		savedConfig.ResultDensity != "comfortable" ||
		!savedConfig.ShowCovers ||
		savedConfig.ShowIdentifiers {
		t.Fatalf("expected saved display settings, got %+v", savedConfig)
	}
	if len(savedConfig.CORSAllowedOrigins) != 1 || savedConfig.CORSAllowedOrigins[0] != "http://localhost:5173" {
		t.Fatalf("expected saved CORS origins, got %+v", savedConfig.CORSAllowedOrigins)
	}
}

func TestCORSAllowsConfiguredOriginsOnly(t *testing.T) {
	server, cleanup := newTestServer(t)
	defer cleanup()

	allowed := performRequest(server, http.MethodOptions, "/api/v1/settings", "", map[string]string{
		"Origin":                         "http://localhost:5173",
		"Access-Control-Request-Method":  http.MethodGet,
		"Access-Control-Request-Headers": "Authorization",
	})
	if allowed.Code != http.StatusNoContent {
		t.Fatalf("allowed preflight status = %d", allowed.Code)
	}
	if got := allowed.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Fatalf("allowed origin header = %q", got)
	}

	blocked := performRequest(server, http.MethodOptions, "/api/v1/settings", "", map[string]string{
		"Origin":                        "https://evil.example",
		"Access-Control-Request-Method": http.MethodGet,
	})
	if blocked.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("unexpected allow-origin for blocked request: %q", blocked.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestSearchSupportsMergedLegacySchema(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "merged.db")
	createMergedLegacyDB(t, dbPath)

	configPath := filepath.Join(dir, "settings.json")
	settings := `{
  "pageSize": 5,
  "defaultSearchField": "title",
  "adminPassword": "secret",
  "datasources": [
    {"name": "merged", "type": "legacy_db", "path": "` + filepath.ToSlash(dbPath) + `"}
  ]
}`
	if err := os.WriteFile(configPath, []byte(settings), 0o644); err != nil {
		t.Fatalf("failed to write config: %v", err)
	}

	cfg, err := config.LoadConfig(configPath)
	if err != nil {
		t.Fatalf("LoadConfig returned error: %v", err)
	}

	manager := infra.NewDBManager()
	if err := manager.InitFromConfig(cfg); err != nil {
		t.Fatalf("InitFromConfig returned error: %v", err)
	}
	defer manager.Close()

	server, err := NewServer(cfg, manager, configPath, ":10223", time.Minute)
	if err != nil {
		t.Fatalf("NewServer returned error: %v", err)
	}

	search := performRequest(server, http.MethodGet, "/api/v1/search?field=title&query=%E5%8E%86%E5%8F%B2&fuzzy=true&page=1&pageSize=5", "", nil)
	if search.Code != http.StatusOK {
		t.Fatalf("GET merged search status = %d, body = %s", search.Code, search.Body.String())
	}

	var payload struct {
		Books        []map[string]any `json:"books"`
		TotalRecords int              `json:"totalRecords"`
	}
	if err := json.Unmarshal(search.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode search response: %v", err)
	}
	if payload.TotalRecords != 1 || len(payload.Books) != 1 {
		t.Fatalf("unexpected merged search response: %+v", payload)
	}
	if payload.Books[0]["id"] != "10" || payload.Books[0]["title"] != "历史入门" {
		t.Fatalf("unexpected merged book: %+v", payload.Books[0])
	}
}

func newTestServer(t *testing.T) (*Server, func()) {
	t.Helper()

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "legacy.db")
	createLegacyDB(t, dbPath)

	configPath := filepath.Join(dir, "settings.json")
	settings := `{
  "pageSize": 5,
  "defaultSearchField": "title",
  "adminPassword": "secret",
  "corsAllowedOrigins": ["http://localhost:5173", "http://127.0.0.1:5173", "*"],
  "datasources": [
    {"name": "legacy", "type": "legacy_db", "path": "` + filepath.ToSlash(dbPath) + `"}
  ]
}`
	if err := os.WriteFile(configPath, []byte(settings), 0o644); err != nil {
		t.Fatalf("failed to write config: %v", err)
	}

	cfg, err := config.LoadConfig(configPath)
	if err != nil {
		t.Fatalf("LoadConfig returned error: %v", err)
	}

	manager := infra.NewDBManager()
	if err := manager.InitFromConfig(cfg); err != nil {
		t.Fatalf("InitFromConfig returned error: %v", err)
	}

	server, err := NewServer(cfg, manager, configPath, ":10223", time.Minute)
	if err != nil {
		_ = manager.Close()
		t.Fatalf("NewServer returned error: %v", err)
	}

	return server, func() {
		_ = manager.Close()
	}
}

func createLegacyDB(t *testing.T, path string) {
	t.Helper()

	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("failed to open sqlite database: %v", err)
	}
	defer db.Close()

	_, err = db.Exec(`CREATE TABLE books (
id INTEGER PRIMARY KEY,
title TEXT,
author TEXT,
publisher TEXT,
publish_date TEXT,
ISBN TEXT,
SS_code TEXT,
dxid TEXT
)`)
	if err != nil {
		t.Fatalf("failed to create books table: %v", err)
	}

	_, err = db.Exec(`INSERT INTO books (id, title, author, publisher, publish_date, ISBN, SS_code, dxid)
VALUES (1, 'Go Systems', 'Alice', 'Tech Press', '2026', '9780000000001', 'SS1', 'DX1')`)
	if err != nil {
		t.Fatalf("failed to seed books table: %v", err)
	}
}

func createMergedLegacyDB(t *testing.T, path string) {
	t.Helper()

	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("failed to open sqlite database: %v", err)
	}
	defer db.Close()

	_, err = db.Exec(`CREATE TABLE books (
book_id INTEGER PRIMARY KEY,
primary_key TEXT NOT NULL UNIQUE,
ss_code TEXT,
dxid TEXT,
title TEXT,
title_norm TEXT,
author TEXT,
publisher TEXT,
publish_date TEXT,
publish_year INTEGER,
page_count INTEGER,
isbn TEXT,
description TEXT,
removed_flag INTEGER NOT NULL DEFAULT 0
)`)
	if err != nil {
		t.Fatalf("failed to create merged books table: %v", err)
	}

	_, err = db.Exec(`CREATE VIRTUAL TABLE book_search_fts USING fts5(
title,
author,
publisher,
content='books',
content_rowid='book_id',
tokenize='unicode61 remove_diacritics 2'
)`)
	if err != nil {
		t.Fatalf("failed to create merged fts table: %v", err)
	}

	_, err = db.Exec(`INSERT INTO books (book_id, primary_key, ss_code, dxid, title, title_norm, author, publisher, publish_date, publish_year, page_count, isbn)
VALUES
(10, 'SS:10', 'SS10', 'DX10', '历史入门', '历史入门', 'Alice', 'History Press', '2026', 2026, 120, '9780000000010'),
(11, 'SS:11', 'SS11', 'DX11', 'Go Systems', 'Go Systems', 'Bob', 'Tech Press', '2025', 2025, 220, '9780000000011')`)
	if err != nil {
		t.Fatalf("failed to seed merged books table: %v", err)
	}

	_, err = db.Exec(`INSERT INTO book_search_fts(rowid, title, author, publisher)
SELECT book_id, title, author, publisher FROM books`)
	if err != nil {
		t.Fatalf("failed to seed merged fts table: %v", err)
	}
}

func performRequest(server *Server, method, path, body string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	rec := httptest.NewRecorder()
	server.Engine().ServeHTTP(rec, req)
	return rec
}
