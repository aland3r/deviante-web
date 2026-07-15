import { Navigate, Outlet } from 'react-router-dom'
import { ArcadeLoadingScreen, isDevQuestEnabled } from '@gestalt/dev-quest'
import { getPortfolioOrigin } from '@gestalt/auth'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, hasAccess, loading } = useAuth()

  if (loading) {
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
  const portfolioOrigin = getPortfolioOrigin()
  return (
    <div className="loading-screen">
      <h1>Sem acesso ao Deviante</h1>
      <p className="muted">
        Sua conta Google está autenticada, mas este produto ainda não foi liberado para você.
      </p>
      <p>
        <a href={`${portfolioOrigin}/request-access`}>Solicitar acesso no portfolio</a>
      </p>
      <p>
        <a href={`${portfolioOrigin}/apps`}>Voltar aos apps</a>
      </p>
    </div>
  )
}
