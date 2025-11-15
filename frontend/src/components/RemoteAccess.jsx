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
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
        {error}
      </p>
    )
  }

  if (!url) {
    return <p className="text-sm text-gray-500">正在加载远程访问地址…</p>
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center text-sm text-gray-600">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <QRCodeCanvas value={url} size={180} />
      </div>
      <p className="break-all font-medium text-gray-700">{url}</p>
      <p>使用移动设备扫码访问</p>
    </div>
  )
}

export default RemoteAccess
