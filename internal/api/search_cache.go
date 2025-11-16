// path: internal/api/search_cache.go
package api

import (
	"sync"
	"time"

	"ebookdatabase/internal/core"
)

type cacheEntry struct {
	books     []core.CanonicalBook
	total     int64
	expiresAt time.Time
}

type searchCache struct {
	ttl   time.Duration
	mu    sync.RWMutex
	items map[string]cacheEntry
}

func newSearchCache(ttl time.Duration) *searchCache {
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}
	return &searchCache{
		ttl:   ttl,
		items: make(map[string]cacheEntry),
	}
}

func (c *searchCache) Get(key string) ([]core.CanonicalBook, int64, bool) {
	if c == nil {
		return nil, 0, false
	}
	c.mu.RLock()
	entry, ok := c.items[key]
	c.mu.RUnlock()
	if !ok {
		return nil, 0, false
	}
	if time.Now().After(entry.expiresAt) {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		return nil, 0, false
	}
	return cloneBooks(entry.books), entry.total, true
}

func (c *searchCache) Set(key string, books []core.CanonicalBook, total int64) {
	if c == nil {
		return
	}
	entry := cacheEntry{
		books:     cloneBooks(books),
		total:     total,
		expiresAt: time.Now().Add(c.ttl),
	}
	c.mu.Lock()
	c.items[key] = entry
	c.mu.Unlock()
}

func cloneBooks(src []core.CanonicalBook) []core.CanonicalBook {
	if len(src) == 0 {
		return []core.CanonicalBook{}
	}
	cloned := make([]core.CanonicalBook, len(src))
	for i, book := range src {
		copied := book
		if len(book.Authors) > 0 {
			copied.Authors = append([]string(nil), book.Authors...)
		}
		if len(book.Tags) > 0 {
			copied.Tags = append([]string(nil), book.Tags...)
		}
		cloned[i] = copied
	}
	return cloned
}
