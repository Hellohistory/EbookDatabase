// path: frontend/src/components/ResultsList.tsx
import { Link, useNavigate } from 'react-router-dom'
import BookItem from './BookItem'
import BookListItem from './BookListItem'
import type { Book } from '../types/Book'

type DisplayMode = 'grid' | 'list'

type Props = {
  books: Book[]
  displayMode?: DisplayMode
  showCovers?: boolean
}

const ResultsList = ({ books, displayMode = 'grid', showCovers = true }: Props) => {
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
  const listClassName =
    displayMode === 'grid'
      ? 'grid gap-5 lg:grid-cols-2'
      : 'flex flex-col gap-4'

  return (
    <div className={listClassName}>
      {books.map((book) =>
        displayMode === 'grid' ? (
          <BookItem key={`${book.source}-${book.id}`} book={book} showCovers={showCovers} />
        ) : (
          <BookListItem key={`${book.source}-${book.id}`} book={book} showCovers={showCovers} />
        )
      )}
    </div>
  )
}

export default ResultsList
