// path: frontend/src/pages/ResultsPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Pagination from '../components/Pagination'
import ResultsList from '../components/ResultsList'
import type { Book } from '../types/Book'

interface ResultsMeta {
  totalPages: number
  totalRecords: number
  searchTimeMs: number
}

interface SearchResponse {
  books?: Book[]
  totalPages?: number
  totalRecords?: number
  searchTimeMs?: number
}

const ResultsPage = () => {
  const [searchParams] = useSearchParams()
  const [books, setBooks] = useState<Book[]>([])
  const [meta, setMeta] = useState<ResultsMeta>({
    totalPages: 0,
    totalRecords: 0,
    searchTimeMs: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryString = useMemo(() => searchParams.toString(), [searchParams])

  useEffect(() => {
    const controller = new AbortController()
    const fetchResults = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/v1/search?${queryString}`, {
          signal: controller.signal
        })
        if (!response.ok) {
          throw new Error('检索失败，请稍后再试。')
        }
        const data = (await response.json()) as SearchResponse
        const bookList = Array.isArray(data.books) ? data.books : []
        setBooks(bookList)
        setMeta({
          totalPages: typeof data.totalPages === 'number' ? data.totalPages : 0,
          totalRecords: typeof data.totalRecords === 'number' ? data.totalRecords : 0,
          searchTimeMs: typeof data.searchTimeMs === 'number' ? data.searchTimeMs : 0
        })
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('检索失败，请稍后再试。')
        }
      } finally {
        setLoading(false)
      }
    }

    if (queryString) {
      void fetchResults()
    }

    return () => controller.abort()
  }, [queryString])

  const searchSeconds = (meta.searchTimeMs / 1000).toFixed(2)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-900">检索结果</h1>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary hover:text-primary"
        >
          回到主页
        </Link>
      </div>

      {loading && (
        <div className="rounded-2xl bg-white p-6 text-sm text-gray-600 shadow-sm ring-1 ring-gray-100">
          正在检索，请稍候…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>
                检索时间:
                <span className="ml-2 font-semibold text-gray-900">{searchSeconds}</span> 秒
              </span>
              <span>
                检索到:
                <span className="ml-2 font-semibold text-gray-900">{meta.totalRecords}</span> 条内容
              </span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-gray-500">
              本项目绝不可能盈利，也不会用于任何商业场景(此场景包括论坛币等虚拟货币)，如果存在，请不要犹豫，直接举报商家或发帖人。
            </p>
          </div>

          <ResultsList books={books} />
          <Pagination totalPages={meta.totalPages} />
        </div>
      )}
    </div>
  )
}

export default ResultsPage
