import { Component } from 'react'

/*
  A single uncaught render error used to unmount the whole React tree, leaving
  the user on a bare background colour with no data and no way forward. This
  boundary catches it, keeps a reload path in reach, and — mounted at the app
  root — guarantees one broken screen can never again black out the product.
*/
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] render crash:', error, info)
  }

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface-base)',
          color: 'var(--text-strong)',
          fontFamily: "'Inter',sans-serif",
          padding: 24,
        }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Algo quebrou nesta tela</h1>
            <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 16px', lineHeight: 1.5 }}>
              Recarregue para tentar de novo. Se o erro persistir, avise o suporte.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid var(--hairline-strong)',
                background: 'var(--surface-inset)',
                color: 'var(--text-strong)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
