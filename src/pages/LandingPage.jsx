import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Layers } from 'lucide-react'
import LoginCard from '../components/auth/LoginCard'

// Landing — port fiel do "LoginScreen" do Figma Make (05/10): nav com marca e
// os dois itens de menu, hero à esquerda e o card de acesso à direita.
// Estilos inline como no Figma para manter a fidelidade.

function DevianteLogo({ size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="3" cy="7" r="2" fill="white" />
        <circle cx="11" cy="3" r="2" fill="white" opacity="0.7" />
        <circle cx="11" cy="11" r="2" fill="white" opacity="0.7" />
        <line x1="5" y1="6.2" x2="9" y2="3.8" stroke="white" strokeWidth="1.2" opacity="0.8" />
        <line x1="5" y1="7.8" x2="9" y2="10.2" stroke="white" strokeWidth="1.2" opacity="0.5" />
      </svg>
    </div>
  )
}

const NAV_ITEMS = [
  { to: '/documentacao', label: 'Documentação', Icon: Layers },
  { to: '/casos-de-uso', label: 'Casos de Uso', Icon: BookOpen },
]

const FEATURES = [
  'Grafo de processo interativo com DFG',
  'Análise de drift e desvios automática',
  'Visualizador 3D de máquinas industriais',
  'Process mining com logs XES/CSV',
]

function NavButton({ to, label, Icon }) {
  return (
    <Link
      to={to}
      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#94a3b8', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#f1f5f9' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8' }}
    >
      <Icon size={13} /> {label}
    </Link>
  )
}

export default function LandingPage() {
  const { hash } = useLocation()

  useEffect(() => {
    if (hash === '#entrar') {
      document.getElementById('entrar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0f1118', fontFamily: "'Inter',sans-serif", position: 'relative', overflow: 'hidden' }}>

      {/* Background dot grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
      {/* Ambient red glow */}
      <div style={{ position: 'absolute', top: -220, left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, borderRadius: '50%', background: 'rgba(153,27,27,0.07)', filter: 'blur(90px)', pointerEvents: 'none' }} />

      {/* Top nav */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '18px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DevianteLogo size={30} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Deviante</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {NAV_ITEMS.map((item) => <NavButton key={item.to} {...item} />)}
        </div>
      </nav>

      {/* Main two-column content */}
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', padding: '48px 32px 64px', position: 'relative', zIndex: 10, gap: 72 }}>

        {/* ── Left: Hero ── */}
        <div style={{ maxWidth: 460, flexShrink: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 20, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.22)', marginBottom: 28 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fca5a5', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Process Mining · Industrial SaaS</span>
          </div>

          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: 46, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
            Identifique desvios.<br />
            <span style={{ color: '#dc2626' }}>Antes que custam.</span>
          </h1>

          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.65, margin: '0 0 40px' }}>
            Plataforma de process mining para indústrias. Detecte desvios operacionais, analise variantes de processos e visualize máquinas em 3D — tudo em tempo real.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {FEATURES.map((label) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#dc2626', flexShrink: 0, opacity: 0.7 }} />
                <span style={{ fontSize: 14, color: '#8a8a8a' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Login card ── */}
        <LoginCard />
      </div>
    </div>
  )
}
