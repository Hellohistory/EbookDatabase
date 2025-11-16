// path: internal/api/query_params.go
package api

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"ebookdatabase/search"
)

func (s *Server) buildQueryParams(c *gin.Context) (*search.QueryParams, error) {
	fields := normalizeValues(firstNonEmpty(c.QueryArray("fields[]"), c.QueryArray("fields")))
	queries := normalizeValues(firstNonEmpty(c.QueryArray("queries[]"), c.QueryArray("queries")))
	logics := normalizeValues(firstNonEmpty(c.QueryArray("logics[]"), c.QueryArray("logics")))

	if len(fields) == 0 {
		if field := c.Query("field"); field != "" {
			fields = []string{strings.TrimSpace(field)}
		}
	}

	if len(queries) == 0 {
		if query := c.Query("query"); query != "" {
			queries = []string{strings.TrimSpace(query)}
		}
	}

	if len(fields) == 0 {
		fields = []string{strings.TrimSpace(s.config.DefaultSearchField)}
	}

	if len(fields) == 0 || len(queries) == 0 {
		return nil, fmt.Errorf("缺少搜索字段或关键字")
	}

	if len(fields) != len(queries) {
		return nil, fmt.Errorf("字段与关键字数量不匹配")
	}

	if len(fields) > 1 && len(logics) != len(fields)-1 {
		return nil, fmt.Errorf("逻辑运算符数量不正确")
	}

	fuzzyRaw := normalizeValues(firstNonEmpty(c.QueryArray("fuzzies[]"), c.QueryArray("fuzzies")))
	if len(fuzzyRaw) == 0 {
		if value := c.Query("fuzzy"); value != "" {
			fuzzyRaw = []string{strings.TrimSpace(value)}
		}
	}

	fuzzies := make([]*bool, len(fields))
	for i := range fuzzies {
		if i < len(fuzzyRaw) {
			if value, err := strconv.ParseBool(fuzzyRaw[i]); err == nil {
				v := value
				fuzzies[i] = &v
			}
		}
	}

	page := parsePositiveInt(c.Query("page"), 1)
	pageSize := parsePositiveInt(firstNonBlank(c.Query("pageSize"), c.Query("page_size")), s.config.PageSize)
	if pageSize <= 0 {
		pageSize = s.config.PageSize
	}

	if page <= 0 {
		page = 1
	}

	if pageSize <= 0 {
		return nil, fmt.Errorf("无效的分页大小")
	}

	return &search.QueryParams{
		Fields:            fields,
		Queries:           queries,
		Logics:            logics,
		Fuzzies:           fuzzies,
		Page:              page,
		PageSize:          pageSize,
		DisablePagination: false,
	}, nil
}

func parsePositiveInt(value string, fallback int) int {
	if value == "" {
		return fallback
	}
	v, err := strconv.Atoi(value)
	if err != nil || v <= 0 {
		return fallback
	}
	return v
}

func firstNonEmpty(primary, secondary []string) []string {
	if len(primary) > 0 {
		return primary
	}
	return secondary
}

func firstNonBlank(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func normalizeValues(values []string) []string {
	if len(values) == 0 {
		return values
	}
	normalized := make([]string, 0, len(values))
	for _, v := range values {
		if trimmed := strings.TrimSpace(v); trimmed != "" {
			normalized = append(normalized, trimmed)
		}
	}
	return normalized
}

func buildSearchCacheKey(params *search.QueryParams, sources []string) string {
	if params == nil {
		return strings.Join(sources, ",")
	}
	builder := strings.Builder{}
	builder.Grow(128)
	builder.WriteString(strings.Join(sources, ","))
	builder.WriteString("|page=")
	builder.WriteString(strconv.Itoa(params.Page))
	builder.WriteString("|size=")
	builder.WriteString(strconv.Itoa(params.PageSize))

	for i, field := range params.Fields {
		builder.WriteString("|f=")
		builder.WriteString(strings.ToLower(strings.TrimSpace(field)))
		builder.WriteString(":q=")
		if i < len(params.Queries) {
			builder.WriteString(strings.TrimSpace(params.Queries[i]))
		}
		builder.WriteString(":fuzzy=")
		if i < len(params.Fuzzies) && params.Fuzzies[i] != nil && *params.Fuzzies[i] {
			builder.WriteString("1")
		} else {
			builder.WriteString("0")
		}
		if i < len(params.Logics) {
			builder.WriteString(":logic=")
			builder.WriteString(strings.ToUpper(strings.TrimSpace(params.Logics[i])))
		}
	}

	return builder.String()
}

func computeTotalPages(total int64, pageSize int) int {
	if pageSize <= 0 {
		return 0
	}
	return int(math.Ceil(float64(total) / float64(pageSize)))
}
