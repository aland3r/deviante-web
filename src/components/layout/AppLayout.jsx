import { NavLink, Outlet } from 'react-router-dom'
import DevQuestStamp from '@gestalt/dev-quest/DevQuestStamp.jsx'
import BrandMark from './BrandMark'
import { useAuth } from '../../context/AuthContext'

/*
  App shell for /dashboard and /account.

  The header is deliberately the SAME object as the canvas header in
  ProcessCanvasPage — same 52px bar, same #111520 surface, same BrandMark,
  same divider, same pill group and monospace labels — so opening a process
  changes what the bar contains, never what it looks like. Before this, the
  shell still wore the old light "DV · Inteligência em manutenção" identity
  while the canvas already wore the dark/red one from the Figma Make export.
*/

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Painel' },
  { to: '/account', label: 'Conta' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell" style={{ background: '#0d1017', minHeight: '100vh' }}>
      <header className="shrink-0 flex items-center gap-4 px-5 border-b border-border sticky top-0 z-10"
        style={{ height: '52px', background: '#111520', fontFamily: "'Inter',sans-serif" }}>

        <BrandMark />

        <div className="w-px h-5 bg-border" />

        <nav className="flex items-center gap-0.5 rounded-lg p-0.5 shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all no-underline"
              style={({ isActive }) => ({
                background: isActive ? '#1e2738' : 'transparent',
                color: isActive ? '#e2e8f0' : '#64748b',
                fontFamily: "'JetBrains Mono',monospace",
                textDecoration: 'none',
              })}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full text-xs font-semibold text-foreground truncate"
            style={{ background: '#1e2738', border: '1px solid rgba(255,255,255,0.09)', maxWidth: 220 }}>
            {user?.fullName || user?.email || 'Gestor'}
          </span>
          <button type="button" onClick={() => logout()}
            className="px-2.5 py-1.5 rounded text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'transparent', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace" }}>
            Sair
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
        <DevQuestStamp />
      </main>
    </div>
  )
}
