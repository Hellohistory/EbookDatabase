// path: frontend/src/components/Layout.jsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Bars3Icon } from '@heroicons/react/24/outline'
import HeaderIcons from './HeaderIcons'
import Sidebar from './Sidebar'

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <div className="relative min-h-screen bg-gray-100">
      <div className="flex min-h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3 lg:px-8">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 lg:hidden"
                onClick={toggleSidebar}
                aria-label="切换导航"
              >
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              </button>
              <div className="flex flex-1 justify-end">
                <HeaderIcons />
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      <Toaster position="top-center" />
    </div>
  )
}

export default Layout
