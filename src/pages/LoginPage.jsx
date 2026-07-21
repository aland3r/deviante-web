import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SocialLoginButton from '../components/auth/SocialLoginButton'
import AuthSplitLayout from '../components/layout/AuthSplitLayout'
import Alert from '../components/ui/LegacyAlert'
import Button from '../components/ui/LegacyButton'
import FormField from '../components/ui/FormField'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import { validateEmail } from '../lib/validation'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loginWithGoogle, isAuthenticated, hasAccess, authReady } = useAuth()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  function handleEmailContinue(event) {
    event.preventDefault()
    setError('')

    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }

    setStep('password')
  }

  function handleBackToEmail() {
    setPassword('')
    setError('')
    setStep('email')
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await login({ email, password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Não foi possível entrar agora.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout>
      <div className="auth-split__social">
        <SocialLoginButton disabled={submitting} onClick={handleGoogleLogin} />
      </div>

      <p className="auth-split__divider">
        Ou informe seu e-mail para entrar.
      </p>

      {error ? <Alert className="auth-split__alert">{error}</Alert> : null}

      {step === 'email' ? (
        <form className="auth-split__form-fields" onSubmit={handleEmailContinue}>
          <label className="auth-email-field" htmlFor="email">
            <span className="auth-email-field__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4.5A1.5 1.5 0 0 1 3.5 3h9A1.5 1.5 0 0 1 14 4.5v7A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path d="M2.5 5 8 8.5 13.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              id="email"
              type="email"
              className="auth-email-field__input"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <p className="auth-split__legal">
            Ao continuar, você aceita os <a href="#">Termos de Uso</a>.
          </p>

          <Button type="submit" className="auth-split__continue">
            Continuar
            <span aria-hidden="true">›</span>
          </Button>
        </form>
      ) : (
        <form className="auth-split__form-fields" onSubmit={handlePasswordSubmit}>
          <div className="auth-split__email-summary">
            <span>{email}</span>
            <button type="button" className="auth-split__change-email" onClick={handleBackToEmail}>
              Alterar
            </button>
          </div>

          <FormField
            id="password"
            label="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <Button type="submit" disabled={submitting} className="auth-split__continue">
            {submitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      )}
    </AuthSplitLayout>
  )
}
