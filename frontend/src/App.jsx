// path: frontend/src/App.jsx
import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import SearchPage from './pages/SearchPage'
import ResultsPage from './pages/ResultsPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import ProtectedRoute from './ProtectedRoute'
import useGlobalStore from './store/useGlobalStore'

const App = () => {
  const fetchSettings = useGlobalStore((state) => state.fetchSettings)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<SearchPage />} />
        <Route path="search" element={<ResultsPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
