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
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="about-page">
      <nav className="about-nav">
        <ul>
          {tabs.map((tab) => (
            <li key={tab.id} className={activeTab === tab.id ? 'active' : ''}>
              <button type="button" onClick={() => loadContent(tab.id)}>
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {loading && <p>正在加载内容…</p>}
      {error && <p className="error-text">{error}</p>}
      {tabs.map((tab) => (
        <div key={tab.id} className={`about-content${activeTab === tab.id ? ' active' : ''}`}>
          <pre>{contents[tab.id] || ''}</pre>
        </div>
      ))}
    </div>
  )
}

export default AboutPage
