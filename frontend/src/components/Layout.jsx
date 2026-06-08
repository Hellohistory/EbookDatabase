// path: frontend/src/components/Layout.jsx
import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import HeaderIcons from './HeaderIcons'

const Layout = () => {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 max-[520px]:justify-start max-[520px]:gap-3 lg:px-8">
          <a href="/" className="focus-ring flex items-center gap-3 rounded-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--paper-strong)] font-serif text-lg font-bold text-primary">
              E
            </span>
            <span className="hidden text-sm font-bold tracking-wide text-ink sm:block">EbookDatabase</span>
          </a>
          <HeaderIcons />
        </div>
      </header>
      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col px-4 py-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
      <Toaster position="top-center" />
    </div>
  )
}

export default Layout
