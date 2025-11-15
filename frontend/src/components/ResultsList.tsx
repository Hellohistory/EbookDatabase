// path: frontend/src/components/ResultsList.tsx
import { Link, useNavigate } from 'react-router-dom'
import BookItem from './BookItem'
import type { Book } from '../types/Book'

type Props = {
  books: Book[]
}

const ResultsList = ({ books }: Props) => {
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
      <div className="rounded-3xl border border-dashed border-primary/20 bg-white px-6 py-12 text-center shadow-sm ring-1 ring-gray-100 sm:px-10 sm:py-16">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-16 sm:w-16">
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
        <h2 className="mt-6 text-base font-semibold text-gray-900 sm:text-lg">没有找到匹配的结果</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          可以尝试更换关键词、减少过滤条件，或稍后再试。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex w-full items-center justify-center rounded-lg border border-primary px-5 py-2 font-semibold text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            返回上一页
          </button>
          <Link
            to="/"
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-2 font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            回到检索首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {books.map((book) => (
        <BookItem key={`${book.source}-${book.id}`} book={book} />
      ))}
    </div>
  )
}

export default ResultsList
