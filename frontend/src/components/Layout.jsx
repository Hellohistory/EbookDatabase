// path: frontend/src/components/Layout.jsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
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
    <div className="layout-root">
      <div id="menu-icon" className="cursor-pointer" onClick={toggleSidebar}>
        &#9776;
      </div>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <HeaderIcons />
      <Toaster position="top center" />
      <div className="content-wrapper">
        <Outlet />
      </div>
    </div>
  )
}

export default Layout
