// path: frontend/src/pages/LoginPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import useGlobalStore from '../store/useGlobalStore'

const inputClassName =
  'field-control block px-4 py-2'

const buttonClassName =
  'btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60'

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
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-16 max-[520px]:justify-start">
      <form
        className="surface w-full max-w-sm p-7 sm:p-8"
        onSubmit={handleSubmit}
      >
        <p className="meta-label">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">后台登录</h1>
        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="adminPassword" className="block text-sm font-bold text-ink">
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
