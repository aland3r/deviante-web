import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, hasAccess, authReady } = useAuth()

  if (!authReady) {
    return (
      <div className="loading-screen">
        <p>Carregando sessão...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!hasAccess) {
    return <Navigate to="/no-access" replace />
  }

  return <Outlet />
}
