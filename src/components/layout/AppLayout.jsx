import { Link, NavLink, Outlet } from 'react-router-dom'
import DevQuestStamp from '@gestalt/dev-quest/DevQuestStamp.jsx'
import { useAuth } from '../../context/AuthContext'

export default function AppLayout() {
  const { user, logout } = useAuth()

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

        <nav className="app-header__nav">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Painel
          </NavLink>
          <NavLink to="/account" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Conta
          </NavLink>
        </nav>

        <div className="app-header__user">
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
