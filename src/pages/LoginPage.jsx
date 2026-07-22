import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SocialLoginButton from '../components/auth/SocialLoginButton'
import AuthSplitLayout from '../components/layout/AuthSplitLayout'
import Alert from '../components/ui/LegacyAlert'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'

/**
 * Deviante is invite-only: the owner authorizes Google accounts one by one
 * (see gestalt-kit/plans § Modelo de acesso). There is no e-mail/password
 * form and no self-registration — Google OAuth is the single entry point.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const { loginWithGoogle, isAuthenticated, hasAccess, authReady } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authReady) return
    if (isAuthenticated && hasAccess) {
      navigate('/dashboard', { replace: true })
    } else if (isAuthenticated) {
      navigate('/no-access', { replace: true })
    }
  }, [authReady, isAuthenticated, hasAccess, navigate])

  async function handleGoogleLogin() {
    setSubmitting(true)
    setError('')

    try {
      await loginWithGoogle()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Não foi possível iniciar o login com Google.')
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout>
      <div className="auth-split__social">
        <SocialLoginButton disabled={submitting} onClick={handleGoogleLogin} />
      </div>

      {error ? <Alert className="auth-split__alert">{error}</Alert> : null}

      <p className="auth-split__divider">
        O acesso ao Deviante é liberado pelo responsável, conta por conta.
        Entre com a conta Google autorizada.
      </p>

      <p className="auth-split__legal">
        Ao continuar, você aceita os <a href="#">Termos de Uso</a>.
      </p>
    </AuthSplitLayout>
  )
}
