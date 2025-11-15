// Package models path: models/book.go
package models

import (
	"errors"
	"fmt"
)

// ErrUnknownColumn 表示扫描结果中包含了 Book 结构未声明的列。
var ErrUnknownColumn = errors.New("unknown column")

// Book 表示 books 表中的单条记录。
type Book struct {
	ID             *int64  `json:"id,omitempty"`
	Title          *string `json:"title,omitempty"`
	Author         *string `json:"author,omitempty"`
	Publisher      *string `json:"publisher,omitempty"`
	PublishDate    *string `json:"publish_date,omitempty"`
	PageCount      *int64  `json:"page_count,omitempty"`
	ISBN           *string `json:"isbn,omitempty"`
	SSCode         *string `json:"ss_code,omitempty"`
	DXID           *string `json:"dxid,omitempty"`
	SecondPassCode *string `json:"second_pass_code,omitempty"`
	Size           *string `json:"size,omitempty"`
	FileType       *string `json:"file_type,omitempty"`
}

// SetField 按列名写入字段。
func (b *Book) SetField(column string, value any) error {
	if value == nil {
		return nil
	}
	switch column {
	case "id":
		if v, ok := asInt64(value); ok {
			b.ID = &v
			return nil
		}
	case "title":
		if v, ok := asString(value); ok {
			b.Title = &v
			return nil
		}
	case "author":
		if v, ok := asString(value); ok {
			b.Author = strPtr(v)
			return nil
		}
	case "publisher":
		if v, ok := asString(value); ok {
			b.Publisher = strPtr(v)
			return nil
		}
	case "publish_date":
		if v, ok := asString(value); ok {
			b.PublishDate = strPtr(v)
			return nil
		}
	case "page_count":
		if v, ok := asInt64(value); ok {
			b.PageCount = intPtr(v)
			return nil
		}
	case "ISBN", "isbn":
		if v, ok := asString(value); ok {
			b.ISBN = strPtr(v)
			return nil
		}
	case "SS_code", "ss_code":
		if v, ok := asString(value); ok {
			b.SSCode = strPtr(v)
			return nil
		}
	case "dxid":
		if v, ok := asString(value); ok {
			b.DXID = strPtr(v)
			return nil
		}
	case "second_pass_code":
		if v, ok := asString(value); ok {
			b.SecondPassCode = strPtr(v)
			return nil
		}
	case "size":
		if v, ok := asString(value); ok {
			b.Size = strPtr(v)
			return nil
		}
	case "file_type":
		if v, ok := asString(value); ok {
			b.FileType = strPtr(v)
			return nil
		}
	default:
		return ErrUnknownColumn
	}
	return fmt.Errorf("列 %s 的值类型不受支持", column)
}

func strPtr(v string) *string {
	return &v
}

func intPtr(v int64) *int64 {
	return &v
}

func asString(value any) (string, bool) {
	switch v := value.(type) {
	case nil:
		return "", false
	case string:
		return v, true
	case []byte:
		return string(v), true
	case fmt.Stringer:
		return v.String(), true
	default:
		return "", false
	}
}

func asInt64(value any) (int64, bool) {
	switch v := value.(type) {
	case nil:
		return 0, false
	case int64:
		return v, true
	case int32:
		return int64(v), true
	case int:
		return int64(v), true
	case []byte:
		var i int64
		if _, err := fmt.Sscan(string(v), &i); err == nil {
			return i, true
		}
		return 0, false
	default:
		return 0, false
	}
}
