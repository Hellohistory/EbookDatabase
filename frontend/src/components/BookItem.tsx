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
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl md:flex-row">
      {coverUrl && (
        <div className="relative aspect-[3/4] w-full bg-gray-100 md:w-40 lg:w-44">
          <img
            src={coverUrl}
            alt={`${book.title || '未命名'} 封面`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{book.title || '未命名'}</h2>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {authorsText && <p>作者：{authorsText}</p>}
            {book.publisher && <p>出版商：{book.publisher}</p>}
          </div>
          {book.description && (
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{book.description}</p>
          )}
          {hasTags && (
            <div className="mt-4 flex flex-wrap gap-2">
              {book.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="text-xs text-gray-500">来源：{book.source}</span>
          {book.can_download && (
            <a
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
