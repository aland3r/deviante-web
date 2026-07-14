export default function Alert({ variant = 'error', children, className = '' }) {
  return (
    <div className={`alert alert--${variant} ${className}`.trim()} role="alert">
      {children}
    </div>
  )
}
