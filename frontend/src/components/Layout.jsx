// path: frontend/src/components/Layout.jsx
import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import HeaderIcons from './HeaderIcons'

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-end px-4 py-3 lg:px-8">
          <HeaderIcons />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 lg:px-10 lg:py-8">
        <Outlet />
      </main>
      <Toaster position="top-center" />
    </div>
  )
}

export default Layout
