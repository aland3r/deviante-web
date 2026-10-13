import { useEffect, useState } from 'react'
import { driftSubject } from '../../lib/driftSubject'

/** Observer: mostra no cabeçalho da análise a contagem de drifts e o status. */
export default function AnalysisHud({ processId }) {
  const [summary, setSummary] = useState(null)

  useEffect(() => driftSubject.subscribe({
    update: (event) => {
      if (event.processId !== processId) return
      setSummary({ drifts: event.drifts.length, detected: event.type === 'drift-detected' })
    },
  }), [processId]) // o retorno do subscribe cancela a inscrição quando o componente sai da tela

  if (!summary) return null
  const color = summary.detected ? 'var(--crit-soft)' : 'var(--success)'
  return (
    <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px]"
      style={{ color, background: 'var(--overlay)', fontFamily: "'JetBrains Mono',monospace" }}>
      {summary.drifts} {summary.drifts === 1 ? 'drift' : 'drifts'} · {summary.detected ? 'drift detectado' : 'análise concluída'}
    </span>
  )
}
