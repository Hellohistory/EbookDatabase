// path: frontend/src/components/Pagination.jsx
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'

const baseButtonClasses =
  'inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'

const Pagination = ({ totalPages }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [jumpValue, setJumpValue] = useState('')

  const currentPage = useMemo(() => {
    const page = parseInt(searchParams.get('page') || '1', 10)
    return Number.isNaN(page) || page < 1 ? 1 : page
  }, [searchParams])

  const pages = useMemo(() => {
    if (totalPages <= 1) {
      return []
    }
    const range = []
    for (let offset = -2; offset <= 2; offset += 1) {
      const page = currentPage + offset
      if (page > 0 && page <= totalPages) {
        range.push(page)
      }
    }
    return range
  }, [currentPage, totalPages])

  if (totalPages <= 1) {
    return null
  }

  const updatePage = (page) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(page))
    setSearchParams(next)
  }

  const handleJump = () => {
    const value = parseInt(jumpValue, 10)
    if (Number.isNaN(value) || value < 1 || value > totalPages) {
      toast.error('请输入有效的页数。')
      return
    }
    updatePage(value)
  }

  return (
    <nav aria-label="分页导航" className="mt-8 flex flex-col items-center gap-4">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <button
            type="button"
            className={`${baseButtonClasses} ${
              currentPage === 1
                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                : 'border-gray-300 bg-white text-gray-700 hover:border-primary hover:text-primary'
            }`}
            onClick={() => updatePage(1)}
            disabled={currentPage === 1}
          >
            首页
          </button>
        </li>
        {pages.map((page) => {
          const isActive = currentPage === page
          return (
            <li key={page}>
              <button
                type="button"
                className={`${baseButtonClasses} ${
                  isActive
                    ? 'border-primary bg-primary text-white shadow'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-primary hover:text-primary'
                }`}
                onClick={() => updatePage(page)}
              >
                {page}
              </button>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            className={`${baseButtonClasses} ${
              currentPage === totalPages
                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                : 'border-gray-300 bg-white text-gray-700 hover:border-primary hover:text-primary'
            }`}
            onClick={() => updatePage(totalPages)}
            disabled={currentPage === totalPages}
          >
            末页
          </button>
        </li>
      </ul>
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <label htmlFor="jump-to-page" className="font-medium">
          跳转到页数
        </label>
        <input
          id="jump-to-page"
          type="text"
          value={jumpValue}
          onChange={(event) => setJumpValue(event.target.value)}
          className="h-9 w-20 rounded-md border border-gray-300 px-2 text-center shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button type="button" className={`${baseButtonClasses} border-primary bg-primary text-white`} onClick={handleJump}>
          跳转
        </button>
      </div>
    </nav>
  )
}

export default Pagination
