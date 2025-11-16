// path: internal/adapters/calibre_adapter.go
package adapters

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"

	"ebookdatabase/config"
	"ebookdatabase/internal/core"
	"ebookdatabase/internal/infra/sqlitecfg"
	"ebookdatabase/search"
)

type calibreAdapter struct {
	name    string
	rootDir string
	dbPath  string
	db      *sql.DB
}

// NewCalibreAdapter 根据配置创建 Calibre 数据源适配器。
func NewCalibreAdapter(cfg config.DatasourceConfig) core.Datasource {
	root := strings.TrimSpace(cfg.Path)
	dbPath := root
	if strings.EqualFold(filepath.Ext(root), ".db") {
		root = filepath.Dir(root)
	} else {
		dbPath = filepath.Join(root, "metadata.db")
	}

	return &calibreAdapter{
		name:    cfg.Name,
		rootDir: root,
		dbPath:  dbPath,
	}
}

func (a *calibreAdapter) Init() error {
	if a.db != nil {
		_ = a.db.Close()
	}

	if a.dbPath == "" {
		return fmt.Errorf("Calibre 数据源 %s 未指定数据库路径", a.name)
	}
	if _, err := os.Stat(a.dbPath); err != nil {
		return fmt.Errorf("Calibre 数据源 %s 的 metadata.db 不存在: %w", a.name, err)
	}

	dsn := fmt.Sprintf("file:%s?_busy_timeout=5000&cache=shared", filepath.ToSlash(a.dbPath))
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return fmt.Errorf("打开 Calibre 数据库失败: %w", err)
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	if err := db.Ping(); err != nil {
		db.Close()
		return fmt.Errorf("Calibre 数据库连接测试失败: %w", err)
	}

	sqlitecfg.ConfigureSQLitePragmas(db)

	if err := ensureCalibreFTS(db); err != nil {
		db.Close()
		return fmt.Errorf("Calibre FTS 初始化失败: %w", err)
	}

	a.db = db
	return nil
}

func (a *calibreAdapter) Search(ctx context.Context, params *search.QueryParams) ([]core.CanonicalBook, int64, error) {
	if a.db == nil {
		return nil, 0, fmt.Errorf("Calibre 数据源 %s 尚未初始化", a.name)
	}
	if params == nil {
		return nil, 0, fmt.Errorf("查询参数不能为空")
	}
	if ctx == nil {
		ctx = context.Background()
	}

	querySQL, queryArgs, countSQL, countArgs, err := a.buildStatements(params)
	if err != nil {
		return nil, 0, err
	}

	start := time.Now()
	rows, err := a.db.QueryContext(ctx, querySQL, queryArgs...)
	if err != nil {
		slog.Error("Calibre 查询失败",
			slog.String("datasource", a.name),
			slog.String("sql", querySQL),
			slog.Any("sql_args", queryArgs),
			slog.Any("request", params),
			slog.Duration("elapsed", time.Since(start)),
			slog.String("error", err.Error()),
		)
		return nil, 0, fmt.Errorf("Calibre 查询失败: %w", err)
	}
	defer rows.Close()

	books := make([]core.CanonicalBook, 0)
	for rows.Next() {
		var (
			id          int64
			title       sql.NullString
			authorsRaw  sql.NullString
			description sql.NullString
			tagsRaw     sql.NullString
			publisher   sql.NullString
			hasCover    sql.NullInt64
		)

		if err := rows.Scan(&id, &title, &authorsRaw, &description, &tagsRaw, &publisher, &hasCover); err != nil {
			slog.Error("Calibre 结果解析失败",
				slog.String("datasource", a.name),
				slog.String("sql", querySQL),
				slog.Any("sql_args", queryArgs),
				slog.String("error", err.Error()),
				slog.Any("request", params),
				slog.Duration("elapsed", time.Since(start)),
			)
			return nil, 0, fmt.Errorf("Calibre 结果解析失败: %w", err)
		}

		book := core.CanonicalBook{
			ID:          strconv.FormatInt(id, 10),
			Title:       strings.TrimSpace(title.String),
			Authors:     splitList(authorsRaw.String),
			Description: strings.TrimSpace(description.String),
			Tags:        splitList(tagsRaw.String),
			Publisher:   strings.TrimSpace(publisher.String),
			Source:      a.name,
			HasCover:    hasCover.Valid && hasCover.Int64 != 0,
			CanDownload: true,
		}

		if book.Title == "" {
			book.Title = fmt.Sprintf("ID %d", id)
		}

		books = append(books, book)
	}

	if err := rows.Err(); err != nil {
		slog.Error("Calibre 查询遍历失败",
			slog.String("datasource", a.name),
			slog.String("sql", querySQL),
			slog.Any("sql_args", queryArgs),
			slog.Any("request", params),
			slog.Duration("elapsed", time.Since(start)),
			slog.String("error", err.Error()),
		)
		return nil, 0, fmt.Errorf("Calibre 查询遍历失败: %w", err)
	}

	var total int64
	if err := a.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		slog.Error("Calibre 计数查询失败",
			slog.String("datasource", a.name),
			slog.String("sql", countSQL),
			slog.Any("sql_args", countArgs),
			slog.Any("request", params),
			slog.Duration("elapsed", time.Since(start)),
			slog.String("error", err.Error()),
		)
		return nil, 0, fmt.Errorf("Calibre 计数查询失败: %w", err)
	}

	slog.Info("Calibre 查询完成",
		slog.String("datasource", a.name),
		slog.String("sql", querySQL),
		slog.Any("sql_args", queryArgs),
		slog.String("count_sql", countSQL),
		slog.Any("count_args", countArgs),
		slog.Any("request", params),
		slog.Duration("elapsed", time.Since(start)),
		slog.Int("records", len(books)),
	)

	return books, total, nil
}

