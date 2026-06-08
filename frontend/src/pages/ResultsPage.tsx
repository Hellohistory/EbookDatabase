// path: frontend/src/pages/ResultsPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Pagination from '../components/Pagination'
import ResultsList from '../components/ResultsList'
import type { DisplayMode, ResultDensity } from '../components/ResultsList'
import useGlobalStore from '../store/useGlobalStore'
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

const displayModeOptions: Array<{ value: DisplayMode; label: string }> = [
  { value: 'compact', label: '紧凑' },
  { value: 'detail', label: '详情' },
  { value: 'table', label: '表格' },
  { value: 'card', label: '卡片' }
]

const densityOptions: Array<{ value: ResultDensity; label: string }> = [
  { value: 'compact', label: '紧凑' },
  { value: 'comfortable', label: '舒展' }
]

const segmentButtonClassName = (active: boolean) =>
  [
    'h-9 whitespace-nowrap rounded-md px-3 text-sm font-bold transition',
    active
      ? 'bg-[var(--accent)] text-white shadow-sm'
      : 'border border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:bg-slate-50 hover:text-ink'
  ]
    .filter(Boolean)
    .join(' ')

const ResultsPage = () => {
  const [searchParams] = useSearchParams()
  const settings = useGlobalStore((state) => state.settings)
  const [books, setBooks] = useState<Book[]>([])
  const [meta, setMeta] = useState<ResultsMeta>({
    totalPages: 0,
    totalRecords: 0,
    searchTimeMs: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('compact')
  const [density, setDensity] = useState<ResultDensity>('compact')
  const [showCovers, setShowCovers] = useState(false)
  const [showIdentifiers, setShowIdentifiers] = useState(true)

  const queryString = useMemo(() => searchParams.toString(), [searchParams])

  useEffect(() => {
    setDisplayMode(settings.resultDisplayMode ?? 'compact')
    setDensity(settings.resultDensity ?? 'compact')
    setShowCovers(settings.showCovers ?? false)
    setShowIdentifiers(settings.showIdentifiers ?? true)
  }, [settings.resultDisplayMode, settings.resultDensity, settings.showCovers, settings.showIdentifiers])

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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="meta-label">Results</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">检索结果</h1>
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
        <div className="space-y-5">
          <div className="surface p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-3 text-sm sm:grid-cols-3 xl:min-w-[480px]">
                <div>
                  <p className="meta-label">Time</p>
                  <p className="mt-1 text-base font-bold text-ink">{searchSeconds}s</p>
                </div>
                <div>
                  <p className="meta-label">Records</p>
                  <p className="mt-1 text-base font-bold text-ink">{meta.totalRecords}</p>
                </div>
                <div>
                  <p className="meta-label">Pages</p>
                  <p className="mt-1 text-base font-bold text-ink">{meta.totalPages}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end xl:justify-end">
                <div className="min-w-0">
                  <p className="meta-label mb-2">View</p>
                  <div className="flex flex-wrap gap-1 rounded-md border border-[var(--line)] bg-white p-1">
                    {displayModeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={segmentButtonClassName(displayMode === option.value)}
                        aria-pressed={displayMode === option.value}
                        onClick={() => setDisplayMode(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="meta-label mb-2">Density</p>
                  <div className="flex flex-wrap gap-1 rounded-md border border-[var(--line)] bg-white p-1">
                    {densityOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={segmentButtonClassName(density === option.value)}
                        aria-pressed={density === option.value}
                        onClick={() => setDensity(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-bold text-[var(--muted)]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--line)] text-primary focus:ring-primary"
                      checked={showCovers}
                      onChange={(event) => setShowCovers(event.target.checked)}
                    />
                    <span>封面</span>
                  </label>
                  <label className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-bold text-[var(--muted)]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--line)] text-primary focus:ring-primary"
                      checked={showIdentifiers}
                      onChange={(event) => setShowIdentifiers(event.target.checked)}
                    />
                    <span>标识</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <ResultsList
            books={books}
            displayMode={displayMode}
            density={density}
            showCovers={showCovers}
            showIdentifiers={showIdentifiers}
          />
          <Pagination totalPages={meta.totalPages} />
        </div>
      )}
    </div>
  )
}

export default ResultsPage
