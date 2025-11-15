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
  'inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'

const BasicSearchForm = () => {
  const navigate = useNavigate()
  const settings = useGlobalStore((state) => state.settings)

  const [field, setField] = useState('title')
  const [query, setQuery] = useState('')
  const [fuzzy, setFuzzy] = useState(true)

  useEffect(() => {
    if (settings?.defaultSearchField) {
      setField(settings.defaultSearchField)
    }
  }, [settings])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!query.trim()) {
      toast.error('请输入关键词。')
      return
    }
    const params = new URLSearchParams()
    params.append('query', query.trim())
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
        <input
          type="text"
          id="basicQuery"
          name="query"
          placeholder="请输入关键词"
          className={inputClasses}
          required
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className={buttonClasses}>
          搜索
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600">
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
