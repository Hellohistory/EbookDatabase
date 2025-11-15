// Path: database/datasource.go
package database

import (
	"context"

	"ebookdatabase/search"
)

// CanonicalBook 是系统中流通的统一书籍模型。
type CanonicalBook struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Authors     []string `json:"authors"`
	Description string   `json:"description,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	Publisher   string   `json:"publisher,omitempty"`
	Source      string   `json:"source"`
	HasCover    bool     `json:"has_cover"`
	CanDownload bool     `json:"can_download"`
}

// Datasource 定义了所有书库类型需要实现的最小功能集合。
type Datasource interface {
	Init() error
	Search(ctx context.Context, params *search.QueryParams) ([]CanonicalBook, int64, error)
	GetBookFile(bookID string) (string, error)
	GetBookCover(bookID string) (string, error)
}
