import { useState } from 'react'

/*
  Light/dark theme switch. The dark/red theme stays the product default; the
  light theme is the "article / print" mode (owner 05/08) — dark UI screenshots
  read heavy on a white Word page. State lives on <html> as `.theme-light` and
  in localStorage ('dv-theme'), initialized before paint by an inline script in
  index.html, so a flip here persists across every route and reload.
*/

function isLight() {
  return typeof document !== 'undefined'
    && document.documentElement.classList.contains('theme-light')
}

export default function ThemeToggle() {
  const [light, setLight] = useState(isLight)

  function toggle() {
    const next = !light
    document.documentElement.classList.toggle('theme-light', next)
    try {
      localStorage.setItem('dv-theme', next ? 'light' : 'dark')
    } catch {
      // storage blocked (private mode) — theme still applies for the session
    }
    setLight(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={light ? 'Tema escuro' : 'Tema claro (para o artigo)'}
      aria-label={light ? 'Ativar tema escuro' : 'Ativar tema claro'}
      className="transition-colors"
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'transparent',
        border: '1px solid var(--hairline-strong)',
        color: 'var(--text)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
      }}
    >
      {light ? (
        // moon: click to go back to dark
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // sun: click to go light
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  )
}