func (a *calibreAdapter) buildStatements(params *search.QueryParams) (string, []any, string, []any, error) {
	conditions := make([]string, 0, len(params.Fields))
	args := make([]any, 0, len(params.Fields))
	needFTSJoin := false

	for i, field := range params.Fields {
		queryValue := ""
		if i < len(params.Queries) {
			queryValue = strings.TrimSpace(params.Queries[i])
		}
		if queryValue == "" {
			continue
		}

		fuzzy := false
		if i < len(params.Fuzzies) && params.Fuzzies[i] != nil {
			fuzzy = *params.Fuzzies[i]
		}

		condition, value, usesFTS := calibreCondition(strings.ToLower(field), queryValue, fuzzy)
		if condition == "" {
			continue
		}
		if usesFTS {
			needFTSJoin = true
		}

		if len(conditions) > 0 {
			logic := "AND"
			if i-1 < len(params.Logics) {
				candidate := strings.ToUpper(strings.TrimSpace(params.Logics[i-1]))
				if candidate == "OR" {
					logic = candidate
				}
			}
			conditions = append(conditions, logic)
		}

		conditions = append(conditions, condition)
		args = append(args, value)
	}

	whereClause := buildWhereClause(conditions)

	selectSQL := strings.Builder{}
	selectSQL.WriteString(`SELECT b.id,
       b.title,
       (SELECT GROUP_CONCAT(a.name, ', ') FROM authors a JOIN books_authors_link bal ON bal.author = a.id WHERE bal.book = b.id ORDER BY bal.id) AS authors,
       COALESCE(cm.text, '') AS description,
       (SELECT GROUP_CONCAT(t.name, ', ') FROM tags t JOIN books_tags_link btl ON btl.tag = t.id WHERE btl.book = b.id ORDER BY t.name) AS tags,
       COALESCE(p.name, '') AS publisher,
       COALESCE(b.has_cover, 0) AS has_cover
FROM books b
LEFT JOIN comments cm ON cm.book = b.id
LEFT JOIN publishers p ON p.id = b.publisher`)
	if needFTSJoin {
		selectSQL.WriteString(" JOIN " + calibreFTSTable + " f ON f.rowid = b.id")
	}
	if whereClause != "" {
		selectSQL.WriteString(" WHERE ")
		selectSQL.WriteString(whereClause)
	}
	selectSQL.WriteString(" ORDER BY b.id DESC")

	countSQL := strings.Builder{}
	countSQL.WriteString("SELECT COUNT(*) FROM books b")
	if needFTSJoin {
		countSQL.WriteString(" JOIN " + calibreFTSTable + " f ON f.rowid = b.id")
	}
	if whereClause != "" {
		countSQL.WriteString(" WHERE ")
		countSQL.WriteString(whereClause)
	}

	queryArgs := append([]any(nil), args...)
	countArgs := append([]any(nil), args...)

	if !params.DisablePagination {
		page := params.Page
		if page <= 0 {
			page = 1
		}
		limit := params.PageSize
		if limit <= 0 {
			return "", nil, "", nil, fmt.Errorf("分页参数无效")
		}
		selectSQL.WriteString(" LIMIT ? OFFSET ?")
		queryArgs = append(queryArgs, limit, (page-1)*limit)
	}

	return selectSQL.String(), queryArgs, countSQL.String(), countArgs, nil
}

var calibreFTSColumnMap = map[string]string{
	"title":     "title",
	"author":    "authors",
	"authors":   "authors",
	"tag":       "tags",
	"tags":      "tags",
	"publisher": "publisher",
}

func calibreCondition(field, value string, fuzzy bool) (string, any, bool) {
	column, ok := calibreFTSColumnMap[field]
	if !ok {
		column = "title"
	}
	match := search.BuildFTSQuery(value, fuzzy)
	if match == "" {
		return "", nil, false
	}
	scoped := search.BuildColumnScopedFTSQuery(column, match)
	return "f MATCH ?", scoped, true
}

func buildWhereClause(conditions []string) string {
	if len(conditions) == 0 {
		return ""
	}
	builder := strings.Builder{}
	for i, fragment := range conditions {
		if i > 0 {
			builder.WriteString(" ")
		}
		builder.WriteString(fragment)
	}
	return builder.String()
}

