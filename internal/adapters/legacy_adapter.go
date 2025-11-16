// path: internal/adapters/legacy_adapter.go
package adapters

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"

	"ebookdatabase/config"
	"ebookdatabase/internal/core"
	"ebookdatabase/internal/infra/sqlitecfg"
	"ebookdatabase/models"
	"ebookdatabase/search"
)

type legacyAdapter struct {
	name string
	path string
	db   *sql.DB
}

// NewLegacyAdapter 根据配置创建旧版数据库适配器。
func NewLegacyAdapter(cfg config.DatasourceConfig) core.Datasource {
	return &legacyAdapter{
		name: cfg.Name,
		path: strings.TrimSpace(cfg.Path),
	}
}

func (a *legacyAdapter) Init() error {
	if a.db != nil {
		_ = a.db.Close()
	}
	if a.path == "" {
		return fmt.Errorf("Legacy 数据源 %s 未指定数据库路径", a.name)
	}

	dsn := fmt.Sprintf("file:%s?_busy_timeout=5000", a.path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return fmt.Errorf("打开 Legacy 数据库失败: %w", err)
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	if err := db.Ping(); err != nil {
		db.Close()
		return fmt.Errorf("Legacy 数据库连接测试失败: %w", err)
	}

	sqlitecfg.ConfigureSQLitePragmas(db)

	if err := ensureLegacyFTS(db); err != nil {
		db.Close()
		return fmt.Errorf("Legacy FTS 初始化失败: %w", err)
	}

	a.db = db
	return nil
}

func (a *legacyAdapter) Search(ctx context.Context, params *search.QueryParams) ([]core.CanonicalBook, int64, error) {
	if a.db == nil {
		return nil, 0, fmt.Errorf("Legacy 数据源 %s 尚未初始化", a.name)
	}
	if params == nil {
		return nil, 0, fmt.Errorf("查询参数不能为空")
	}
	if ctx == nil {
		ctx = context.Background()
	}

	querySQL, countSQL, args, err := buildLegacySQL(params)
	if err != nil {
		return nil, 0, err
	}

	queryArgs := append([]any(nil), args...)
	countArgs := append([]any(nil), args...)
	if !params.DisablePagination && len(queryArgs) >= 2 {
		countArgs = countArgs[:len(countArgs)-2]
	}

	start := time.Now()
	rows, err := a.db.QueryContext(ctx, querySQL, queryArgs...)
	if err != nil {
		slog.Error("Legacy 查询失败",
			slog.String("datasource", a.name),
			slog.String("sql", querySQL),
			slog.Any("sql_args", queryArgs),
			slog.Any("request", params),
			slog.Duration("elapsed", time.Since(start)),
			slog.String("error", err.Error()),
		)
		return nil, 0, fmt.Errorf("Legacy 查询失败: %w", err)
	}
	books, err := scanLegacyBooks(rows)
	if err != nil {
		slog.Error("Legacy 结果解析失败",
			slog.String("datasource", a.name),
			slog.String("sql", querySQL),
			slog.Any("sql_args", queryArgs),
			slog.Any("request", params),
			slog.Duration("elapsed", time.Since(start)),
			slog.String("error", err.Error()),
		)
		return nil, 0, fmt.Errorf("Legacy 结果解析失败: %w", err)
	}

	var total int64
	if err := a.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		slog.Error("Legacy 计数查询失败",
			slog.String("datasource", a.name),
			slog.String("sql", countSQL),
			slog.Any("sql_args", countArgs),
			slog.Any("request", params),
			slog.Duration("elapsed", time.Since(start)),
			slog.String("error", err.Error()),
		)
		return nil, 0, fmt.Errorf("Legacy 计数查询失败: %w", err)
	}

	canonical := make([]core.CanonicalBook, 0, len(books))
	for _, book := range books {
		id := ""
		if book.ID != nil {
			id = strconv.FormatInt(*book.ID, 10)
		}
		title := strings.TrimSpace(getString(book.Title))
		if title == "" {
			title = "未命名"
		}

		canonical = append(canonical, core.CanonicalBook{
			ID:          id,
			Title:       title,
			Authors:     splitLegacyAuthors(getString(book.Author)),
			Description: "",
			Tags:        nil,
			Publisher:   strings.TrimSpace(getString(book.Publisher)),
			Source:      a.name,
			HasCover:    false,
			CanDownload: false,
		})
	}

	slog.Info("Legacy 查询完成",
		slog.String("datasource", a.name),
		slog.String("sql", querySQL),
		slog.Any("sql_args", queryArgs),
		slog.String("count_sql", countSQL),
		slog.Any("count_args", countArgs),
		slog.Any("request", params),
		slog.Duration("elapsed", time.Since(start)),
		slog.Int("records", len(canonical)),
	)

	return canonical, total, nil
}

