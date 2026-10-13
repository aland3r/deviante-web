import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { driftSubject } from '../../lib/driftSubject'

/**
 * Observer: quando um drift é detectado, abre a investigação no drift mais
 * recente (seleciona-o no gráfico) e mostra onde a anomalia começou.
 */
export default function InvestigationPanel({ processId, onInvestigate }) {
  const [drift, setDrift] = useState(null)

  useEffect(() => driftSubject.subscribe({
    update: (event) => {
      if (event.processId !== processId) return
      const latest = event.drifts.at(-1) ?? null
      setDrift(latest)
      if (latest) onInvestigate(latest.index)
    },
  }), [processId, onInvestigate])

  if (!drift) return null
  return (
    <div className="shrink-0 flex items-center gap-3 px-5 py-2 border-b border-border text-[11px]" style={{ background: 'var(--surface-inset)' }}>
      <span className="font-semibold" style={{ color: 'var(--crit-soft)' }}>Investigando drift</span>
      <span className="text-muted-foreground">detectado no traço #{drift.index + 1}, anomalia a partir do traço #{(drift.anomalyStartIndex ?? drift.index) + 1}</span>
      <div className="flex-1" />
      <button type="button" onClick={() => setDrift(null)} aria-label="Fechar investigação" className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
    </div>
  )
}
