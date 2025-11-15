// path: frontend/src/components/RemoteAccess.jsx
import { useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

const RemoteAccess = () => {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const response = await fetch('/api/v1/qr-code-url')
        if (!response.ok) {
          throw new Error('无法获取远程访问地址')
        }
        const data = await response.json()
        if (isMounted) {
          setUrl(data.url)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message)
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  if (error) {
    return <p className="error-text">{error}</p>
  }

  if (!url) {
    return <p>正在加载远程访问地址…</p>
  }

  return (
    <div className="remote-access">
      <div id="qr-code-container">
        <QRCodeCanvas value={url} size={180} />
      </div>
      <p id="access-url">{url}</p>
      <p>使用移动设备扫码访问</p>
    </div>
  )
}

export default RemoteAccess
