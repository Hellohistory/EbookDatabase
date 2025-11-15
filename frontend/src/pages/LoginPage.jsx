// path: frontend/src/pages/LoginPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import useGlobalStore from '../store/useGlobalStore'

const inputClassName =
  'block w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:ring-primary'

const buttonClassName =
  'inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-primary/60'

const LoginPage = () => {
  const navigate = useNavigate()
  const token = useGlobalStore((state) => state.token)
  const login = useGlobalStore((state) => state.login)

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) {
      navigate('/admin', { replace: true })
    }
  }, [navigate, token])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!password.trim()) {
      toast.error('请输入管理员密码。')
      return
    }
    setLoading(true)
    const success = await login(password)
    setLoading(false)
    if (success) {
      toast.success('登录成功')
      navigate('/admin', { replace: true })
    } else {
      toast.error('登录失败，请检查密码。')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-16">
      <form
        className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl ring-1 ring-gray-100"
        onSubmit={handleSubmit}
      >
        <h1 className="text-3xl font-bold text-gray-900">后台登录</h1>
        <p className="mt-3 text-sm text-gray-500">请输入管理员密码以进入后台管理。</p>
        <div className="mt-8 space-y-5">
          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">
              管理员密码
            </label>
            <input
              id="adminPassword"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClassName} mt-2`}
              placeholder="请输入密码"
              required
            />
          </div>
          <button type="submit" className={buttonClassName} disabled={loading}>
            {loading ? '登录中…' : '登录'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default LoginPage
