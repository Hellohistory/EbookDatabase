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
    <article className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
      {showCovers && (
        <div
          className={`relative flex h-24 w-full max-w-[86px] items-center justify-center overflow-hidden rounded-md bg-[#e7dfcf] text-xs font-bold text-[var(--muted)] sm:h-28 sm:max-w-[104px] ${
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
          <h3 className="text-base font-bold text-ink">{book.title || '未命名'}</h3>
          {authorsText && <p className="text-sm text-[var(--muted)]">作者：{authorsText}</p>}
          {book.publisher && <p className="text-sm text-[var(--muted)]">出版商：{book.publisher}</p>}
        </div>
        <div className="flex flex-col gap-2 text-xs font-semibold text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>来源：{book.source}</span>
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
