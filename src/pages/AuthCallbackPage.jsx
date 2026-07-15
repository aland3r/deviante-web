import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArcadeLoadingScreen, isDevQuestEnabled } from '@gestalt/dev-quest'
import Alert from '../components/ui/Alert'
import { useAuth } from '../context/AuthContext'
import { isOAuthReturn } from '../lib/auth'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { isAuthenticated, hasAccess, loading } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error_description') ?? params.get('error')
    if (oauthError) {
      setError(decodeURIComponent(oauthError.replace(/\+/g, ' ')))
    }
  }, [])

  useEffect(() => {
    if (loading || error) return

    if (isAuthenticated) {
      navigate(hasAccess ? '/dashboard' : '/no-access', { replace: true })
      return
    }

    if (!isOAuthReturn()) {
      navigate('/login', { replace: true })
    }
  }, [error, isAuthenticated, hasAccess, loading, navigate])

  useEffect(() => {
    if (loading || error || isAuthenticated) return
    if (!isOAuthReturn()) return

    const timeout = window.setTimeout(() => {
      setError('Não foi possível concluir o login. Tente novamente.')
    }, 8000)

    return () => window.clearTimeout(timeout)
  }, [error, isAuthenticated, loading])

  if (error) {
    return (
      <div className="loading-screen">
        <Alert>{error}</Alert>
        <p style={{ marginTop: '1rem' }}>
          <a href="/login">Voltar ao login</a>
        </p>
      </div>
    )
  }

  return isDevQuestEnabled()
    ? <ArcadeLoadingScreen label="OAUTH" />
    : (
      <div className="loading-screen">
        <p>Concluindo login...</p>
      </div>
    )
}
