// path: frontend/src/pages/ResultsPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CopyTools from '../components/CopyTools'
import Pagination from '../components/Pagination'
import ResultsList from '../components/ResultsList'
import type { Book } from '../types/Book'

interface ResultItem {
  key: string
  book: Book
}

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

const createItemKey = (book: Book, index: number): string => {
  const base = book.second_pass_code || book.title || 'book'
  return `${base}-${index}`
}

const ResultsPage = () => {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState<ResultItem[]>([])
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
        const books = Array.isArray(data.books) ? (data.books as Book[]) : []
        setItems(
          books.map((book, index) => ({
            key: createItemKey(book, index),
            book
          }))
        )
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
    <div className="results-container">
      <h1>检索结果</h1>
      <div className="button-container">
        <Link to="/" className="home-button">
          回到主页
        </Link>
      </div>
      {loading && <p>正在检索，请稍候…</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && (
        <>
          <p className="search-time">检索时间: {searchSeconds} 秒</p>
          <p className="total-records">检索到: {meta.totalRecords} 条内容</p>
          <p className="non-commercial-notice">
            本项目绝不可能盈利，也不会用于任何商业场景(此场景包括论坛币等虚拟货币)，如果存在，请不要犹豫，直接举报商家或发帖人。
          </p>
          {items.length > 0 ? (
            <CopyTools items={items}>
              <ResultsList items={items} />
            </CopyTools>
          ) : (
            <ResultsList items={items} />
          )}
          <Pagination totalPages={meta.totalPages} />
        </>
      )}
    </div>
  )
}

export default ResultsPage
