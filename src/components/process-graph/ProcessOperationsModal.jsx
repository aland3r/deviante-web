import { useEffect, useState } from 'react'
import { X, Unlink } from 'lucide-react'
import { Select } from '@deviante/ui'
import { api, ApiError } from '../../lib/api'

/*
  CRUD das operações de um processo, para todo papel que vê o processo.
  As operações nascem do log carregado (Create, no upload); aqui o usuário as
  lista (Read), troca a atividade de cada uma (Update) e desfaz o mapeamento
  (Delete). Só aparecem as atividades do catálogo da empresa: criar atividade
  continua sendo do administrador.
*/
export default function ProcessOperationsModal({ processId, onClose, onChanged }) {
  const [operations, setOperations] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([api.listOperations(processId), api.listActivities()])
      .then(([ops, acts]) => {
        if (cancelled) return
        setOperations([...ops].sort((a, b) => a.rawLabel.localeCompare(b.rawLabel)))
        setActivities([...acts].sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as operações.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [processId])

  async function change(operation, run) {
    setBusyId(operation.id)
    setError('')
    try {
      const updated = await run()
      setOperations((current) => current.map((op) => (op.id === updated.id ? { ...op, ...updated } : op)))
      onChanged?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a operação.')
    } finally {
      setBusyId(null)
    }
  }

  const mapTo = (operation, activityId) =>
    change(operation, () => api.mapProcessOperation(processId, operation.id, activityId))

  const unmap = (operation) => {
    if (!window.confirm(`Desfazer o mapeamento de "${operation.rawLabel}"?`)) return
    change(operation, () => api.unmapProcessOperation(processId, operation.id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(3,6,12,.78)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }} role="dialog" aria-modal="true">
      <div className="w-full rounded-xl border border-border mt-8" style={{ maxWidth: 720, background: 'var(--surface-raised)' }}>
        <div className="flex justify-between px-4 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Operações do log</h2>
            <p className="text-[11px] text-muted-foreground mt-1">Cada operação lida do log aponta para uma atividade do catálogo da empresa.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"><X size={13} /></button>
        </div>

        <div className="p-4">
          {loading && <p className="text-xs text-muted-foreground">Carregando operações...</p>}
          {!loading && operations.length === 0 && !error && (
            <p className="text-xs text-muted-foreground">Nenhuma operação ainda. Carregue um log para criar as operações deste processo.</p>
          )}
          {operations.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] text-muted-foreground">
                  <th className="py-2 font-medium">Operação no log</th>
                  <th className="py-2 font-medium text-right pr-4">Ocorrências</th>
                  <th className="py-2 font-medium">Atividade</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => (
                  <tr key={op.id} className="border-t border-border">
                    <td className="py-2 pr-3 text-foreground font-mono text-[11px]">{op.rawLabel}</td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">{op.occurrenceCount}</td>
                    <td className="py-2 pr-2">
                      <Select value={op.activityId ?? ''} disabled={busyId === op.id}
                        onChange={(e) => e.target.value && mapTo(op, e.target.value)}
                        aria-label={`Atividade de ${op.rawLabel}`}>
                        <option value="">Não mapeada</option>
                        {activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </Select>
                    </td>
                    <td className="py-2 text-right">
                      {op.activityId && (
                        <button type="button" onClick={() => unmap(op)} disabled={busyId === op.id} title="Desfazer mapeamento"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50">
                          <Unlink size={11} /> Desmapear
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {error && <p className="text-[11px] mt-3" style={{ color: 'var(--crit-soft)' }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}
