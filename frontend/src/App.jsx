// path: frontend/src/App.jsx
import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import SearchPage from './pages/SearchPage'
import ResultsPage from './pages/ResultsPage'
import AboutPage from './pages/AboutPage'
import useGlobalStore from './store/useGlobalStore'

const App = () => {
  const fetchAvailableDBs = useGlobalStore((state) => state.fetchAvailableDBs)
  const fetchSettings = useGlobalStore((state) => state.fetchSettings)

  useEffect(() => {
    fetchAvailableDBs()
    fetchSettings()
  }, [fetchAvailableDBs, fetchSettings])

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<SearchPage />} />
        <Route path="search" element={<ResultsPage />} />
        <Route path="about" element={<AboutPage />} />
      </Route>
    </Routes>
  )
}

export default App
