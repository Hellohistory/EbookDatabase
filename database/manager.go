// Package database path: database/manager.go
package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	_ "github.com/mattn/go-sqlite3"

	"ebookdatabase/models"
)

// DBManager 管理多个 SQLite 数据库连接。
type DBManager struct {
	mu  sync.RWMutex
	dbs map[string]*sql.DB
}

// NewDBManager 创建一个新的 DBManager。
func NewDBManager() *DBManager {
	return &DBManager{dbs: make(map[string]*sql.DB)}
}

// Init 扫描 instancePath 下的 .db 文件并初始化连接池。
func (m *DBManager) Init(instancePath string) error {
	entries, err := os.ReadDir(instancePath)
	if err != nil {
		return fmt.Errorf("读取实例目录失败: %w", err)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if m.dbs == nil {
		m.dbs = make(map[string]*sql.DB)
	}

	retain := make(map[string]struct{})
	var errs []error

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if filepath.Ext(entry.Name()) != ".db" {
			continue
		}
		base := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
		retain[base] = struct{}{}

		dbPath := filepath.Join(instancePath, entry.Name())

		if existing, ok := m.dbs[base]; ok {
			if err := existing.Ping(); err == nil {
				continue
			}
			existing.Close()
			delete(m.dbs, base)
		}

		db, err := sql.Open("sqlite3", dbPath)
		if err != nil {
			errs = append(errs, fmt.Errorf("打开数据库 %s 失败: %w", entry.Name(), err))
			continue
		}

		db.SetMaxOpenConns(1)
		db.SetMaxIdleConns(1)

		if err := db.Ping(); err != nil {
			errs = append(errs, fmt.Errorf("测试连接 %s 失败: %w", entry.Name(), err))
			db.Close()
			continue
		}

		m.dbs[base] = db
	}

	for name, db := range m.dbs {
		if _, ok := retain[name]; !ok {
			db.Close()
			delete(m.dbs, name)
		}
	}

	if len(errs) > 0 {
		return errors.Join(errs...)
	}

	return nil
}

// QueryConcurrent 在多个数据库上并发执行同一查询。
func (m *DBManager) QueryConcurrent(ctx context.Context, dbNames []string, query string, args []any) ([]models.Book, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	type queryResult struct {
		books []models.Book
		err   error
	}

	results := make(chan queryResult, len(dbNames))
	var wg sync.WaitGroup

	for _, name := range dbNames {
		db := m.getDB(name)
		if db == nil {
			results <- queryResult{err: fmt.Errorf("数据库 %s 未初始化", name)}
			continue
		}

		wg.Add(1)
		go func(dbName string, conn *sql.DB) {
			defer wg.Done()

			rows, err := conn.QueryContext(ctx, query, args...)
			if err != nil {
				results <- queryResult{err: fmt.Errorf("数据库 %s 查询失败: %w", dbName, err)}
				return
			}

			books, err := scanBooks(rows)
			if err != nil {
				results <- queryResult{err: fmt.Errorf("数据库 %s 结果解析失败: %w", dbName, err)}
				return
			}

			results <- queryResult{books: books}
		}(name, db)
	}

	wg.Wait()
	close(results)

	var (
		allBooks []models.Book
		errs     []error
	)

	for res := range results {
		if res.err != nil {
			errs = append(errs, res.err)
			continue
		}
		allBooks = append(allBooks, res.books...)
	}

	return allBooks, errors.Join(errs...)
}

// QueryConcurrentCount 在多个数据库上并发执行计数查询并返回累积总数。
func (m *DBManager) QueryConcurrentCount(ctx context.Context, dbNames []string, query string, args []any) (int64, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	type countResult struct {
		count int64
		err   error
	}

	results := make(chan countResult, len(dbNames))
	var wg sync.WaitGroup

	for _, name := range dbNames {
		db := m.getDB(name)
		if db == nil {
			results <- countResult{err: fmt.Errorf("数据库 %s 未初始化", name)}
			continue
		}

		wg.Add(1)
		go func(dbName string, conn *sql.DB) {
			defer wg.Done()

			row := conn.QueryRowContext(ctx, query, args...)
			var count int64
			if err := row.Scan(&count); err != nil {
				results <- countResult{err: fmt.Errorf("数据库 %s 计数查询失败: %w", dbName, err)}
				return
			}
			results <- countResult{count: count}
		}(name, db)
	}

	wg.Wait()
	close(results)

	var (
		total int64
		errs  []error
	)

	for res := range results {
		if res.err != nil {
			errs = append(errs, res.err)
			continue
		}
		total += res.count
	}

	return total, errors.Join(errs...)
}

// Close 关闭所有数据库连接。
func (m *DBManager) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	var errs []error
	for name, db := range m.dbs {
		if err := db.Close(); err != nil {
			errs = append(errs, fmt.Errorf("关闭数据库 %s 失败: %w", name, err))
		}
		delete(m.dbs, name)
	}
	if len(errs) > 0 {
		return errors.Join(errs...)
	}
	return nil
}

func (m *DBManager) getDB(name string) *sql.DB {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.dbs == nil {
		return nil
	}
	if db, ok := m.dbs[name]; ok {
		return db
	}
	return nil
}

// GetDBList 返回当前已初始化的数据库名称列表。
func (m *DBManager) GetDBList() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if len(m.dbs) == 0 {
		return nil
	}

	names := make([]string, 0, len(m.dbs))
	for name := range m.dbs {
		names = append(names, name)
	}

	sort.Strings(names)
	return names
}

func scanBooks(rows *sql.Rows) ([]models.Book, error) {
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	books := make([]models.Book, 0)

	for rows.Next() {
		values := make([]any, len(columns))
		valuePtrs := make([]any, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, err
		}

		var book models.Book
		for i, column := range columns {
			normalized := strings.ToLower(column)
			if err := book.SetField(normalized, values[i]); err != nil {
				if errors.Is(err, models.ErrUnknownColumn) {
					if err := book.SetField(column, values[i]); err != nil && !errors.Is(err, models.ErrUnknownColumn) {
						return nil, err
					}
					continue
				}
				return nil, err
			}
		}

		books = append(books, book)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return books, nil
}
