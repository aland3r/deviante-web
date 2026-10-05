import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { DEMO_ACCOUNTS } from '../../lib/demoAccounts'

export function GoogleLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function initials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('')
}

// Card de acesso — port fiel do "LoginScreen" do Figma Make (coluna direita).
// "Entrar com Google" faz o OAuth real do Supabase; o "Modo Protótipo" entra
// com as contas de demonstração reais (uma por papel).
export default function LoginCard() {
  const navigate = useNavigate()
  const { user, isAuthenticated, hasAccess, authReady, loginWithGoogle, loginAsDemo, logout } = useAuth()
  const [hovered, setHovered] = useState(null)
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
    <div id="entrar" style={{ width: 384, maxWidth: '100%', flexShrink: 0, scrollMarginTop: 24 }}>
      <div style={{ background: '#18191f', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.65)' }}>

        {/* Card header */}
        <div style={{ padding: '26px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 19, fontWeight: 700, color: '#f1f5f9', margin: '0 0 5px', letterSpacing: '-0.02em' }}>Acessar plataforma</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            {signedIn ? 'Você já está conectado.' : 'Faça login com sua conta Google corporativa.'}
          </p>
        </div>

        {signedIn ? (
          <div style={{ padding: '20px 28px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 20px', borderRadius: 10, border: '1px solid rgba(220,38,38,0.35)', background: 'rgba(220,38,38,0.12)', color: '#f1f5f9', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              Continuar como {user?.fullName || user?.email || 'usuário'}
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => logout()}
              style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer' }}
            >
              Sair e entrar com outra conta
            </button>
          </div>
        ) : (
          <>
            {/* Google login button */}
            <div style={{ padding: '20px 28px 18px' }}>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 14, fontWeight: 500, cursor: busy ? 'default' : 'pointer', opacity: busy && pending !== 'google' ? 0.6 : 1, transition: 'all 0.15s' }}
                onMouseEnter={(e) => { const b = e.currentTarget; b.style.background = 'rgba(255,255,255,0.09)'; b.style.borderColor = 'rgba(255,255,255,0.22)' }}
                onMouseLeave={(e) => { const b = e.currentTarget; b.style.background = 'rgba(255,255,255,0.05)'; b.style.borderColor = 'rgba(255,255,255,0.14)' }}
              >
                <GoogleLogo size={18} />
                {pending === 'google' ? 'Redirecionando…' : 'Entrar com Google'}
              </button>
              <p style={{ margin: '14px 0 0', fontSize: 11, color: '#3b4a5c', textAlign: 'center', lineHeight: 1.5 }}>
                Ao entrar, você concorda com os Termos de Serviço<br />e Política de Privacidade do Deviante.
              </p>
              {error ? (
                <p role="alert" style={{ margin: '12px 0 0', fontSize: 12, color: '#fca5a5', textAlign: 'center', lineHeight: 1.5 }}>{error}</p>
              ) : null}
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px 18px' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize: 11, color: '#3b4a5c', whiteSpace: 'nowrap' }}>ou acesso rápido</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Prototype accounts */}
            <div style={{ padding: '0 8px 8px' }}>
              <div style={{ padding: '2px 12px 8px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#3b4a5c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Modo Protótipo</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
              </div>
              {DEMO_ACCOUNTS.map((u) => {
                const isHov = hovered === u.role
                return (
                  <button
                    key={u.role}
                    type="button"
                    disabled={busy}
                    onClick={() => handleDemo(u)}
                    onMouseEnter={() => setHovered(u.role)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: `1px solid ${isHov ? `${u.color}44` : 'transparent'}`, background: isHov ? `${u.color}0d` : 'transparent', cursor: busy ? 'default' : 'pointer', opacity: busy && pending !== u.role ? 0.6 : 1, transition: 'all 0.12s', textAlign: 'left' }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${u.color}1a`, border: `1.5px solid ${u.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: u.color, fontSize: 11, fontWeight: 700 }}>
                      {initials(u.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 1 }}>{u.name}</div>
                      <div style={{ fontSize: 10, color: '#64748b', fontFamily: "'JetBrains Mono',monospace" }}>{u.role} · {u.company}</div>
                    </div>
                    <ArrowRight size={12} style={{ color: isHov || pending === u.role ? u.color : '#2d3a4e', flexShrink: 0, transition: 'color 0.12s' }} />
                  </button>
                )
              })}
              <div style={{ padding: '8px 12px 6px' }}>
                <p style={{ margin: 0, fontSize: 10, color: '#2d3a4e', textAlign: 'center' }}>Contas de demonstração · dados sintéticos do projeto</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
