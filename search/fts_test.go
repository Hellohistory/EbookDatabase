// path: search/fts_test.go
package search

import "testing"

func TestBuildFTSQueryFuzzy(t *testing.T) {
	got := BuildFTSQuery("Go Lang", true)
	if got != "go* lang*" {
		t.Fatalf("unexpected fuzzy query: %s", got)
	}
}

func TestBuildFTSQueryExact(t *testing.T) {
	got := BuildFTSQuery("  Rust Book  ", false)
	if got != "\"rust book\"" {
		t.Fatalf("unexpected exact query: %s", got)
	}
}

func TestBuildFTSQueryEmpty(t *testing.T) {
	if got := BuildFTSQuery("   ", true); got != "" {
		t.Fatalf("expected empty string, got %s", got)
	}
}
