// path: database/sqlite_helpers.go
package database

import (
	"database/sql"
	"errors"
)

func tableExists(db *sql.DB, tableName string) (bool, error) {
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
