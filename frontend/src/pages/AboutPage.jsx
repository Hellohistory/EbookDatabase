// path: frontend/src/pages/AboutPage.jsx
import { useEffect, useState } from 'react'

const tabs = [
  { id: 'content1', label: '耻辱柱' },
  { id: 'content2', label: 'EbookDataTools下载' },
  { id: 'content3', label: '更新日志' },
  { id: 'content4', label: '数据库下载' },
  { id: 'content5', label: '许可证' }
]

const AboutPage = () => {
  const [activeTab, setActiveTab] = useState('content1')
  const [contents, setContents] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadContent('content1')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadContent = async (id) => {
    if (contents[id]) {
      setActiveTab(id)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/v1/about-content?id=${id}`)
      if (!response.ok) {
        throw new Error('加载内容失败')
      }
      const text = await response.text()
      setContents((prev) => ({ ...prev, [id]: text }))
      setActiveTab(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载内容失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row">
      <nav className="lg:w-56">
        <ul className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm lg:flex-col">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => loadContent(tab.id)}
                  className={`w-full whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-primary text-white shadow'
                      : 'text-gray-600 hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="flex-1 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {loading && <p className="text-sm text-gray-500">正在加载内容…</p>}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}
        {tabs.map((tab) => (
          <div key={tab.id} hidden={activeTab !== tab.id}>
            <pre className="whitespace-pre-wrap break-words text-sm text-gray-700">
              {contents[tab.id] || ''}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AboutPage
