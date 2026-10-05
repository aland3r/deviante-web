import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { DEMO_ACCOUNTS } from '../../lib/demoAccounts'

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function initials(label) {
  return label.slice(0, 2).toUpperCase()
}

// Card de acesso da landing (Figma Make "LoginScreen"): login real com Google
// em cima e, abaixo, o acesso rápido com uma conta de demonstração por papel.
export default function LoginCard() {
  const navigate = useNavigate()
  const { user, isAuthenticated, hasAccess, authReady, loginWithGoogle, loginAsDemo, logout } = useAuth()
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')

  async function handleGoogle() {
    setPending('google')
    setError('')
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err?.message || 'Não foi possível iniciar o login com Google.')
      setPending(null)
    }
  }

  async function handleDemo(account) {
    setPending(account.role)
    setError('')
    try {
      await loginAsDemo(account.email)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.message || 'Não foi possível entrar com a conta de demonstração.')
      setPending(null)
    }
  }

  const busy = pending !== null
  const signedIn = authReady && isAuthenticated && hasAccess

  return (
    <div id="entrar" className="scroll-mt-24 overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-panel)]">
      <div className="border-b border-border px-6 pt-6 pb-5 sm:px-7">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-foreground">
          Acessar plataforma
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {signedIn ? 'Você já está conectado.' : 'Entre com a conta Google autorizada pelo responsável.'}
        </p>
      </div>

      {signedIn ? (
        <div className="flex flex-col gap-3 px-6 py-5 sm:px-7">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Continuar como {user?.fullName || user?.email || 'usuário'}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sair e entrar com outra conta
          </button>
        </div>
      ) : (
        <>
          <div className="px-6 pt-5 pb-4 sm:px-7">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending === 'google' ? <Loader2 className="size-[18px] animate-spin" /> : <GoogleLogo />}
              Entrar com Google
            </button>
            {error ? (
              <p role="alert" className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-sm text-accent">{error}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-3 px-6 pb-3 sm:px-7">
            <div className="h-px flex-1 bg-border" />
            <span className="font-[family-name:var(--font-eyebrow)] text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              ou acesso rápido
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <ul className="flex flex-col gap-1 px-3 pb-3">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.role}>
                <button
                  type="button"
                  onClick={() => handleDemo(account)}
                  disabled={busy}
                  className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold"
                    style={{ color: account.color, background: `${account.color}14`, border: `1.5px solid ${account.color}40` }}
                    aria-hidden
                  >
                    {initials(account.label)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{account.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{account.description}</span>
                  </span>
                  {pending === account.role ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <p className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground sm:px-7">
            Contas de demonstração com os dados sintéticos do projeto.
          </p>
        </>
      )}
    </div>
  )
}
