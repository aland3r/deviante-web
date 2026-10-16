import { useEffect, useState } from 'react'
import { FormModal } from '@deviante/ui'
import { api, ApiError } from '../../lib/api'

const OPTIONS = [
  { role: 'operator', label: 'Ocultar para Operador' },
  { role: 'technician', label: 'Ocultar para Técnico' },
]

/**
 * Visibilidade por papel de um processo ou equipamento (gestor, administrador).
 * GET/PUT /api/visibility/{objectType}/{objectId} com { hiddenRoles }.
 */
export default function VisibilityModal({ objectType, objectId, objectName, onClose }) {
  const [hidden, setHidden] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.getVisibility(objectType, objectId)
      .then((data) => { if (!cancelled) setHidden(new Set(data?.hiddenRoles ?? [])) })
      .catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a visibilidade.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [objectType, objectId])

  const toggle = (role) => setHidden((current) => {
    const next = new Set(current)
    if (next.has(role)) next.delete(role)
    else next.add(role)
    return next
  })

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await api.setVisibility(objectType, objectId, OPTIONS.map((option) => option.role).filter((role) => hidden.has(role)))
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a visibilidade.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormModal title="Visibilidade" subtitle={objectName ? `Quem enxerga "${objectName}".` : undefined}
      onClose={onClose} onSubmit={submit} busy={busy} canSubmit={!loading} error={error} columns={1}>
      {loading ? <p className="text-[11px] text-muted-foreground">Carregando…</p> : OPTIONS.map(({ role, label }) => (
        <label key={role} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input type="checkbox" checked={hidden.has(role)} onChange={() => toggle(role)} className="accent-emerald-600" />
          {label}
        </label>
      ))}
    </FormModal>
  )
}
