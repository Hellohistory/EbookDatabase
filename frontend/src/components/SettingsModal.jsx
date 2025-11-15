// path: frontend/src/components/SettingsModal.jsx
import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import useGlobalStore from '../store/useGlobalStore'

const emptyDatasource = () => ({
  name: '',
  type: 'calibre',
  path: ''
})

const fieldOptions = [
  { value: 'title', label: '标题' },
  { value: 'author', label: '作者' },
  { value: 'publisher', label: '出版社' },
  { value: 'isbn', label: 'ISBN' },
  { value: 'tags', label: '标签' }
]

const inputClassName =
  'block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary'

const buttonPrimaryClassName =
  'inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'

const buttonSecondaryClassName =
  'inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">数据源管理</h2>
            <p className="mt-1 text-sm text-gray-500">配置前端默认选项与书库列表</p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={onClose}
            aria-label="关闭设置"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="pageSize" className="block text-sm font-medium text-gray-700">
                每页数量
              </label>
              <input
                id="pageSize"
                name="pageSize"
                type="number"
                min="1"
                value={pageSize}
                onChange={(event) => setPageSize(event.target.value)}
                className={`${inputClassName} mt-2`}
              />
            </div>
            <div>
              <label htmlFor="defaultSearchField" className="block text-sm font-medium text-gray-700">
                默认搜索字段
              </label>
              <select
                id="defaultSearchField"
                name="defaultSearchField"
                value={defaultSearchField}
                onChange={(event) => setDefaultSearchField(event.target.value)}
                className={`${inputClassName} mt-2`}
              >
                {fieldOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">数据源列表</h3>
              <button type="button" className={buttonSecondaryClassName} onClick={handleAddDatasource}>
                新增数据源
              </button>
            </div>
            <div className="space-y-4">
              {datasources.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">名称</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(event) => handleDatasourceChange(index, 'name', event.target.value)}
                        placeholder="展示用名称"
                        required
                        className={`${inputClassName} mt-2`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">类型</label>
                      <select
                        value={item.type}
                        onChange={(event) => handleDatasourceChange(index, 'type', event.target.value)}
                        className={`${inputClassName} mt-2`}
                      >
                        <option value="calibre">Calibre</option>
                        <option value="legacy_db">Legacy DB</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">路径</label>
                      <input
                        type="text"
                        value={item.path}
                        onChange={(event) => handleDatasourceChange(index, 'path', event.target.value)}
                        placeholder="书库根路径或数据库文件"
                        required
                        className={`${inputClassName} mt-2`}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className={buttonSecondaryClassName}
                      onClick={() => handleRemoveDatasource(index)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" className={buttonSecondaryClassName} onClick={onClose}>
              取消
            </button>
            <button type="submit" className={buttonPrimaryClassName} disabled={saving}>
              {saving ? '保存中…' : '保存设置'}
            </button>
          </div>
        </form>

        {message && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              messageType === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-600'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsModal
