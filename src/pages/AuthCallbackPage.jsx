import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArcadeLoadingScreen, isDevQuestEnabled } from '@gestalt/dev-quest'
import Alert from '../components/ui/Alert'
import { useAuth } from '../context/AuthContext'
import { completeOAuthCallback, isOAuthReturn } from '../lib/auth'

function mapCallbackError(message) {
  const normalized = message?.toLowerCase() ?? ''
  if (normalized.includes('code challenge') || normalized.includes('code verifier')) {
    return 'Sessão OAuth expirou. Abra /login neste mesmo domínio e tente de novo.'
  }
  if (normalized.includes('redirect')) {
    return 'URL de retorno não autorizada no Supabase. Confira Redirect URLs para este domínio.'
  }
  return message || 'Não foi possível concluir o login.'
}

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { isAuthenticated, hasAccess, authReady } = useAuth()
  const [error, setError] = useState('')
  const [wasOAuthReturn] = useState(() => isOAuthReturn())
  const [exchangeDone, setExchangeDone] = useState(() => !wasOAuthReturn)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error_description') ?? params.get('error')
    if (oauthError) {
      setError(decodeURIComponent(oauthError.replace(/\+/g, ' ')))
      setExchangeDone(true)
    }
  }, [])

  useEffect(() => {
    if (!wasOAuthReturn || error) return

    let cancelled = false

    completeOAuthCallback().then(({ error: exchangeError }) => {
      if (cancelled) return
      if (exchangeError) {
        setError(mapCallbackError(exchangeError.message))
      }
      setExchangeDone(true)
    })

    return () => {
      cancelled = true
    }
  }, [error, wasOAuthReturn])

  const ready = authReady && exchangeDone

  useEffect(() => {
    if (!ready || error) return

    if (isAuthenticated) {
      navigate(hasAccess ? '/dashboard' : '/no-access', { replace: true })
      return
    }

    if (!wasOAuthReturn) {
      navigate('/login', { replace: true })
    }
  }, [error, isAuthenticated, hasAccess, ready, navigate, wasOAuthReturn])

  useEffect(() => {
    if (!ready || error || isAuthenticated) return
    if (!wasOAuthReturn) return

    const timeout = window.setTimeout(() => {
      setError('Não foi possível concluir o login. Tente novamente.')
    }, 15000)

    return () => window.clearTimeout(timeout)
  }, [error, isAuthenticated, ready])

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
