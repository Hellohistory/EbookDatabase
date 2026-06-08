// path: frontend/src/pages/ResultsPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Pagination from '../components/Pagination'
import ResultsList from '../components/ResultsList'
import type { Book } from '../types/Book'
import { buildApiUrl } from '../utils/api'

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
        const response = await fetch(buildApiUrl(`/api/v1/search?${queryString}`), {
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
        const message = err instanceof Error ? err.message : '检索失败，请稍后再试。'
        setError(message)
        toast.error(message)
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
  const hasQuery = queryString.length > 0

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="meta-label">Results</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">检索结果</h1>
        </div>
        <Link
          to="/"
          className="btn-secondary w-full sm:w-auto"
        >
          回到主页
        </Link>
      </div>

      {!hasQuery && (
        <div className="surface p-8 text-sm font-semibold text-[var(--muted)]">当前没有检索参数。</div>
      )}

      {hasQuery && loading && (
        <div className="space-y-4">
          <div className="surface flex items-center justify-center gap-3 p-6 text-sm font-bold text-[var(--muted)]">
            <svg
              className="h-5 w-5 animate-spin text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>正在检索，请稍候…</span>
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="surface animate-pulse p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="h-24 w-full rounded-md bg-[#e7dfcf] sm:w-32" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-2/3 rounded bg-[#d8d0bf]" />
                    <div className="h-3 w-1/2 rounded bg-[#d8d0bf]" />
                    <div className="flex gap-2">
                      <div className="h-6 w-20 rounded bg-[#d8d0bf]" />
                      <div className="h-6 w-24 rounded bg-[#d8d0bf]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasQuery && error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {hasQuery && !loading && !error && (
        <div className="space-y-6">
          <div className="surface p-5">
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="meta-label">Time</p>
                <p className="mt-1 text-lg font-bold text-ink">{searchSeconds}s</p>
              </div>
              <div>
                <p className="meta-label">Records</p>
                <p className="mt-1 text-lg font-bold text-ink">{meta.totalRecords}</p>
              </div>
              <div>
                <p className="meta-label">Pages</p>
                <p className="mt-1 text-lg font-bold text-ink">{meta.totalPages}</p>
              </div>
            </div>
            <p className="mt-4 border-t border-[var(--line)] pt-4 text-xs leading-relaxed text-[var(--muted)]">
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
