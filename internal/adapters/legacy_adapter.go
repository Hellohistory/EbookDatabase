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
	name   string
	path   string
	db     *sql.DB
	schema legacySchema
}

type legacySchema struct {
	idColumn   string
	columnMap  map[string]string
	ftsTable   string
	ftsMap     map[string]string
	rebuildFTS bool
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

	schema, err := detectLegacySchema(db)
	if err != nil {
		db.Close()
		return fmt.Errorf("Legacy 表结构识别失败: %w", err)
	}

	if schema.rebuildFTS {
		if err := ensureLegacyFTS(db); err != nil {
			db.Close()
			return fmt.Errorf("Legacy FTS 初始化失败: %w", err)
		}
	}

	if schema.idColumn == "" {
		db.Close()
		return fmt.Errorf("Legacy books 表缺少可用主键列")
	}

	a.db = db
	a.schema = schema
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

	querySQL, countSQL, args, err := buildLegacySQL(params, a.schema)
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
			PublishDate: strings.TrimSpace(getString(book.PublishDate)),
			PageCount:   getInt64(book.PageCount),
			ISBN:        strings.TrimSpace(getString(book.ISBN)),
			SSCode:      strings.TrimSpace(getString(book.SSCode)),
			DXID:        strings.TrimSpace(getString(book.DXID)),
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

func buildLegacySQL(params *search.QueryParams, schema legacySchema) (string, string, []any, error) {
	if params == nil {
		return "", "", nil, fmt.Errorf("查询参数不能为空")
	}
	if schema.idColumn == "" {
		return "", "", nil, fmt.Errorf("Legacy 主键列未初始化")
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
		query, count, args = buildLegacySQLForSchema(*params, schema)
	}()

	if err != nil {
		return "", "", nil, err
	}

	return query, count, args, nil
}

func buildLegacySQLForSchema(params search.QueryParams, schema legacySchema) (string, string, []any) {
	usePagination := !params.DisablePagination

	pageSize := params.PageSize
	if usePagination {
		if pageSize <= 0 {
			panic("page size must be positive")
		}
	} else if pageSize <= 0 {
		pageSize = 0
	}

	page := params.Page
	if page <= 0 {
		page = 1
	}

	var limitArgs []any
	if usePagination {
		limitArgs = []any{pageSize, (page - 1) * pageSize}
	}

	if len(params.Fields) == 0 {
		queryBuilder := strings.Builder{}
		queryBuilder.WriteString("SELECT b.* FROM books b ORDER BY b.")
		queryBuilder.WriteString(schema.idColumn)
		queryBuilder.WriteString(" DESC")
		if usePagination {
			queryBuilder.WriteString(" LIMIT ? OFFSET ?")
		}

		countSQL := "SELECT COUNT(*) FROM books b"
		if usePagination {
			return queryBuilder.String(), countSQL, limitArgs
		}
		return queryBuilder.String(), countSQL, nil
	}

	if len(params.Queries) != len(params.Fields) {
		panic("number of queries must match number of fields")
	}
	if len(params.Fields) > 1 && len(params.Logics) != len(params.Fields)-1 {
		panic("number of logics must be fields count minus one")
	}
	if len(params.Fuzzies) != 0 && len(params.Fuzzies) != len(params.Fields) {
		panic("number of fuzzies must be zero or equal to fields count")
	}

	args := make([]any, 0, len(params.Fields)+2)
	whereBuilder := strings.Builder{}
	whereBuilder.Grow(64)
	needsFTSJoin := false
	whereUsesBookColumns := false

	for i, rawField := range params.Fields {
		field := strings.ToLower(strings.TrimSpace(rawField))
		column, ok := schema.columnMap[field]
		if !ok {
			panic("unknown search field: " + rawField)
		}

		fuzzy := false
		if len(params.Fuzzies) > 0 && params.Fuzzies[i] != nil {
			fuzzy = *params.Fuzzies[i]
		}

		if i > 0 {
			logic := strings.ToUpper(strings.TrimSpace(params.Logics[i-1]))
			if logic != "AND" && logic != "OR" {
				panic("invalid logic operator: " + params.Logics[i-1])
			}
			whereBuilder.WriteString(" ")
			whereBuilder.WriteString(logic)
			whereBuilder.WriteString(" ")
		}

		whereBuilder.WriteString("(")
		if fuzzy {
			if schema.ftsTable != "" {
				if ftsColumn, ok := schema.ftsMap[field]; ok {
					matchQuery := search.BuildFTSQuery(params.Queries[i], true)
					if matchQuery == "" {
						whereBuilder.WriteString("1 = 1")
					} else {
						needsFTSJoin = true
						whereBuilder.WriteString(schema.ftsTable)
						whereBuilder.WriteString(" MATCH ?")
						args = append(args, search.BuildColumnScopedFTSQuery(ftsColumn, matchQuery))
					}
					whereBuilder.WriteString(")")
					continue
				}
			}
			whereBuilder.WriteString("b.")
			whereBuilder.WriteString(column)
			whereBuilder.WriteString(" LIKE ?")
			args = append(args, "%"+strings.TrimSpace(params.Queries[i])+"%")
		} else {
			whereBuilder.WriteString("b.")
			whereBuilder.WriteString(column)
			whereBuilder.WriteString(" = ?")
			args = append(args, params.Queries[i])
		}
		whereUsesBookColumns = true
		whereBuilder.WriteString(")")
	}

	fromClause := " FROM books b"
	countFromClause := fromClause
	if needsFTSJoin {
		fromClause = " FROM " + schema.ftsTable + " JOIN books b ON b." + schema.idColumn + " = " + schema.ftsTable + ".rowid"
		countFromClause = fromClause
		if !whereUsesBookColumns {
			countFromClause = " FROM " + schema.ftsTable
		}
	}

	queryBuilder := strings.Builder{}
	queryBuilder.WriteString("SELECT b.*")
	queryBuilder.WriteString(fromClause)
	if whereBuilder.Len() > 0 {
		queryBuilder.WriteString(" WHERE ")
		queryBuilder.WriteString(whereBuilder.String())
	}
	queryBuilder.WriteString(" ORDER BY ")
	if needsFTSJoin {
		queryBuilder.WriteString(schema.ftsTable)
		queryBuilder.WriteString(".rowid")
	} else {
		queryBuilder.WriteString("b.")
		queryBuilder.WriteString(schema.idColumn)
	}
	queryBuilder.WriteString(" DESC")
	if usePagination {
		queryBuilder.WriteString(" LIMIT ? OFFSET ?")
		args = append(args, limitArgs...)
	}

	countBuilder := strings.Builder{}
	countBuilder.WriteString("SELECT COUNT(*)")
	countBuilder.WriteString(countFromClause)
	if whereBuilder.Len() > 0 {
		countBuilder.WriteString(" WHERE ")
		countBuilder.WriteString(whereBuilder.String())
	}

	return queryBuilder.String(), countBuilder.String(), args
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

func detectLegacySchema(db *sql.DB) (legacySchema, error) {
	exists, err := sqlitecfg.TableExists(db, "books")
	if err != nil {
		return legacySchema{}, fmt.Errorf("检查 Legacy books 表失败: %w", err)
	}
	if !exists {
		return legacySchema{}, fmt.Errorf("Legacy books 表不存在")
	}

	columns, err := tableColumns(db, "books")
	if err != nil {
		return legacySchema{}, err
	}

	if _, ok := columns["book_id"]; ok {
		schema := legacySchema{
			idColumn: "book_id",
			columnMap: map[string]string{
				"title":       "title",
				"author":      "author",
				"publisher":   "publisher",
				"publishdate": "publish_date",
				"isbn":        "isbn",
				"sscode":      "ss_code",
				"dxid":        "dxid",
			},
			ftsMap: map[string]string{
				"title":     "title",
				"author":    "author",
				"publisher": "publisher",
			},
		}
		if ftsExists, err := sqlitecfg.TableExists(db, "book_search_fts"); err != nil {
			return legacySchema{}, fmt.Errorf("检查真实库 FTS 表失败: %w", err)
		} else if ftsExists {
			schema.ftsTable = "book_search_fts"
		}
		return schema, nil
	}

	if _, ok := columns["id"]; ok {
		return legacySchema{
			idColumn: "id",
			columnMap: map[string]string{
				"title":       "title",
				"author":      "author",
				"publisher":   "publisher",
				"publishdate": "publish_date",
				"isbn":        "ISBN",
				"sscode":      "SS_code",
				"dxid":        "dxid",
			},
			ftsTable: "books_fts",
			ftsMap: map[string]string{
				"title":       "title",
				"author":      "author",
				"publisher":   "publisher",
				"publishdate": "publish_date",
				"isbn":        "isbn",
				"sscode":      "ss_code",
				"dxid":        "dxid",
			},
			rebuildFTS: true,
		}, nil
	}

	return legacySchema{}, fmt.Errorf("Legacy books 表缺少 id 或 book_id 主键列")
}

func tableColumns(db *sql.DB, table string) (map[string]struct{}, error) {
	rows, err := db.Query("PRAGMA table_info(" + table + ")")
	if err != nil {
		return nil, fmt.Errorf("读取 %s 表结构失败: %w", table, err)
	}
	defer rows.Close()

	columns := make(map[string]struct{})
	for rows.Next() {
		var (
			cid        int
			name       string
			columnType string
			notNull    int
			defaultVal any
			pk         int
		)
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultVal, &pk); err != nil {
			return nil, fmt.Errorf("解析 %s 表结构失败: %w", table, err)
		}
		columns[strings.ToLower(name)] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("遍历 %s 表结构失败: %w", table, err)
	}
	return columns, nil
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

func getInt64(value *int64) int64 {
	if value == nil {
		return 0
	}
	return *value
}
