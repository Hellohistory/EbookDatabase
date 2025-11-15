// path: frontend/src/components/BookItem.tsx
import type { Book } from '../types/Book'

type Props = {
  book: Book
}

const joinValues = (values?: string[]) => {
  if (!values || values.length === 0) {
    return ''
  }
  return values.filter((item) => item && item.trim().length > 0).join('，')
}

const BookItem = ({ book }: Props) => {
  const authorsText = joinValues(book.authors)
  const hasTags = Array.isArray(book.tags) && book.tags.length > 0
  const coverUrl = book.has_cover
    ? `/api/v1/cover?source=${encodeURIComponent(book.source)}&id=${encodeURIComponent(book.id)}`
    : null
  const downloadUrl = `/api/v1/download?source=${encodeURIComponent(book.source)}&id=${encodeURIComponent(book.id)}`

  return (
    <div className="book-container">
      {coverUrl && (
        <div className="book-cover-wrapper">
          <img src={coverUrl} alt={`${book.title} 封面`} className="book-cover" loading="lazy" />
        </div>
      )}
      <div className="book-content">
        <h2 className="book-title">{book.title || '未命名'}</h2>
        <div className="book-details">
          {authorsText && (
            <p>
              <strong>作者:</strong> {authorsText}
            </p>
          )}
          {book.publisher && (
            <p>
              <strong>出版商:</strong> {book.publisher}
            </p>
          )}
          {book.description && <p className="book-description">{book.description}</p>}
          {hasTags && (
            <div className="book-tags">
              {book.tags?.map((tag) => (
                <span key={tag} className="book-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="book-footer">
          <span className="book-source">来自：{book.source}</span>
          {book.can_download && (
            <a className="download-button" href={downloadUrl} target="_blank" rel="noopener noreferrer">
              下载
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookItem
