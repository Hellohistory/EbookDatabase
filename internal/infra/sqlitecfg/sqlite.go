// path: internal/infra/sqlitecfg/sqlite.go
package sqlitecfg

import (
	"database/sql"
	"errors"
	"log/slog"
)

// TableExists 检查指定表是否存在。
func TableExists(db *sql.DB, tableName string) (bool, error) {
	if db == nil {
		return false, errors.New("nil database connection")
	}
	const query = "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
	var flag int
	err := db.QueryRow(query, tableName).Scan(&flag)
	if err == nil {
		return true, nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return false, err
}

// ConfigureSQLitePragmas 尝试按需启用 WAL 与 NORMAL 模式。
func ConfigureSQLitePragmas(db *sql.DB) {
	if db == nil {
		return
	}
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		slog.Warn("启用 WAL 模式失败", slog.String("error", err.Error()))
	}
	if _, err := db.Exec("PRAGMA synchronous=NORMAL;"); err != nil {
		slog.Warn("调整 synchronous 失败", slog.String("error", err.Error()))
	}
}
