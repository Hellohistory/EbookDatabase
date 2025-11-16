// path: search/builder.go
package search

import (
	"strings"
)

// QueryParams 定义构建查询所需的参数集合。
type QueryParams struct {
	Fields            []string
	Queries           []string
	Logics            []string
	Fuzzies           []*bool
	Page              int
	PageSize          int
	DisablePagination bool
}

// fieldColumnMap: 业务表（books）中的列映射。
var fieldColumnMap = map[string]string{
	"title":       "title",
	"author":      "author",
	"publisher":   "publisher",
	"publishdate": "publish_date",
	"isbn":        "ISBN",
	"sscode":      "SS_code",
	"dxid":        "dxid",
}

// ftsColumns: FTS 虚表（books_fts）中的列映射。
var ftsColumns = map[string]string{
	"title":       "title",
	"author":      "author",
	"publisher":   "publisher",
	"publishdate": "publish_date",
	"isbn":        "isbn",
	"sscode":      "ss_code",
	"dxid":        "dxid",
}

const (
	legacyBooksTable    = "books"     // 业务表名
	legacyBooksAlias    = "b"         // 业务表别名
	legacyBooksFTSTable = "books_fts" // FTS 虚表名
)

// BuildSQLQuery 根据查询参数构建查询与统计 SQL 及其参数。
// 返回：
//   - querySQL: 实际查询 SQL（可能包含 LIMIT/OFFSET）
//   - countSQL: 统计总数的 SQL（不包含 LIMIT/OFFSET）
//   - args:     querySQL 对应的参数（若开启分页，最后两个为 LIMIT/OFFSET）
func BuildSQLQuery(params QueryParams) (string, string, []any) {
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

	// 情况一：没有任何字段过滤，退化为简单排序 + 分页
	if len(params.Fields) == 0 {
		queryBuilder := strings.Builder{}
		queryBuilder.WriteString("SELECT ")
		queryBuilder.WriteString(legacyBooksAlias)
		queryBuilder.WriteString(".* FROM ")
		queryBuilder.WriteString(legacyBooksTable)
		queryBuilder.WriteString(" ")
		queryBuilder.WriteString(legacyBooksAlias)
		queryBuilder.WriteString(" ORDER BY ")
		queryBuilder.WriteString(legacyBooksAlias)
		queryBuilder.WriteString(".id DESC")
		if usePagination {
			queryBuilder.WriteString(" LIMIT ? OFFSET ?")
		}

		countBuilder := strings.Builder{}
		countBuilder.WriteString("SELECT COUNT(*) FROM ")
		countBuilder.WriteString(legacyBooksTable)
		countBuilder.WriteString(" ")
		countBuilder.WriteString(legacyBooksAlias)

		if usePagination {
			return queryBuilder.String(), countBuilder.String(), limitArgs
		}
		return queryBuilder.String(), countBuilder.String(), nil
	}

	// 参数校验：Fields / Queries / Logics / Fuzzies 长度约束
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

	for i, field := range params.Fields {
		column, ok := fieldColumnMap[field]
		if !ok {
			panic("unknown search field: " + field)
		}

		// fuzzy 标记控制是否走 FTS
		fuzzy := false
		if len(params.Fuzzies) > 0 && params.Fuzzies[i] != nil {
			fuzzy = *params.Fuzzies[i]
		}

		// 多条件之间插入 AND / OR
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

		// 普通字段表达式：b.<column>
		columnExpr := legacyBooksAlias + "." + column

		if fuzzy {
			// 模糊查询：走 FTS
			ftsColumn, ok := ftsColumns[strings.ToLower(field)]
			if !ok {
				panic("no FTS column defined for field: " + field)
			}

			matchQuery := BuildFTSQuery(params.Queries[i], true)
			if matchQuery == "" {
				// 空查询退化为无条件
				whereBuilder.WriteString("1 = 1")
			} else {
				needsFTSJoin = true

				// 构造列限定的 FTS 查询，例如 "title:(城市*)"
				scoped := BuildColumnScopedFTSQuery(ftsColumn, matchQuery)

				// 关键修复点：
				// MATCH 左侧必须是 FTS 表名（或合法列名），
				// 原来写 "f MATCH ?" 会被解析成列名 f，导致 "no such column: f"。
				whereBuilder.WriteString(legacyBooksFTSTable)
				whereBuilder.WriteString(" MATCH ?")

				args = append(args, scoped)
			}
		} else {
			// 精确查询：普通等值匹配
			whereBuilder.WriteString(columnExpr)
			whereBuilder.WriteString(" = ?")
			args = append(args, params.Queries[i])
		}

		whereBuilder.WriteString(")")
	}

	// 构造 FROM 子句
	fromClause := " FROM " + legacyBooksTable + " " + legacyBooksAlias
	if needsFTSJoin {
		// 这里不再给 FTS 表起别名，后续 MATCH 直接使用表名 books_fts
		fromClause += " JOIN " + legacyBooksFTSTable +
			" ON " + legacyBooksFTSTable + ".rowid = " + legacyBooksAlias + ".id"
	}

	// 构造查询 SQL
	queryBuilder := strings.Builder{}
	queryBuilder.Grow(64)
	queryBuilder.WriteString("SELECT ")
	queryBuilder.WriteString(legacyBooksAlias)
	queryBuilder.WriteString(".*")
	queryBuilder.WriteString(fromClause)
	if whereBuilder.Len() > 0 {
		queryBuilder.WriteString(" WHERE ")
		queryBuilder.WriteString(whereBuilder.String())
	}
	queryBuilder.WriteString(" ORDER BY ")
	queryBuilder.WriteString(legacyBooksAlias)
	queryBuilder.WriteString(".id DESC")
	if usePagination {
		queryBuilder.WriteString(" LIMIT ? OFFSET ?")
		args = append(args, limitArgs...)
	}

	// 构造计数 SQL（不带 LIMIT/OFFSET）
	countBuilder := strings.Builder{}
	countBuilder.Grow(64)
	countBuilder.WriteString("SELECT COUNT(*)")
	countBuilder.WriteString(fromClause)
	if whereBuilder.Len() > 0 {
		countBuilder.WriteString(" WHERE ")
		countBuilder.WriteString(whereBuilder.String())
	}

	return queryBuilder.String(), countBuilder.String(), args
}
