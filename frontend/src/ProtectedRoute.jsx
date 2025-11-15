// path: frontend/src/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import useGlobalStore from './store/useGlobalStore'

const ProtectedRoute = ({ children }) => {
  const token = useGlobalStore((state) => state.token)
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default ProtectedRoute
