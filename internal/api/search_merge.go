// path: internal/api/search_merge.go
package api

import (
	"container/heap"
	"strconv"
	"strings"

	"ebookdatabase/internal/core"
)

type heapItem struct {
	book      core.CanonicalBook
	sourceIdx int
	bookIdx   int
	sortID    int64
	hasID     bool
}

type bookHeap []heapItem

func (h bookHeap) Len() int { return len(h) }

func (h bookHeap) Less(i, j int) bool {
	left := h[i]
	right := h[j]
	if left.hasID && right.hasID {
		if left.sortID == right.sortID {
			if left.sourceIdx == right.sourceIdx {
				return left.bookIdx < right.bookIdx
			}
			return left.sourceIdx < right.sourceIdx
		}
		return left.sortID > right.sortID
	}
	if left.hasID != right.hasID {
		return left.hasID
	}
	if left.book.ID == right.book.ID {
		if left.sourceIdx == right.sourceIdx {
			return left.bookIdx < right.bookIdx
		}
		return left.sourceIdx < right.sourceIdx
	}
	return left.book.ID > right.book.ID
}

func (h bookHeap) Swap(i, j int) { h[i], h[j] = h[j], h[i] }

func (h *bookHeap) Push(x any) {
	*h = append(*h, x.(heapItem))
}

func (h *bookHeap) Pop() any {
	old := *h
	n := len(old)
	item := old[n-1]
	*h = old[:n-1]
	return item
}

func mergeBooksByIDDesc(groups [][]core.CanonicalBook) []core.CanonicalBook {
	total := 0
	for _, books := range groups {
		total += len(books)
	}
	merged := make([]core.CanonicalBook, 0, total)
	h := &bookHeap{}
	for sourceIdx, books := range groups {
		if len(books) == 0 {
			continue
		}
		heap.Push(h, newHeapItem(sourceIdx, 0, books[0]))
	}

	for h.Len() > 0 {
		item := heap.Pop(h).(heapItem)
		merged = append(merged, item.book)
		nextIdx := item.bookIdx + 1
		if nextIdx < len(groups[item.sourceIdx]) {
			heap.Push(h, newHeapItem(item.sourceIdx, nextIdx, groups[item.sourceIdx][nextIdx]))
		}
	}

	return merged
}

func newHeapItem(sourceIdx, bookIdx int, book core.CanonicalBook) heapItem {
	id, hasID := parseBookID(book.ID)
	return heapItem{
		book:      book,
		sourceIdx: sourceIdx,
		bookIdx:   bookIdx,
		sortID:    id,
		hasID:     hasID,
	}
}

func parseBookID(raw string) (int64, bool) {
	id, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil {
		return 0, false
	}
	return id, true
}
