import { Link, Navigate, Outlet } from 'react-router-dom'
import { ArcadeLoadingScreen, isDevQuestEnabled } from '@gestalt/dev-quest'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, hasAccess, authReady } = useAuth()

  if (!authReady) {
    return isDevQuestEnabled()
      ? <ArcadeLoadingScreen label="SESSION" />
      : (
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

export function NoAccessRedirect() {
  return (
    <div className="loading-screen">
      <h1>Sem acesso ao Deviante</h1>
      <p className="muted">
        Sua conta Google está autenticada, mas este produto ainda não foi liberado para você.
        Peça ao owner para liberar o acesso.
      </p>
      <p>
        <Link to="/">Voltar ao início</Link>
      </p>
      <p>
        <Link to="/login">Tentar outra conta</Link>
      </p>
    </div>
  )
}
