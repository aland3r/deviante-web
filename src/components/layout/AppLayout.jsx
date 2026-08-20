import { Link, NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import DevQuestStamp from '@gestalt/dev-quest/DevQuestStamp.jsx'
import { useAuth } from '../../context/AuthContext'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <Link to="/dashboard" className="brand-mark">
            <span className="brand-mark__icon">DV</span>
            <span>
              <strong>Deviante</strong>
              <small>Inteligência em manutenção</small>
            </span>
          </Link>
        </div>

        <button
          type="button"
          className="app-header__menu-toggle"
          aria-label="Abrir menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <nav className={`app-header__nav ${menuOpen ? 'open' : ''}`}>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            onClick={() => setMenuOpen(false)}
          >
            Painel
          </NavLink>
          <NavLink
            to="/account"
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            onClick={() => setMenuOpen(false)}
          >
            Conta
          </NavLink>
        </nav>

        <div className={`app-header__user ${menuOpen ? 'open' : ''}`}>
          <div className="user-chip">
            <span className="user-chip__name">{user?.fullName}</span>
          </div>
          <button type="button" className="button button--ghost" onClick={() => logout()}>
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
