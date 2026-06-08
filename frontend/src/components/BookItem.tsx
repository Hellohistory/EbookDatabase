// path: frontend/src/components/BookItem.tsx
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

const BookItem = ({ book, showCovers = true }: Props) => {
  const authorsText = joinValues(book.authors)
  const hasTags = Array.isArray(book.tags) && book.tags.length > 0
  const coverUrl = book.has_cover
    ? buildApiUrl(`/api/v1/cover?source=${encodeURIComponent(book.source)}&id=${encodeURIComponent(book.id)}`)
    : null
  const downloadUrl = buildApiUrl(
    `/api/v1/download?source=${encodeURIComponent(book.source)}&id=${encodeURIComponent(book.id)}`
  )
  const coverWrapperClassName = [
    'relative aspect-[2/3] w-full md:w-1/3 md:min-w-[168px] flex items-center justify-center bg-[#e7dfcf]',
    coverUrl ? '' : 'text-sm font-bold text-[var(--muted)]'
  ]
    .filter(Boolean)
    .join(' ')
  const contentWrapperClassName = [
    'flex flex-1 flex-col justify-between p-5',
    showCovers ? 'md:w-2/3' : 'w-full'
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className="surface flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 md:flex-row">
      {showCovers && (
        <div className={coverWrapperClassName}>
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
      <div className={contentWrapperClassName}>
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="line-clamp-2 text-lg font-bold text-ink">{book.title || '未命名'}</h2>
            <div className="space-y-1 text-sm text-[var(--muted)]">
              {authorsText && <p>作者：{authorsText}</p>}
              {book.publisher && <p>出版商：{book.publisher}</p>}
            </div>
          </div>
          {book.description && (
            <p className="line-clamp-4 text-sm leading-relaxed text-[var(--muted)]">{book.description}</p>
          )}
          {hasTags && (
            <div className="flex flex-wrap gap-2">
              {book.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-[var(--line)] bg-white/60 px-2.5 py-1 text-xs font-bold text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--line)] pt-4 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <span className="font-semibold text-[var(--muted)]">来源：{book.source}</span>
          {book.can_download && (
            <a
              className="btn-primary"
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

export default BookItem
