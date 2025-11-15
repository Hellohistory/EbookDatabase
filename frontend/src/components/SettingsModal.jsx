// path: frontend/src/components/SettingsModal.jsx
import { useEffect, useState } from 'react'
import useGlobalStore from '../store/useGlobalStore'

const emptyDatasource = () => ({
  name: '',
  type: 'calibre',
  path: ''
})

const SettingsModal = ({ isOpen, onClose }) => {
  const fetchSettings = useGlobalStore((state) => state.fetchSettings)
  const [pageSize, setPageSize] = useState('')
  const [defaultSearchField, setDefaultSearchField] = useState('title')
  const [datasources, setDatasources] = useState([emptyDatasource()])
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('success')
  const [saving, setSaving] = useState(false)

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/v1/settings')
      if (!response.ok) {
        throw new Error('无法获取设置')
      }
      const data = await response.json()
      setPageSize(String(data.pageSize ?? data.page_size ?? ''))
      setDefaultSearchField(String(data.defaultSearchField ?? 'title'))
      if (Array.isArray(data.datasources) && data.datasources.length > 0) {
        setDatasources(
          data.datasources.map((item) => ({
            name: item.name ?? '',
            type: item.type ?? 'calibre',
            path: item.path ?? ''
          }))
        )
      } else {
        setDatasources([emptyDatasource()])
      }
      setMessage(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '读取设置失败')
      setMessageType('error')
    }
  }

  useEffect(() => {
    if (isOpen) {
      void loadSettings()
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleOverlayClick = (event) => {
    if (event.target.id === 'settings-modal') {
      onClose()
    }
  }

  const handleDatasourceChange = (index, field, value) => {
    setDatasources((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleAddDatasource = () => {
    setDatasources((prev) => [...prev, emptyDatasource()])
  }

  const handleRemoveDatasource = (index) => {
    setDatasources((prev) => {
      if (prev.length === 1) {
        return prev
      }
      return prev.filter((_, idx) => idx !== index)
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    const payload = {
      pageSize,
      defaultSearchField,
      datasources: datasources.map((item) => ({
        name: item.name.trim(),
        type: item.type.trim(),
        path: item.path.trim()
      }))
    }

    try {
      const response = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        throw new Error('保存设置失败')
      }
      setMessage('设置已保存')
      setMessageType('success')
      await fetchSettings()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存设置失败')
      setMessageType('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div id="settings-modal" className="modal" onClick={handleOverlayClick}>
      <div className="modal-content">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        <h2>数据源管理</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <label htmlFor="pageSize">每页数量</label>
          <input
            id="pageSize"
            name="pageSize"
            type="number"
            min="1"
            value={pageSize}
            onChange={(event) => setPageSize(event.target.value)}
          />

          <label htmlFor="defaultSearchField">默认搜索字段</label>
          <select
            id="defaultSearchField"
            name="defaultSearchField"
            value={defaultSearchField}
            onChange={(event) => setDefaultSearchField(event.target.value)}
          >
            <option value="title">标题</option>
            <option value="author">作者</option>
            <option value="publisher">出版社</option>
            <option value="isbn">ISBN</option>
            <option value="tags">标签</option>
          </select>

          <div className="datasource-section">
            <div className="datasource-header">
              <h3>数据源列表</h3>
              <button type="button" className="custom-button" onClick={handleAddDatasource}>
                新增数据源
              </button>
            </div>
            {datasources.map((item, index) => (
              <div key={index} className="datasource-item">
                <div className="datasource-field">
                  <label>名称</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(event) => handleDatasourceChange(index, 'name', event.target.value)}
                    placeholder="展示用名称"
                    required
                  />
                </div>
                <div className="datasource-field">
                  <label>类型</label>
                  <select
                    value={item.type}
                    onChange={(event) => handleDatasourceChange(index, 'type', event.target.value)}
                  >
                    <option value="calibre">Calibre</option>
                    <option value="legacy_db">Legacy DB</option>
                  </select>
                </div>
                <div className="datasource-field">
                  <label>路径</label>
                  <input
                    type="text"
                    value={item.path}
                    onChange={(event) => handleDatasourceChange(index, 'path', event.target.value)}
                    placeholder="书库根路径或数据库文件"
                    required
                  />
                </div>
                <button type="button" className="custom-delete-btn" onClick={() => handleRemoveDatasource(index)}>
                  删除
                </button>
              </div>
            ))}
          </div>

          <button type="submit" className="custom-button" disabled={saving}>
            {saving ? '保存中…' : '保存设置'}
          </button>
        </form>
        {message && (
          <div className={`custom-alert ${messageType === 'success' ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsModal
