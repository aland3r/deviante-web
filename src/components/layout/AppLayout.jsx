import { NavLink, Outlet } from 'react-router-dom'
import BrandMark from './BrandMark'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../../context/AuthContext'

/*
  App shell for /dashboard and /account.

  The header is deliberately the SAME object as the canvas header in
  ProcessCanvasPage — same 52px bar, same var(--surface-raised) surface, same BrandMark,
  same divider, same pill group and monospace labels — so opening a process
  changes what the bar contains, never what it looks like. Before this, the
  shell still wore the old light "DV · Inteligência em manutenção" identity
  while the canvas already wore the dark/red one from the Figma Make export.
*/

export default function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell" style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      <header className="shrink-0 flex items-center gap-2 sm:gap-4 px-3 sm:px-5 border-b border-border sticky top-0 z-10"
        style={{ height: '52px', background: 'var(--surface-raised)', fontFamily: "'Inter',sans-serif" }}>

        <BrandMark />

        <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Navegação principal">
          {[
            ['/dashboard', 'Projetos'],
            ['/operations', 'Operações'],
            ['/equipment', 'Equipamentos'],
            ['/schedules', 'Agendamentos'],
          ].map(([to, label]) => (
            <NavLink key={to} to={to} className="px-2.5 py-1.5 rounded text-[11px] no-underline"
              style={({ isActive }) => ({ color: isActive ? 'var(--text-strong)' : 'var(--muted-foreground)', background: isActive ? 'var(--overlay)' : 'transparent', textDecoration: 'none' })}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <ThemeToggle />

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <NavLink to="/account" end
            title="Conta"
            className="px-3 py-1 rounded-full text-xs font-semibold truncate no-underline transition-colors"
            style={({ isActive }) => ({
              background: isActive ? 'var(--surface-inset)' : 'var(--surface-inset)',
              border: isActive ? '1px solid var(--hairline-strong)' : '1px solid var(--hairline-strong)',
              color: 'var(--text-strong)',
              maxWidth: 220,
              textDecoration: 'none',
              cursor: 'pointer',
            })}>
            {user?.fullName || user?.email || 'Gestor'}
          </NavLink>
          <button type="button" onClick={() => logout()}
            className="px-2.5 py-1.5 rounded text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'transparent', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace" }}>
            Sair
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
