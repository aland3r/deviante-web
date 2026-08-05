import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/*
  Account chip as a dropdown trigger. Replaces the old name-link + standalone
  "Sair" button: clicking the name opens a menu with Preferências (→ /account)
  and Sair. Same open/click-outside pattern as ProjectActionsMenu so the two
  header menus behave identically.
*/

export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  const name = user?.fullName || user?.email || 'Gestor'

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Menu da conta"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Conta"
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
        style={{
          background: 'var(--surface-inset)',
          border: '1px solid var(--hairline-strong)',
          color: 'var(--text-strong)',
          maxWidth: 220,
          cursor: 'pointer',
        }}
      >
        <span className="truncate">{name}</span>
        <ChevronDown
          size={13}
          style={{ opacity: 0.6, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 top-full right-0 mt-1 min-w-44 rounded-md border border-border p-1"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); navigate('/account') }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-left text-xs hover:bg-secondary transition-colors"
            style={{ color: 'var(--text-strong)' }}
          >
            <Settings size={13} />Preferências
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); logout() }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-left text-xs hover:bg-secondary transition-colors"
            style={{ color: 'var(--text)' }}
          >
            <LogOut size={13} />Sair
          </button>
        </div>
      )}
    </div>
  )
}
