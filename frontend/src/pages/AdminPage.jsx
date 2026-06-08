// path: frontend/src/pages/AdminPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useGlobalStore from '../store/useGlobalStore'
import { buildApiUrl } from '../utils/api'

const emptyDatasource = () => ({
  name: '',
  type: 'calibre',
  path: ''
})

const fieldOptions = [
  { value: 'title', label: '标题' },
  { value: 'author', label: '作者' },
  { value: 'publisher', label: '出版社' },
  { value: 'publishdate', label: '出版时间' },
  { value: 'isbn', label: 'ISBN' },
  { value: 'sscode', label: 'SS码' },
  { value: 'dxid', label: 'DXID' }
]

const inputClassName =
  'field-control block'

const buttonPrimaryClassName =
  'btn-primary disabled:cursor-not-allowed disabled:opacity-60'

const buttonSecondaryClassName =
  'btn-secondary'

const buttonDangerClassName = 'btn-danger'

const labelClassName = 'block text-xs font-bold uppercase tracking-wide text-[var(--muted)]'

const AdminPage = () => {
  const navigate = useNavigate()
  const token = useGlobalStore((state) => state.token)
  const logout = useGlobalStore((state) => state.logout)
  const fetchSettings = useGlobalStore((state) => state.fetchSettings)

  const [pageSize, setPageSize] = useState('')
  const [defaultSearchField, setDefaultSearchField] = useState('title')
  const [adminPassword, setAdminPassword] = useState('')
  const [corsAllowedOrigins, setCorsAllowedOrigins] = useState('')
  const [datasources, setDatasources] = useState([emptyDatasource()])
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('success')
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadConfig = async () => {
    if (!token) {
      return
    }
    setLoadingConfig(true)
    try {
      const response = await fetch(buildApiUrl('/api/v1/admin/config'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!response.ok) {
        throw new Error('无法获取配置')
      }
      const data = await response.json()
      setPageSize(String(data.pageSize ?? data.page_size ?? ''))
      setDefaultSearchField(String(data.defaultSearchField ?? 'title'))
      setAdminPassword(String(data.adminPassword ?? ''))
      setCorsAllowedOrigins(Array.isArray(data.corsAllowedOrigins) ? data.corsAllowedOrigins.join('\n') : '')
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
      setMessage(error instanceof Error ? error.message : '读取配置失败')
      setMessageType('error')
    } finally {
      setLoadingConfig(false)
    }
  }

  useEffect(() => {
    void loadConfig()
  }, [token])

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
    if (!token) {
      return
    }
    setSaving(true)
    setMessage(null)

    const payload = {
      pageSize,
      defaultSearchField,
      adminPassword,
      corsAllowedOrigins: corsAllowedOrigins
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      datasources: datasources.map((item) => ({
        name: item.name.trim(),
        type: item.type.trim(),
        path: item.path.trim()
      }))
    }

    try {
      const response = await fetch(buildApiUrl('/api/v1/admin/config'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        throw new Error('保存配置失败')
      }
      setMessage('配置已保存')
      setMessageType('success')
      await fetchSettings()
      await loadConfig()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存配置失败')
      setMessageType('error')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell min-h-screen px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="meta-label">Admin Console</p>
            <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">后台管理</h1>
          </div>
          <button type="button" className={buttonSecondaryClassName} onClick={handleLogout}>
            登出
          </button>
        </div>

        <div className="surface p-5 sm:p-6">
          {loadingConfig ? (
            <div className="py-10 text-center text-sm font-semibold text-[var(--muted)]">正在读取配置，请稍候...</div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
              <section className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-ink">系统参数</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">控制默认检索行为和后台访问。</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pageSize" className={labelClassName}>
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
                    <label htmlFor="defaultSearchField" className={labelClassName}>
                      默认字段
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
                  <div className="sm:col-span-2">
                    <label htmlFor="adminPassword" className={labelClassName}>
                      管理员密码
                    </label>
                    <input
                      id="adminPassword"
                      name="adminPassword"
                      type="text"
                      value={adminPassword}
                      onChange={(event) => setAdminPassword(event.target.value)}
                      className={`${inputClassName} mt-2`}
                      placeholder="明文密码或 bcrypt 哈希"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="corsAllowedOrigins" className={labelClassName}>
                      CORS 白名单
                    </label>
                    <textarea
                      id="corsAllowedOrigins"
                      name="corsAllowedOrigins"
                      rows={4}
                      value={corsAllowedOrigins}
                      onChange={(event) => setCorsAllowedOrigins(event.target.value)}
                      className={`${inputClassName} mt-2`}
                      placeholder="每行一个 origin，例如 http://localhost:5173"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-ink">数据源</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">当前 {datasources.length} 个数据源。</p>
                  </div>
                  <button type="button" className={buttonSecondaryClassName} onClick={handleAddDatasource}>
                    新增数据源
                  </button>
                </div>

                <div className="space-y-3">
                  {datasources.map((item, index) => (
                    <div
                      key={index}
                      className="surface-flat grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_150px_76px] lg:items-end"
                    >
                      <div>
                        <label className={labelClassName}>名称</label>
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
                        <label className={labelClassName}>类型</label>
                        <select
                          value={item.type}
                          onChange={(event) => handleDatasourceChange(index, 'type', event.target.value)}
                          className={`${inputClassName} mt-2`}
                        >
                          <option value="calibre">Calibre</option>
                          <option value="legacy_db">Legacy DB</option>
                        </select>
                      </div>
                      <button type="button" className={buttonDangerClassName} onClick={() => handleRemoveDatasource(index)}>
                        删除
                      </button>
                      <div className="lg:col-span-3">
                        <label className={labelClassName}>路径</label>
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
                  ))}
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" className={`${buttonSecondaryClassName} w-full sm:w-auto`} onClick={loadConfig} disabled={saving}>
                重置
              </button>
              <button type="submit" className={`${buttonPrimaryClassName} w-full sm:w-auto`} disabled={saving}>
                {saving ? '保存中…' : '保存配置'}
              </button>
            </div>
            </form>
          )}

          {message && (
            <div
              className={`mt-6 rounded-md border px-4 py-3 text-sm ${
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
    </div>
  )
}

export default AdminPage
