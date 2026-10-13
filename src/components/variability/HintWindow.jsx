import { Lightbulb, X } from 'lucide-react'
import { closeHint, useClosedHints } from '../../lib/hints'

/** Pilha de janelas flutuantes no canto da tela; cada uma pode ser fechada. */
export function HintStack({ hints }) {
  const closed = useClosedHints()
  const open = hints.filter((hint) => hint && !closed.has(hint.id))
  if (!open.length) return null
  return (
    <div style={{ position: 'fixed', left: 16, bottom: 16, zIndex: 60, display: 'flex', flexDirection: 'column', gap: 10, width: 340, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 96px)', overflowY: 'auto' }} aria-label="Colas da variabilidade">
      {open.map((hint) => <HintWindow key={hint.id} {...hint} />)}
    </div>
  )
}

function HintWindow({ id, title, body, where }) {
  return (
    <section role="note" style={{ borderRadius: 10, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(24,25,31,0.97)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', fontFamily: "'Inter',sans-serif" }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Lightbulb size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{title}</span>
        <button type="button" onClick={() => closeHint(id)} aria-label="Fechar cola" style={{ background: 'transparent', border: 0, color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 2 }}><X size={13} /></button>
      </header>
      <div style={{ padding: '10px 12px', fontSize: 12, lineHeight: 1.55, color: '#cbd5e1' }}>
        {body}
        {where && <p style={{ margin: '8px 0 0', fontSize: 10.5, color: '#94a3b8', fontFamily: "'JetBrains Mono',monospace" }}>{where}</p>}
      </div>
    </section>
  )
}
