import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { FormModal, Field, Select, TextArea } from '@deviante/ui'
import { api, ApiError } from '../../lib/api'

/**
 * "Detalhe do trace": o operador (e quem edita) anota o que aconteceu num caso
 * específico daquela atividade. Lista as notas já feitas na atividade.
 * traces: [{ id, caseId }] — os casos cuja sequência passa pela atividade.
 */
export default function TraceNoteModal({ processId, activityName, traces, onClose }) {
  const [traceId, setTraceId] = useState(traces[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.listTraceNotes(processId)
      .then((rows) => { if (!cancelled) setNotes(rows.filter((row) => row.activityName === activityName)) })
      .catch((err) => { if (!cancelled) setListError(err instanceof ApiError ? err.message : 'Não foi possível carregar as notas.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [processId, activityName])

  const caseIdOf = (row) => row.caseId ?? traces.find((trace) => trace.id === row.traceId)?.caseId ?? row.traceId

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const created = await api.createTraceNote(processId, { traceId, activityName, note: note.trim() })
      setNotes((current) => [...current, created ?? { id: `${traceId}-${Date.now()}`, traceId, activityName, note: note.trim() }])
      setNote('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar o detalhe.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(row) {
    setListError('')
    try {
      await api.deleteTraceNote(processId, row.id)
      setNotes((current) => current.filter((item) => item.id !== row.id))
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Não foi possível excluir a nota.')
    }
  }

  return (
    <FormModal title="Detalhe do trace" subtitle={activityName} onClose={onClose} onSubmit={submit}
      busy={busy} canSubmit={Boolean(traceId && note.trim())} error={error} columns={1}>
      <Field label="Trace (case id)">
        <Select value={traceId} onChange={(event) => setTraceId(event.target.value)}>
          {traces.length ? traces.map((trace) => <option key={trace.id} value={trace.id}>{trace.caseId}</option>)
            : <option value="">Nenhum trace passa por esta atividade</option>}
        </Select>
      </Field>
      <Field label="Detalhe">
        <TextArea value={note} onChange={(event) => setNote(event.target.value)} placeholder="O que aconteceu neste caso, nesta atividade…" />
      </Field>
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] uppercase text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Notas desta atividade</p>
        {loading ? <p className="text-[11px] text-muted-foreground">Carregando…</p>
          : listError ? <p className="text-[11px]" style={{ color: 'var(--crit-soft)' }}>{listError}</p>
            : notes.length ? (
              <ul className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 180 }}>
                {notes.map((row) => (
                  <li key={row.id} className="flex items-start gap-2 rounded-lg border border-border px-2.5 py-1.5" style={{ background: 'var(--surface-base)' }}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{caseIdOf(row)}</span>
                      <span className="block text-xs text-foreground whitespace-pre-wrap break-words">{row.note}</span>
                    </span>
                    <button type="button" onClick={() => remove(row)} title="Excluir nota" aria-label="Excluir nota"
                      className="p-1 rounded hover:bg-red-950/40 shrink-0" style={{ color: 'var(--crit-soft)' }}>
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[11px] text-muted-foreground">Nenhuma nota ainda.</p>}
      </div>
    </FormModal>
  )
}
