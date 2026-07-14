import { Link } from 'react-router-dom'

export default function AuthSplitLayout({
  children,
  footer,
  eyebrow = 'Gestão de manutenção industrial',
  headline = 'Decisões preventivas antes da falha dos equipamentos',
}) {
  return (
    <div className="auth-split">
      <section className="auth-split__form">
        <div className="auth-split__form-inner">
          <Link to="/" className="auth-split__brand">
            <span className="auth-split__brand-mark">DV</span>
            <span className="auth-split__brand-name">Deviante</span>
          </Link>

          {children}

          {footer ? <div className="auth-split__footer">{footer}</div> : null}
        </div>
      </section>

      <aside className="auth-split__hero" aria-hidden="true">
        <div className="auth-split__hero-content">
          <p className="auth-split__eyebrow">{eyebrow}</p>
          <h2 className="auth-split__headline">{headline}</h2>
        </div>
      </aside>
    </div>
  )
}
