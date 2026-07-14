export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__panel">
        <div className="auth-layout__intro">
          <span className="brand-mark__icon brand-mark__icon--large">DV</span>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <div className="auth-layout__card">
          {children}
        </div>

        {footer ? <div className="auth-layout__footer">{footer}</div> : null}
      </div>
    </div>
  )
}
