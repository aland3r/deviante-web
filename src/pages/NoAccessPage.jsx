import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { submitAccessRequest } from '@gestalt/auth'
import AuthSplitLayout from '../components/layout/AuthSplitLayout'
import Alert from '../components/ui/LegacyAlert'
import LegacyButton from '../components/ui/LegacyButton'
import { useAuth } from '../context/AuthContext'

/**
 * Deviante is invite-only. A Google account that authenticates but has no grant
 * lands here and can send the owner an access request (name + verified e-mail
 * come from the session; the person only writes why they want in). The owner
 * approves in the database — this screen just files the request.
 */
export default function NoAccessPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, hasAccess, authReady } = useAuth()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authReady) return
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    } else if (hasAccess) {
      navigate('/dashboard', { replace: true })
    }
  }, [authReady, isAuthenticated, hasAccess, navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError('')
    try {
      await submitAccessRequest(user, message)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar sua solicitação.')
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <p className="auth-split__legal">
      <Link to="/login">Entrar com outra conta</Link>
    </p>
  )

  if (sent) {
    return (
      <AuthSplitLayout footer={footer}>
        <h1 className="auth-split__title">Solicitação enviada</h1>
        <p className="auth-split__divider">
          Recebemos seu pedido de acesso ao IPDD. O responsável vai avaliar e
          liberar sua conta manualmente. Você poderá entrar assim que for aprovado.
        </p>
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout footer={footer}>
      <h1 className="auth-split__title">Sem acesso ainda</h1>
      <p className="auth-split__divider">
        Sua conta Google <strong>{user?.email}</strong> está autenticada, mas o
        IPDD é liberado conta por conta. Envie uma solicitação e o responsável
        avalia o acesso.
      </p>

      <form className="auth-split__form-fields" onSubmit={handleSubmit}>
        <label className="auth-split__field-label" htmlFor="access-reason">
          Por que você quer acessar?
        </label>
        <textarea
          id="access-reason"
          className="auth-split__textarea"
          rows={4}
          maxLength={600}
          placeholder="Conte brevemente quem é você e por que precisa de acesso."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={submitting}
        />

        {error ? <Alert className="auth-split__alert">{error}</Alert> : null}

        <LegacyButton type="submit" disabled={submitting || !user}>
          {submitting ? 'Enviando…' : 'Solicitar acesso'}
        </LegacyButton>
      </form>
    </AuthSplitLayout>
  )
}
