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

var fieldColumnMap = map[string]string{
	"title":       "title",
	"author":      "author",
	"publisher":   "publisher",
	"publishdate": "publish_date",
	"isbn":        "ISBN",
	"sscode":      "SS_code",
	"dxid":        "dxid",
}

// BuildSQLQuery 根据查询参数构建查询与统计 SQL 及其参数，复现 Python 版本的逻辑。
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

	if len(params.Fields) == 0 {
                queryBuilder := strings.Builder{}
                queryBuilder.WriteString("SELECT * FROM books")
                if usePagination {
                        queryBuilder.WriteString(" LIMIT ? OFFSET ?")
                }

                countBuilder := strings.Builder{}
                countBuilder.WriteString("SELECT COUNT(*) FROM books")

                if usePagination {
                        return queryBuilder.String(), countBuilder.String(), limitArgs
                }
                return queryBuilder.String(), countBuilder.String(), nil
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

	queryBuilder := strings.Builder{}
	queryBuilder.Grow(64)
	queryBuilder.WriteString("SELECT * FROM books WHERE ")

	countBuilder := strings.Builder{}
	countBuilder.Grow(64)
	countBuilder.WriteString("SELECT COUNT(*) FROM books WHERE ")

	args := make([]any, 0, len(params.Fields)+2)

	for i, field := range params.Fields {
		column, ok := fieldColumnMap[field]
		if !ok {
			panic("unknown search field: " + field)
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
			queryBuilder.WriteString(" ")
			queryBuilder.WriteString(logic)
			queryBuilder.WriteString(" ")
			countBuilder.WriteString(" ")
			countBuilder.WriteString(logic)
			countBuilder.WriteString(" ")
		}

		queryBuilder.WriteString("(")
		queryBuilder.WriteString(column)
		countBuilder.WriteString("(")
		countBuilder.WriteString(column)

		if fuzzy {
			queryBuilder.WriteString(" LIKE ?)")
			countBuilder.WriteString(" LIKE ?)")
			args = append(args, "%"+params.Queries[i]+"%")
		} else {
			queryBuilder.WriteString(" = ?)")
			countBuilder.WriteString(" = ?)")
			args = append(args, params.Queries[i])
		}
	}

        if usePagination {
                queryBuilder.WriteString(" LIMIT ? OFFSET ?")
                args = append(args, limitArgs...)
        }

        return queryBuilder.String(), countBuilder.String(), args
}