func splitList(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

const (
	calibreFTSTable     = "calibre_books_fts"
	calibreFTSCreateSQL = `CREATE VIRTUAL TABLE IF NOT EXISTS calibre_books_fts USING fts5(
title,
authors,
tags,
publisher,
description,
tokenize='unicode61'
)`
	calibreFTSClearSQL    = `DELETE FROM calibre_books_fts`
	calibreFTSPopulateSQL = `INSERT INTO calibre_books_fts(rowid, title, authors, tags, publisher, description)
SELECT b.id,
   lower(COALESCE(b.title, '')),
   lower(COALESCE((SELECT GROUP_CONCAT(a.name, ' ') FROM authors a JOIN books_authors_link bal ON bal.author = a.id WHERE bal.book = b.id), '')),
   lower(COALESCE((SELECT GROUP_CONCAT(t.name, ' ') FROM tags t JOIN books_tags_link btl ON btl.tag = t.id WHERE btl.book = b.id), '')),
   lower(COALESCE(p.name, '')),
   lower(COALESCE(cm.text, ''))
FROM books b
LEFT JOIN comments cm ON cm.book = b.id
LEFT JOIN publishers p ON p.id = b.publisher`
)

func ensureCalibreFTS(db *sql.DB) error {
	exists, err := sqlitecfg.TableExists(db, "books")
	if err != nil {
		return fmt.Errorf("检查 Calibre books 表失败: %w", err)
	}
	if !exists {
		return nil
	}
	if _, err := db.Exec(calibreFTSCreateSQL); err != nil {
		return fmt.Errorf("创建 Calibre FTS 表失败: %w", err)
	}
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("开启 Calibre FTS 事务失败: %w", err)
	}
	defer tx.Rollback()
	if _, err := tx.Exec(calibreFTSClearSQL); err != nil {
		return fmt.Errorf("清理 Calibre FTS 数据失败: %w", err)
	}
	if _, err := tx.Exec(calibreFTSPopulateSQL); err != nil {
		return fmt.Errorf("重建 Calibre FTS 索引失败: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("提交 Calibre FTS 事务失败: %w", err)
	}
	return nil
}

func (a *calibreAdapter) GetBookFile(bookID string) (string, error) {
	if a.db == nil {
		return "", fmt.Errorf("Calibre 数据源 %s 尚未初始化", a.name)
	}
	id, err := strconv.ParseInt(strings.TrimSpace(bookID), 10, 64)
	if err != nil {
		return "", fmt.Errorf("无效的图书 ID: %w", err)
	}

	const query = `SELECT b.path, d.name, d.format
FROM books b
JOIN data d ON d.book = b.id
WHERE b.id = ?
ORDER BY d.id ASC
LIMIT 1`

	var (
		bookPath sql.NullString
		fileName sql.NullString
		format   sql.NullString
	)
	if err := a.db.QueryRow(query, id).Scan(&bookPath, &fileName, &format); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", fmt.Errorf("未找到可下载文件")
		}
		return "", fmt.Errorf("查询 Calibre 文件信息失败: %w", err)
	}

	baseName := strings.TrimSpace(fileName.String)
	if baseName == "" {
		baseName = fmt.Sprintf("%d", id)
	}
	ext := strings.ToLower(strings.TrimSpace(format.String))
	if ext == "" {
		return "", fmt.Errorf("未找到可下载文件格式")
	}
	relDir := strings.TrimSpace(bookPath.String)

	fullPath := filepath.Join(a.rootDir, relDir, fmt.Sprintf("%s.%s", baseName, ext))
	if _, err := os.Stat(fullPath); err != nil {
		return "", fmt.Errorf("无法访问 Calibre 文件: %w", err)
	}
	return fullPath, nil
}

func (a *calibreAdapter) GetBookCover(bookID string) (string, error) {
	if a.db == nil {
		return "", fmt.Errorf("Calibre 数据源 %s 尚未初始化", a.name)
	}
	id, err := strconv.ParseInt(strings.TrimSpace(bookID), 10, 64)
	if err != nil {
		return "", fmt.Errorf("无效的图书 ID: %w", err)
	}

	const query = "SELECT path, has_cover FROM books WHERE id = ?"
	var (
		relPath  sql.NullString
		hasCover sql.NullInt64
	)
	if err := a.db.QueryRow(query, id).Scan(&relPath, &hasCover); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", fmt.Errorf("未找到封面")
		}
		return "", fmt.Errorf("查询 Calibre 封面信息失败: %w", err)
	}

	if !hasCover.Valid || hasCover.Int64 == 0 {
		return "", os.ErrNotExist
	}

	coverPath := filepath.Join(a.rootDir, strings.TrimSpace(relPath.String), "cover.jpg")
	if _, err := os.Stat(coverPath); err != nil {
		return "", fmt.Errorf("无法访问 Calibre 封面: %w", err)
	}
	return coverPath, nil
}

func (a *calibreAdapter) Close() error {
	if a.db != nil {
		err := a.db.Close()
		a.db = nil
		return err
	}
	return nil
}
