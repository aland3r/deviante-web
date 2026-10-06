import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Shared chrome of the public pages ported from the Figma Make "Arc42View":
// palette, 52px header with Voltar + breadcrumb, header buttons and the left
// nav item. Used by Documentação and Casos de Uso so both read as one product.

export const C = {
  page: '#111318',
  bar: '#0d0f14',
  line: 'rgba(77,143,192,0.10)',
  blue: '#4d8fc0',
  red: '#dc2626',
  strong: '#c8dff0',
  body: '#7a93b0',
  dim: '#475569',
  faint: '#334155',
  mono: "'JetBrains Mono',monospace",
  sans: "'Inter',sans-serif",
}

export function DevianteLogo({ size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

export function HeaderButton({ to, children, accent = false }) {
  const base = accent
    ? { border: '1px solid rgba(220,38,38,0.35)', background: 'rgba(220,38,38,0.08)', color: '#fca5a5' }
    : { border: '1px solid rgba(77,143,192,0.18)', background: 'rgba(77,143,192,0.08)', color: '#94a3b8' }
  return (
    <Link
      to={to}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', textDecoration: 'none', transition: 'all 0.15s', ...base }}
      onMouseEnter={(e) => { const b = e.currentTarget; b.style.background = accent ? 'rgba(220,38,38,0.18)' : 'rgba(77,143,192,0.18)'; b.style.color = accent ? '#fff' : C.strong }}
      onMouseLeave={(e) => { const b = e.currentTarget; b.style.background = base.background; b.style.color = base.color }}
    >
      {children}
    </Link>
  )
}

/** The 52px bar: Voltar · logo · "Deviante › {title}" · {children} on the right. */
export function Arc42Header({ title, children }) {
  const navigate = useNavigate()
  return (
    <header style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderBottom: `1px solid ${C.line}`, background: C.bar }}>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(77,143,192,0.08)', color: '#94a3b8', cursor: 'pointer', fontSize: 11, transition: 'all 0.15s' }}
        onMouseEnter={(e) => { const b = e.currentTarget; b.style.background = 'rgba(77,143,192,0.18)'; b.style.color = C.strong }}
        onMouseLeave={(e) => { const b = e.currentTarget; b.style.background = 'rgba(77,143,192,0.08)'; b.style.color = '#94a3b8' }}
      >
        <ArrowLeft size={11} /> Voltar
      </button>
      <div style={{ width: 1, height: 20, background: 'rgba(77,143,192,0.15)' }} />
      <DevianteLogo size={22} />
      <span className="arc42-crumb" style={{ fontSize: 13, color: '#64748b' }}>Deviante</span>
      <span className="arc42-crumb" style={{ fontSize: 13, color: 'rgba(77,143,192,0.30)' }}>›</span>
      <span className="arc42-crumb" style={{ fontSize: 13, fontWeight: 600, color: C.strong, whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ flex: 1 }} />
      {children}
    </header>
  )
}

/** Left-nav row: mono number + label, active row marked blue with a red number. */
export function NavItem({ num, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 18px', textAlign: 'left', border: 'none', cursor: 'pointer',
        background: active ? 'rgba(77,143,192,0.09)' : 'transparent',
        borderLeft: `2px solid ${active ? C.blue : 'transparent'}`,
        color: active ? C.strong : C.dim,
        fontSize: 13, fontWeight: active ? 500 : 400, transition: 'all 0.14s',
      }}
      onMouseEnter={(e) => { if (!active) { const b = e.currentTarget; b.style.color = C.body; b.style.background = 'rgba(77,143,192,0.04)' } }}
      onMouseLeave={(e) => { if (!active) { const b = e.currentTarget; b.style.color = C.dim; b.style.background = 'transparent' } }}
    >
      <span style={{ fontFamily: C.mono, fontSize: 11, color: active ? C.red : C.dim, flexShrink: 0, minWidth: 22, fontWeight: active ? 700 : 400 }}>{num}</span>
      {label}
    </button>
  )
}

export function DocCallout({ title, children }) {
  return (
    <div style={{ padding: '13px 16px 13px 18px', borderRadius: 7, background: 'rgba(77,143,192,0.07)', borderLeft: `3px solid ${C.blue}`, margin: '18px 0', lineHeight: 1.65 }}>
      {title && <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</p>}
      <div style={{ fontSize: 13, color: C.body }}>{children}</div>
    </div>
  )
}
