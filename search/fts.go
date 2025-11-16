// path: search/fts.go
package search

import "strings"

// BuildFTSQuery 根据 fuzzy 标记将用户输入转换为 MATCH 语法可接受的查询字符串。
func BuildFTSQuery(value string, fuzzy bool) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return ""
	}

	tokens := strings.Fields(normalized)
	if len(tokens) == 0 {
		return ""
	}

	for i, token := range tokens {
		token = strings.ReplaceAll(token, "\"", "")
		if token == "" {
			continue
		}
		if fuzzy {
			tokens[i] = token + "*"
		} else {
			tokens[i] = token
		}
	}

	cleaned := make([]string, 0, len(tokens))
	for _, token := range tokens {
		if token != "" {
			cleaned = append(cleaned, token)
		}
	}
	if len(cleaned) == 0 {
		return ""
	}

	if fuzzy {
		return strings.Join(cleaned, " ")
	}
	return "\"" + strings.Join(cleaned, " ") + "\""
}
