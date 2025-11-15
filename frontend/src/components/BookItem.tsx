// path: frontend/src/components/BookItem.tsx
import { useCopyTools } from './CopyTools'
import type { Book } from '../types/Book'

interface Props {
  item: {
    key: string
    book: Book
  }
}

const formatFileSize = (sizeValue?: string | null): string | null => {
  if (!sizeValue) {
    return null
  }
  const trimmed = sizeValue.trim()
  if (!/^\d*(?:\.\d+)?$/.test(trimmed)) {
    return sizeValue
  }
  const numeric = Number.parseFloat(trimmed)
  if (Number.isNaN(numeric)) {
    return sizeValue
  }
  if (numeric <= 0) {
    return '0 Byte'
  }
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const
  const exponent = Math.floor(Math.log(numeric) / Math.log(1024))
  const index = Math.min(exponent, units.length - 1)
  const value = numeric / Math.pow(1024, index)
  return `${value.toFixed(2)} ${units[index]}`
}

const BookItem = ({ item }: Props) => {
  const { isSelected, toggleSelection, copySingle } = useCopyTools()
  const { book, key } = item

  const handleCheckboxChange = () => {
    toggleSelection(key)
  }

  const handleCopy = () => {
    void copySingle(key)
  }

  return (
    <div className="book-container">
      <div className="checkbox-container">
        <label>
          <input
            type="checkbox"
            className="copy-checkbox"
            checked={isSelected(key)}
            onChange={handleCheckboxChange}
          />
        </label>
      </div>
      <h2 className="book-title">{book.title || '未命名'}</h2>
      <div className="book-details">
        {book.author && (
          <p>
            <strong>作者:</strong> {book.author}
          </p>
        )}
        {book.publisher && (
          <p>
            <strong>出版商:</strong> {book.publisher}
          </p>
        )}
        {book.publish_date && (
          <p>
            <strong>出版日期:</strong> {book.publish_date}
          </p>
        )}
        {book.page_count && (
          <p>
            <strong>页数:</strong> {book.page_count}
          </p>
        )}
        {book.isbn && (
          <p>
            <strong>ISBN:</strong> {book.isbn}
          </p>
        )}
        {book.ss_code && (
          <p>
            <strong>SS码:</strong> {book.ss_code}
          </p>
        )}
        {book.dxid && (
          <p>
            <strong>DXID:</strong> {book.dxid}
          </p>
        )}
        {book.second_pass_code && (
          <p className="second-pass-code">
            <strong>秒传链接:</strong>{' '}
            <span className="actual-link">{book.second_pass_code}</span>
            <button type="button" className="copy-link-btn" onClick={handleCopy}>
              复制
            </button>
          </p>
        )}
        {book.size && (
          <p className="file-size">
            <strong>文件大小:</strong> {formatFileSize(book.size)}
          </p>
        )}
        {book.file_type && (
          <p>
            <strong>文件类型:</strong> {book.file_type}
          </p>
        )}
      </div>
    </div>
  )
}

export default BookItem
