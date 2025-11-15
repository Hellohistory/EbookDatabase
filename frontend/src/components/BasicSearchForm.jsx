// path: frontend/src/components/BasicSearchForm.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import useGlobalStore from '../store/useGlobalStore'

const BasicSearchForm = () => {
  const navigate = useNavigate()
  const selectedDBs = useGlobalStore((state) => state.selectedDBs)
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
    selectedDBs.forEach((db) => params.append('db_names', db))
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
    <form className="mt-4" onSubmit={handleSubmit}>
      <div className="mb-3 d-flex align-items-center">
        <label htmlFor="basicSelectedField" className="form-label me-2"></label>
        <select
          id="basicSelectedField"
          name="field"
          className="form-select me-2"
          style={{ width: 'auto' }}
          value={field}
          onChange={(event) => setField(event.target.value)}
        >
          <option value="title">书名</option>
          <option value="author">作者</option>
          <option value="publisher">出版商</option>
          <option value="publishdate">出版时间</option>
          <option value="isbn">ISBN码</option>
          <option value="sscode">SS码</option>
          <option value="dxid">DXID</option>
        </select>
        <label htmlFor="basicQuery" className="form-label me-2"></label>
        <input
          type="text"
          id="basicQuery"
          name="query"
          placeholder="请输入关键词"
          className="form-control"
          style={{ flexGrow: 1 }}
          required
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="mb-3 form-check">
        <input
          type="checkbox"
          id="basicFuzzy"
          name="fuzzy"
          className="form-check-input"
          checked={fuzzy}
          onChange={(event) => setFuzzy(event.target.checked)}
        />
        <label htmlFor="basicFuzzy" className="form-check-label">
          模糊搜索
        </label>
      </div>
      <button type="submit" className="custom-button">
        搜索
      </button>
    </form>
  )
}

export default BasicSearchForm