func (a *legacyAdapter) GetBookFile(string) (string, error) {
	return "", fmt.Errorf("Legacy 数据源 %s 不支持文件下载", a.name)
}

func (a *legacyAdapter) GetBookCover(string) (string, error) {
	return "", errors.New("该数据源不提供封面")
}

func (a *legacyAdapter) Close() error {
	if a.db != nil {
		err := a.db.Close()
		a.db = nil
		return err
	}
	return nil
}

func buildLegacySQL(params *search.QueryParams) (string, string, []any, error) {
	if params == nil {
		return "", "", nil, fmt.Errorf("查询参数不能为空")
	}

	var (
		query string
		count string
		args  []any
		err   error
	)

	func() {
		defer func() {
			if r := recover(); r != nil {
				err = fmt.Errorf("构建 Legacy 查询失败: %v", r)
			}
		}()
		query, count, args = search.BuildSQLQuery(*params)
	}()

	if err != nil {
		return "", "", nil, err
	}

	return query, count, args, nil
}

func scanLegacyBooks(rows *sql.Rows) ([]models.Book, error) {
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("读取 Legacy 列信息失败: %w", err)
	}

	books := make([]models.Book, 0)
	for rows.Next() {
		values := make([]any, len(columns))
		ptrs := make([]any, len(columns))
		for i := range values {
			ptrs[i] = &values[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, fmt.Errorf("扫描 Legacy 行失败: %w", err)
		}

		var book models.Book
		for i, column := range columns {
			normalized := strings.ToLower(column)
			if err := book.SetField(normalized, values[i]); err != nil {
				if errors.Is(err, models.ErrUnknownColumn) {
					if err := book.SetField(column, values[i]); err != nil && !errors.Is(err, models.ErrUnknownColumn) {
						return nil, fmt.Errorf("填充 Legacy 列失败: %w", err)
					}
					continue
				}
				return nil, fmt.Errorf("写入 Legacy 字段失败: %w", err)
			}
		}

		books = append(books, book)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历 Legacy 行失败: %w", err)
	}

	return books, nil
}

const (
	legacyFTSCreateSQL = `CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
title,
author,
publisher,
publish_date,
isbn,
ss_code,
dxid,
tokenize='unicode61'
)`
	legacyFTSClearSQL    = `DELETE FROM books_fts`
	legacyFTSPopulateSQL = `INSERT INTO books_fts(rowid, title, author, publisher, publish_date, isbn, ss_code, dxid)
SELECT id,
   lower(COALESCE(title, '')),
   lower(COALESCE(author, '')),
   lower(COALESCE(publisher, '')),
   lower(COALESCE(publish_date, '')),
   lower(COALESCE(ISBN, '')),
   lower(COALESCE(SS_code, '')),
   lower(COALESCE(dxid, ''))
FROM books`
)

func ensureLegacyFTS(db *sql.DB) error {
	exists, err := sqlitecfg.TableExists(db, "books")
	if err != nil {
		return fmt.Errorf("检查 Legacy books 表失败: %w", err)
	}
	if !exists {
		return nil
	}
	if _, err := db.Exec(legacyFTSCreateSQL); err != nil {
		return fmt.Errorf("创建 Legacy FTS 表失败: %w", err)
	}
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("开启 Legacy FTS 事务失败: %w", err)
	}
	defer tx.Rollback()
	if _, err := tx.Exec(legacyFTSClearSQL); err != nil {
		return fmt.Errorf("清理 Legacy FTS 数据失败: %w", err)
	}
	if _, err := tx.Exec(legacyFTSPopulateSQL); err != nil {
		return fmt.Errorf("重建 Legacy FTS 索引失败: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("提交 Legacy FTS 事务失败: %w", err)
	}
	return nil
}

func splitLegacyAuthors(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	separators := []string{";", ","}
	for _, sep := range separators {
		if strings.Contains(raw, sep) {
			parts := strings.Split(raw, sep)
			authors := make([]string, 0, len(parts))
			for _, part := range parts {
				if trimmed := strings.TrimSpace(part); trimmed != "" {
					authors = append(authors, trimmed)
				}
			}
			return authors
		}
	}
	return []string{raw}
}

func getString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
