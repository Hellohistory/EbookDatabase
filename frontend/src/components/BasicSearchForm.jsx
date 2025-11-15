// path: frontend/src/components/BasicSearchForm.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import useGlobalStore from '../store/useGlobalStore'

const selectClasses =
  'w-full rounded-lg border-gray-300 text-sm text-gray-700 shadow-sm focus:border-primary focus:ring-primary md:w-40'

const inputClasses =
  'w-full flex-1 rounded-lg border-gray-300 text-sm text-gray-700 shadow-sm focus:border-primary focus:ring-primary'

const buttonClasses =
  'inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

const BasicSearchForm = () => {
  const navigate = useNavigate()
  const settings = useGlobalStore((state) => state.settings)

  const [field, setField] = useState('title')
  const [query, setQuery] = useState('')
  const [fuzzy, setFuzzy] = useState(true)
  const [loading, setLoading] = useState(false)
  const [queryError, setQueryError] = useState(null)

  const validateQuery = (value, currentField = field) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return '此项不能为空'
    }
    if (currentField === 'isbn' && !/^\d+$/.test(trimmed)) {
      return 'ISBN 只能包含数字'
    }
    if (currentField === 'publishdate' && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return '出版时间需符合 YYYY-MM-DD 格式'
    }
    return null
  }

  useEffect(() => {
    if (settings?.defaultSearchField) {
      setField(settings.defaultSearchField)
    }
  }, [settings])

  useEffect(() => {
    if (!query) {
      setQueryError(null)
      return
    }

    setQueryError(validateQuery(query, field))
  }, [field, query])

  const handleSubmit = (event) => {
    event.preventDefault()
    const validationMessage = validateQuery(query)

    if (validationMessage) {
      toast.error(validationMessage === '此项不能为空' ? '请输入关键词。' : validationMessage)
      setQueryError(validationMessage)
      setLoading(false)
      return
    }

    const trimmedQuery = query.trim()
    setQueryError(null)
    setLoading(true)
    const params = new URLSearchParams()
    params.append('query', trimmedQuery)
    if (field) {
      params.append('field', field)
    }
    if (fuzzy) {
      params.append('fuzzy', 'true')
    }
    navigate(`/search?${params.toString()}`)
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
        <select
          id="basicSelectedField"
          name="field"
          className={selectClasses}
          value={field}
          onChange={(event) => setField(event.target.value)}
        >
          <option value="title">书名</option>
          <option value="author">作者</option>
          <option value="publisher">出版商</option>
          <option value="tags">标签</option>
          <option value="publishdate">出版时间</option>
          <option value="isbn">ISBN码</option>
          <option value="sscode">SS码</option>
          <option value="dxid">DXID</option>
        </select>
        <div className="flex flex-1 flex-col">
          <input
            type="text"
            id="basicQuery"
            name="query"
            placeholder={field === 'publishdate' ? '请输入 YYYY-MM-DD 格式的日期' : '请输入关键词'}
            className={`${inputClasses} ${
              queryError ? 'border-red-500 ring-2 ring-red-500 focus:border-red-500 focus:ring-red-500' : ''
            }`}
            required
            value={query}
            aria-invalid={queryError ? 'true' : 'false'}
            inputMode={field === 'isbn' ? 'numeric' : 'text'}
            pattern={
              field === 'isbn'
                ? '\d+'
                : field === 'publishdate'
                ? '\d{4}-\d{2}-\d{2}'
                : undefined
            }
            onChange={(event) => {
              const nextValue = event.target.value
              setQuery(nextValue)
              if (queryError) {
                setQueryError(validateQuery(nextValue))
              }
            }}
            onBlur={(event) => {
              setQueryError(validateQuery(event.target.value))
            }}
          />
          {queryError && <p className="mt-1 text-xs text-red-600">{queryError}</p>}
        </div>
        <button
          type="submit"
          className={`${buttonClasses} ${loading ? 'gap-2' : ''} w-full md:w-auto`}
          disabled={loading}
          aria-busy={loading}
        >
          {loading && (
            <svg
              className="h-4 w-4 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {loading ? '检索中…' : '搜索'}
        </button>
      </div>
      <label className="flex items-center justify-between gap-2 text-sm text-gray-600 sm:justify-start">
        <input
          type="checkbox"
          id="basicFuzzy"
          name="fuzzy"
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          checked={fuzzy}
          onChange={(event) => setFuzzy(event.target.checked)}
        />
        模糊搜索
      </label>
    </form>
  )
}

export default BasicSearchForm
