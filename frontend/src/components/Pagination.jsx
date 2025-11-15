// path: frontend/src/components/Pagination.jsx
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

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
      window.alert('请输入有效的页数')
      return
    }
    updatePage(value)
  }

  return (
    <>
      <ul className="pagination">
        <li className={`page-item${currentPage === 1 ? ' disabled' : ''}`}>
          <button type="button" className="page-link" onClick={() => updatePage(1)} disabled={currentPage === 1}>
            首页
          </button>
        </li>
        {pages.map((page) => (
          <li key={page} className={`page-item${currentPage === page ? ' active' : ''}`}>
            <button type="button" className="page-link" onClick={() => updatePage(page)}>
              {page}
            </button>
          </li>
        ))}
        <li className={`page-item${currentPage === totalPages ? ' disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => updatePage(totalPages)}
            disabled={currentPage === totalPages}
          >
            末页
          </button>
        </li>
      </ul>
      <div className="jump-container">
        <label htmlFor="jump-to-page">跳转到页数:</label>
        <input
          id="jump-to-page"
          type="text"
          value={jumpValue}
          onChange={(event) => setJumpValue(event.target.value)}
        />
        <button type="button" id="jump-button" onClick={handleJump}>
          跳转
        </button>
      </div>
    </>
  )
}

export default Pagination
