// path: frontend/src/components/RemoteAccess.jsx
import { useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { buildApiUrl } from '../utils/api'

const RemoteAccess = () => {
  const [url, setUrl] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/v1/qr-code-url'))
        if (!response.ok) {
          throw new Error('无法获取远程访问地址')
        }
        const data = await response.json()
        if (isMounted) {
          setUrl(data.url)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '加载失败')
        }
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [])

  if (error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        {error}
      </p>
    )
  }

  if (!url) {
    return <p className="text-sm font-semibold text-[var(--muted)]">正在加载远程访问地址...</p>
  }

  return (
    <div className="grid gap-4 text-sm text-[var(--muted)] sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
      <div className="surface-flat flex justify-center p-4">
        <QRCodeCanvas value={url} size={180} />
      </div>
      <div>
        <p className="meta-label">Remote URL</p>
        <p className="mt-2 break-all font-mono text-sm font-bold text-ink">{url}</p>
      </div>
    </div>
  )
}

export default RemoteAccess
