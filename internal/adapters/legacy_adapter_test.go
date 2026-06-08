package adapters

import (
	"strings"
	"testing"

	"ebookdatabase/search"
)

func TestBuildLegacySQLUsesFTSOnlyCountForPureFTSQueries(t *testing.T) {
	query, count, args := buildLegacySQLForSchema(search.QueryParams{
		Fields:   []string{"title"},
		Queries:  []string{"历史"},
		Fuzzies:  []*bool{boolPtr(true)},
		Page:     1,
		PageSize: 5,
	}, mergedTestSchema())

	if !strings.Contains(query, "JOIN books b") {
		t.Fatalf("expected result query to join books, got %q", query)
	}
	if strings.Contains(count, "JOIN books b") {
		t.Fatalf("expected FTS-only count to avoid books join, got %q", count)
	}
	if count != "SELECT COUNT(*) FROM book_search_fts WHERE (book_search_fts MATCH ?)" {
		t.Fatalf("unexpected count SQL: %q", count)
	}
	if len(args) != 3 || args[0] != "title:(历史*)" {
		t.Fatalf("unexpected args: %#v", args)
	}
}

func TestBuildLegacySQLKeepsJoinForMixedFTSAndBookColumnQueries(t *testing.T) {
	_, count, _ := buildLegacySQLForSchema(search.QueryParams{
		Fields:   []string{"title", "dxid"},
		Queries:  []string{"历史", "DX1"},
		Logics:   []string{"AND"},
		Fuzzies:  []*bool{boolPtr(true), boolPtr(false)},
		Page:     1,
		PageSize: 5,
	}, mergedTestSchema())

	if !strings.Contains(count, "JOIN books b") {
		t.Fatalf("expected mixed count to keep books join, got %q", count)
	}
}

func mergedTestSchema() legacySchema {
	return legacySchema{
		idColumn: "book_id",
		columnMap: map[string]string{
			"title": "title",
			"dxid":  "dxid",
		},
		ftsTable: "book_search_fts",
		ftsMap: map[string]string{
			"title": "title",
		},
	}
}

func boolPtr(value bool) *bool {
	return &value
}
