// path: frontend/src/components/SettingsModal.jsx
import { useEffect, useState } from 'react'
import useGlobalStore from '../store/useGlobalStore'

const SettingsModal = ({ isOpen, onClose }) => {
  const settings = useGlobalStore((state) => state.settings)
  const updateSettings = useGlobalStore((state) => state.updateSettings)
  const fetchSettings = useGlobalStore((state) => state.fetchSettings)

  const [formState, setFormState] = useState({
    pageSize: '',
    defaultSearchField: ''
  })
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('success')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormState({
        pageSize: settings?.pageSize ?? '',
        defaultSearchField: settings?.defaultSearchField ?? ''
      })
      setMessage(null)
    }
  }, [isOpen, settings])

  if (!isOpen) {
    return null
  }

  const handleOverlayClick = (event) => {
    if (event.target.id === 'settings-modal') {
      onClose()
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    const result = await updateSettings(formState)
    if (result.success) {
      setMessage('设置已保存')
      setMessageType('success')
      await fetchSettings()
    } else {
      setMessage(result.message || '保存设置失败')
      setMessageType('error')
    }
    setSaving(false)
  }

  return (
    <div id="settings-modal" className="modal" onClick={handleOverlayClick}>
      <div className="modal-content">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        <h2>设置</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <label htmlFor="pageSize">每页数量</label>
          <input
            id="pageSize"
            name="pageSize"
            type="number"
            min="1"
            value={formState.pageSize}
            onChange={handleChange}
          />
          <label htmlFor="defaultSearchField">默认搜索字段</label>
          <select
            id="defaultSearchField"
            name="defaultSearchField"
            value={formState.defaultSearchField}
            onChange={handleChange}
          >
            <option value="title">标题</option>
            <option value="author">作者</option>
            <option value="publisher">出版社</option>
            <option value="isbn">ISBN</option>
            <option value="identifier">Identifier</option>
          </select>
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
