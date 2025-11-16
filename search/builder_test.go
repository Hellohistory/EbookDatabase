// path: search/builder_test.go
package search

import "testing"

func boolPtr(v bool) *bool {
	return &v
}

func TestBuildSQLQuerySingleFuzzy(t *testing.T) {
	query, count, args := BuildSQLQuery(QueryParams{
		Fields:   []string{"title"},
		Queries:  []string{"Go"},
		Fuzzies:  []*bool{boolPtr(true)},
		Page:     1,
		PageSize: 20,
	})

	expectedQuery := "SELECT b.* FROM books b JOIN books_fts f ON f.rowid = b.id WHERE (f MATCH ?) ORDER BY b.id DESC LIMIT ? OFFSET ?"
	expectedCount := "SELECT COUNT(*) FROM books b JOIN books_fts f ON f.rowid = b.id WHERE (f MATCH ?)"

	if query != expectedQuery {
		t.Fatalf("unexpected query: %s", query)
	}
	if count != expectedCount {
		t.Fatalf("unexpected count query: %s", count)
	}

	if len(args) != 3 {
		t.Fatalf("unexpected args length: %d", len(args))
	}

	if args[0] != "title:(go*)" || args[1] != 20 || args[2] != 0 {
		t.Fatalf("unexpected args: %#v", args)
	}
}

func TestBuildSQLQueryMultiFieldAndOr(t *testing.T) {
	query, count, args := BuildSQLQuery(QueryParams{
		Fields:   []string{"title", "author", "publisher"},
		Queries:  []string{"Go", "Alice", "Press"},
		Logics:   []string{"AND", "OR"},
		Fuzzies:  []*bool{boolPtr(true), nil, boolPtr(false)},
		Page:     2,
		PageSize: 10,
	})

	expectedQuery := "SELECT b.* FROM books b JOIN books_fts f ON f.rowid = b.id WHERE (f MATCH ?) AND (b.author = ?) OR (b.publisher = ?) ORDER BY b.id DESC LIMIT ? OFFSET ?"
	expectedCount := "SELECT COUNT(*) FROM books b JOIN books_fts f ON f.rowid = b.id WHERE (f MATCH ?) AND (b.author = ?) OR (b.publisher = ?)"

	if query != expectedQuery {
		t.Fatalf("unexpected query: %s", query)
	}
	if count != expectedCount {
		t.Fatalf("unexpected count query: %s", count)
	}

	if len(args) != 5 {
		t.Fatalf("unexpected args length: %d", len(args))
	}

	offset := (2 - 1) * 10
	if args[0] != "title:(go*)" || args[1] != "Alice" || args[2] != "Press" || args[3] != 10 || args[4] != offset {
		t.Fatalf("unexpected args: %#v", args)
	}
}

func TestBuildSQLQueryNoFields(t *testing.T) {
	query, count, args := BuildSQLQuery(QueryParams{
		Page:     3,
		PageSize: 15,
	})

	if query != "SELECT b.* FROM books b ORDER BY b.id DESC LIMIT ? OFFSET ?" {
		t.Fatalf("unexpected query: %s", query)
	}
	if count != "SELECT COUNT(*) FROM books b" {
		t.Fatalf("unexpected count query: %s", count)
	}
	if len(args) != 2 {
		t.Fatalf("unexpected args length: %d", len(args))
	}
	if args[0] != 15 || args[1] != 30 {
		t.Fatalf("unexpected args: %#v", args)
	}
}

func TestBuildSQLQueryInvalidLogicPanics(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("expected panic for invalid logic")
		}
	}()

	BuildSQLQuery(QueryParams{
		Fields:   []string{"title", "author"},
		Queries:  []string{"Go", "Alice"},
		Logics:   []string{"XOR"},
		Page:     1,
		PageSize: 10,
	})
}

func TestBuildSQLQueryInvalidFieldPanics(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("expected panic for invalid field")
		}
	}()

	BuildSQLQuery(QueryParams{
		Fields:   []string{"unknown"},
		Queries:  []string{"value"},
		Page:     1,
		PageSize: 10,
	})
}
