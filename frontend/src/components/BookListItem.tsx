// path: frontend/src/components/BookListItem.tsx
import type { Book } from '../types/Book'
import { buildApiUrl } from '../utils/api'

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
    ? buildApiUrl(`/api/v1/cover?source=${encodeURIComponent(book.source)}&id=${encodeURIComponent(book.id)}`)
    : null
  const downloadUrl = buildApiUrl(
    `/api/v1/download?source=${encodeURIComponent(book.source)}&id=${encodeURIComponent(book.id)}`
  )

  return (
    <article className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
      {showCovers && (
        <div
          className={`relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-xs font-bold text-[var(--muted)] sm:h-28 sm:w-20 ${
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
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink">{book.title || '未命名'}</h3>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
            {authorsText && <span>作者：{authorsText}</span>}
            {book.publisher && <span>出版社：{book.publisher}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--muted)] sm:justify-end">
          <span className="rounded-md border border-[var(--line)] bg-slate-50 px-2 py-1">来源：{book.source}</span>
          {book.can_download && (
            <a
              className="btn-primary min-h-0 px-3 py-1.5 text-xs"
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
