// path: frontend/src/components/BookListItem.tsx
import type { Book } from '../types/Book'

type Props = {
  book: Book
  showCovers?: boolean
}

const joinValues = (values?: string[]) => {
  if (!values || values.length === 0) {
    return ''
  }
  return values.filter((item) => item && item.trim().length > 0).join('，')
}

const BookListItem = ({ book, showCovers = true }: Props) => {
  const authorsText = joinValues(book.authors)
  const coverUrl = book.has_cover
    ? `/api/v1/cover?source=${encodeURIComponent(book.source)}&id=${encodeURIComponent(book.id)}`
    : null
  const downloadUrl = `/api/v1/download?source=${encodeURIComponent(book.source)}&id=${encodeURIComponent(book.id)}`

  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:flex-row sm:items-center sm:gap-6">
      {showCovers && (
        <div
          className={`relative flex h-24 w-full max-w-[90px] items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-xs font-medium text-gray-400 sm:h-28 sm:max-w-[110px] ${
            coverUrl ? '' : 'px-2 text-center'
          }`}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={`${book.title || '未命名'} 封面`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span>暂无封面</span>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{book.title || '未命名'}</h3>
          {authorsText && <p className="text-sm text-gray-600">作者：{authorsText}</p>}
          {book.publisher && <p className="text-sm text-gray-600">出版商：{book.publisher}</p>}
        </div>
        <div className="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>来源：{book.source}</span>
          {book.can_download && (
            <a
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              下载
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default BookListItem
