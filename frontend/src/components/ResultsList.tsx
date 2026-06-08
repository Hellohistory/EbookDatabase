// path: frontend/src/components/ResultsList.tsx
import { Link, useNavigate } from 'react-router-dom'
import BookItem from './BookItem'
import BookListItem from './BookListItem'
import type { Book } from '../types/Book'
import { buildApiUrl } from '../utils/api'

export type DisplayMode = 'compact' | 'detail' | 'table' | 'card'
export type ResultDensity = 'compact' | 'comfortable'

type Props = {
  books: Book[]
  displayMode?: DisplayMode
  density?: ResultDensity
  showCovers?: boolean
  showIdentifiers?: boolean
}

const joinValues = (values?: string[]) => {
  if (!values || values.length === 0) {
    return ''
  }
  return values.filter((item) => item && item.trim().length > 0).join('，')
}

const metadataItems = (book: Book, showIdentifiers: boolean) => {
  const items = [
    ['作者', joinValues(book.authors)],
    ['出版社', book.publisher],
    ['出版时间', book.publish_date],
    ['页数', book.page_count ? String(book.page_count) : '']
  ]

  if (showIdentifiers) {
    items.push(['ISBN', book.isbn], ['SS码', book.ss_code], ['DXID', book.dxid])
  }

  return items.filter(([, value]) => value && String(value).trim().length > 0)
}

const sourceBadgeClassName =
  'rounded-md border border-[var(--line)] bg-slate-50 px-2 py-1 text-xs font-semibold text-[var(--muted)]'

const DetailItem = ({
  book,
  density = 'compact',
  showIdentifiers = true
}: {
  book: Book
  density?: ResultDensity
  showIdentifiers?: boolean
}) => {
  const downloadUrl = buildApiUrl(
    `/api/v1/download?source=${encodeURIComponent(book.source)}&id=${encodeURIComponent(book.id)}`
  )
  const paddingClassName = density === 'comfortable' ? 'p-5' : 'p-4'

  return (
    <article className={`surface ${paddingClassName}`}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink sm:text-lg">{book.title || '未命名'}</h3>
          <dl className="mt-3 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
            {metadataItems(book, showIdentifiers).map(([label, value]) => (
              <div key={`${label}-${value}`} className="min-w-0">
                <dt className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
                <dd className="mt-0.5 truncate text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          {book.description && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">{book.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-start gap-2 lg:justify-end">
          <span className={sourceBadgeClassName}>来源：{book.source}</span>
          {book.can_download && (
            <a className="btn-primary min-h-0 px-3 py-1.5 text-xs" href={downloadUrl} target="_blank" rel="noopener noreferrer">
              下载
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

const TableView = ({
  books,
  showIdentifiers = true
}: {
  books: Book[]
  showIdentifiers?: boolean
}) => {
  const columns = showIdentifiers
    ? ['书名', '作者', '出版社', '出版时间', 'ISBN', 'SS码', 'DXID', '来源']
    : ['书名', '作者', '出版社', '出版时间', '来源']

  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--line)] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="whitespace-nowrap px-4 py-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)] bg-white">
            {books.map((book) => (
              <tr key={`${book.source}-${book.id}`} className="align-top hover:bg-slate-50">
                <td className="min-w-[280px] px-4 py-3 font-semibold text-ink">{book.title || '未命名'}</td>
                <td className="min-w-[180px] px-4 py-3 text-[var(--muted)]">{joinValues(book.authors) || '-'}</td>
                <td className="min-w-[160px] px-4 py-3 text-[var(--muted)]">{book.publisher || '-'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{book.publish_date || '-'}</td>
                {showIdentifiers && (
                  <>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{book.isbn || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{book.ss_code || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{book.dxid || '-'}</td>
                  </>
                )}
                <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{book.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const ResultsList = ({
  books,
  displayMode = 'compact',
  density = 'compact',
  showCovers = false,
  showIdentifiers = true
}: Props) => {
  const navigate = useNavigate()

  if (!books.length) {
    const handleGoBack = () => {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        navigate(-1)
        return
      }
      navigate('/')
    }

    return (
      <div className="surface px-6 py-12 text-center sm:px-10 sm:py-14">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-[var(--line)] bg-white/70 text-primary sm:h-16 sm:w-16">
          <svg
            className="h-8 w-8 sm:h-9 sm:w-9"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12.75 4.5H6a1.5 1.5 0 00-1.5 1.5v11.25a.75.75 0 001.2.6l2.4-1.8 2.4 1.8a.75.75 0 001.2-.6V6a1.5 1.5 0 00-1.5-1.5z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.5 6.75h2.25A2.25 2.25 0 0118 9v9.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.5 15.75l2.25 2.25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.5 15.75a2.25 2.25 0 10-4.5 0 2.25 2.25 0 004.5 0z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mt-6 text-base font-bold text-ink sm:text-lg">没有找到匹配的结果</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          可以尝试更换关键词、减少过滤条件，或稍后再试。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row">
          <button
            type="button"
            onClick={handleGoBack}
            className="btn-secondary w-full sm:w-auto"
          >
            返回上一页
          </button>
          <Link
            to="/"
            className="btn-primary w-full sm:w-auto"
          >
            回到检索首页
          </Link>
        </div>
      </div>
    )
  }
  if (displayMode === 'table') {
    return <TableView books={books} showIdentifiers={showIdentifiers} />
  }

  const gapClassName = density === 'comfortable' ? 'gap-5' : 'gap-3'
  const listClassName = displayMode === 'card' ? `grid ${gapClassName} lg:grid-cols-2` : `flex flex-col ${gapClassName}`

  return (
    <div className={listClassName}>
      {books.map((book) => {
        if (displayMode === 'card') {
          return (
          <BookItem key={`${book.source}-${book.id}`} book={book} showCovers={showCovers} />
          )
        }
        if (displayMode === 'detail') {
          return (
            <DetailItem
              key={`${book.source}-${book.id}`}
              book={book}
              density={density}
              showIdentifiers={showIdentifiers}
            />
          )
        }
        return (
          <BookListItem key={`${book.source}-${book.id}`} book={book} showCovers={showCovers} />
        )
      })}
    </div>
  )
}

export default ResultsList
