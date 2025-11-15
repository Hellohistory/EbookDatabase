// path: database/manager_test.go
package database

import (
	"context"
	"database/sql"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestInitAndQueryConcurrent(t *testing.T) {
	dir := t.TempDir()

	createTestDB(t, dir, "alpha", []testBook{{Title: "Book A", Author: "Author X", PageCount: 120, SecondPass: "SPD-A", ISBN: "1234567890"}, {Title: "Book B", Author: "Author Y", PageCount: 200}})
	createTestDB(t, dir, "beta", []testBook{{Title: "Book C", Author: "Author X", PageCount: 300, SecondPass: "SPD-C", SSCode: "SS-01"}})

	manager := NewDBManager()
	if err := manager.Init(dir); err != nil {
		t.Fatalf("Init failed: %v", err)
	}
	t.Cleanup(func() {
		_ = manager.Close()
	})

	query := "SELECT * FROM books WHERE author = :author"
	args := []any{sql.Named("author", "Author X")}

	books, err := manager.QueryConcurrent(context.Background(), []string{"alpha", "beta"}, query, args)
	if err != nil {
		t.Fatalf("QueryConcurrent returned error: %v", err)
	}

	if len(books) != 2 {
		t.Fatalf("expected 2 books, got %d", len(books))
	}

	titles := map[string]struct{}{}
	for _, book := range books {
		if book.Title == nil {
			t.Fatalf("book title should not be nil")
		}
		titles[*book.Title] = struct{}{}
		if book.Author == nil || *book.Author != "Author X" {
			t.Fatalf("expected author Author X, got %v", book.Author)
		}
		if *book.Title == "Book C" {
			if book.PageCount == nil || *book.PageCount != 300 {
				t.Fatalf("expected page count 300 for Book C, got %v", book.PageCount)
			}
			if book.SSCode == nil || *book.SSCode != "SS-01" {
				t.Fatalf("expected SS-01 for Book C, got %v", book.SSCode)
			}
		}
		if *book.Title == "Book A" {
			if book.SecondPassCode == nil || *book.SecondPassCode != "SPD-A" {
				t.Fatalf("expected SPD-A for Book A, got %v", book.SecondPassCode)
			}
			if book.ISBN == nil || *book.ISBN != "1234567890" {
				t.Fatalf("expected ISBN 1234567890, got %v", book.ISBN)
			}
		}
	}

	if _, ok := titles["Book A"]; !ok {
		t.Fatalf("missing Book A in result set")
	}
	if _, ok := titles["Book C"]; !ok {
		t.Fatalf("missing Book C in result set")
	}
}

func TestQueryConcurrentReturnsAggregatedErrors(t *testing.T) {
	dir := t.TempDir()
	createTestDB(t, dir, "alpha", []testBook{{Title: "Book A"}})

	manager := NewDBManager()
	if err := manager.Init(dir); err != nil {
		t.Fatalf("Init failed: %v", err)
	}
	t.Cleanup(func() {
		_ = manager.Close()
	})

	query := "SELECT * FROM missing_table"
	books, err := manager.QueryConcurrent(context.Background(), []string{"alpha", "beta"}, query, nil)
	if len(books) != 0 {
		t.Fatalf("expected 0 books, got %d", len(books))
	}

	if err == nil {
		t.Fatalf("expected aggregated error, got nil")
	}

	if !strings.Contains(err.Error(), "missing_table") {
		t.Fatalf("expected error to mention missing_table, got %v", err)
	}
}

func TestQueryConcurrentCount(t *testing.T) {
	dir := t.TempDir()
	createTestDB(t, dir, "alpha", []testBook{{Title: "Book A", Author: "Author X"}, {Title: "Book B", Author: "Author Y"}})
	createTestDB(t, dir, "beta", []testBook{{Title: "Book C", Author: "Author X"}})

	manager := NewDBManager()
	if err := manager.Init(dir); err != nil {
		t.Fatalf("Init failed: %v", err)
	}
	t.Cleanup(func() { _ = manager.Close() })

	count, err := manager.QueryConcurrentCount(context.Background(), []string{"alpha", "beta"}, "SELECT COUNT(*) FROM books WHERE author = ?", []any{"Author X"})
	if err != nil {
		t.Fatalf("QueryConcurrentCount returned error: %v", err)
	}

	if count != 2 {
		t.Fatalf("expected total count 2, got %d", count)
	}
}

func TestGetDBList(t *testing.T) {
	dir := t.TempDir()
	createTestDB(t, dir, "alpha", []testBook{{Title: "Book A"}})
	createTestDB(t, dir, "beta", []testBook{{Title: "Book B"}})

	manager := NewDBManager()
	if err := manager.Init(dir); err != nil {
		t.Fatalf("Init failed: %v", err)
	}
	t.Cleanup(func() { _ = manager.Close() })

	names := manager.GetDBList()
	expected := []string{"alpha", "beta"}
	if !reflect.DeepEqual(names, expected) {
		t.Fatalf("expected %v, got %v", expected, names)
	}
}

type testBook struct {
	Title      string
	Author     string
	Publisher  string
	PageCount  int
	ISBN       string
	SSCode     string
	DXID       string
	SecondPass string
	Size       string
	FileType   string
}

func createTestDB(t *testing.T, dir, name string, books []testBook) {
	t.Helper()

	path := filepath.Join(dir, name+".db")
	db, err := sql.Open("sqlite3", path)
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}
	defer db.Close()

	schema := `CREATE TABLE books (
        id INTEGER PRIMARY KEY,
        title TEXT,
        author TEXT,
        publisher TEXT,
        publish_date TEXT,
        page_count INTEGER,
        ISBN TEXT,
        SS_code TEXT,
        dxid TEXT,
        second_pass_code TEXT,
        size TEXT,
        file_type TEXT
    );`

	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}

	stmt, err := db.Prepare(`INSERT INTO books (title, author, publisher, publish_date, page_count, ISBN, SS_code, dxid, second_pass_code, size, file_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
	if err != nil {
		t.Fatalf("failed to prepare insert statement: %v", err)
	}
	defer stmt.Close()

	for _, book := range books {
		if _, err := stmt.Exec(book.Title, nullableString(book.Author), nullableString(book.Publisher), nil, nullableInt(book.PageCount), nullableString(book.ISBN), nullableString(book.SSCode), nullableString(book.DXID), nullableString(book.SecondPass), nullableString(book.Size), nullableString(book.FileType)); err != nil {
			t.Fatalf("failed to insert row: %v", err)
		}
	}
}

func nullableString(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func nullableInt(value int) any {
	if value == 0 {
		return nil
	}
	return value
}
