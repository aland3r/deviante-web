import { useEffect, useMemo, useState } from 'react'
import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { canDelete } from '../lib/permissions'
import { SearchBox, State, Surface } from './OperationsPage'
import FormModal, { Field, TextArea, TextInput } from '../components/ui/FormModal'

/*
  CRUD de Atividade (catálogo de etapas reutilizado pelos processos).
  Create/Update: POST/PUT /api/activities. Delete: DELETE /api/activities/{id},
  visível só ao administrador e ao gestor. Vínculos com processos:
  PUT/DELETE /api/processes/{processId}/activities/{activityId}.
*/
export default function ActivitiesPage() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null = fechado, {} = nova, linha = edição
  const { user } = useAuth()
  const allowDelete = canDelete(user)

  const load = () => api.listActivities()
    .then((data) => setRows(Array.isArray(data) ? data : data?.items ?? []))
    .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as atividades.'))
    .finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter((row) => !term || `${row.name} ${row.description ?? ''}`.toLowerCase().includes(term))
  }, [rows, query])

  async function remove(activity) {
    if (!window.confirm(`Excluir a atividade "${activity.name}"? Ela sai de todos os processos em que aparece.`)) return
    try {
      await api.deleteActivity(activity.id)
      setRows((current) => current.filter((row) => row.id !== activity.id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir a atividade.')
    }
  }

  const actions = <button onClick={() => setEditing({})} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--ok-strong)' }}><Plus size={12} />Nova atividade</button>
  return <Surface title="Atividades" subtitle={`${rows.length} atividades no catálogo, reutilizadas pelos processos.`} icon={ListChecks} actions={actions}>
    {editing && <ActivityModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    <div className="mb-4 max-w-md"><SearchBox value={query} onChange={setQuery} placeholder="Buscar atividade…" compact /></div>
    {error && <State error>{error}</State>}
    {loading ? <State>Carregando…</State> : <div className="border border-border rounded-lg divide-y divide-border" style={{ background: 'var(--surface-raised)' }}>
      {visible.map((activity) => <div key={activity.id} className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{activity.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{activity.description || 'Sem descrição'}</p>
        </div>
        <button type="button" onClick={() => setEditing(activity)} aria-label={`Editar ${activity.name}`} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
        {allowDelete && <button type="button" onClick={() => remove(activity)} aria-label={`Excluir ${activity.name}`} className="p-1.5 rounded hover:bg-red-950/40" style={{ color: 'var(--crit-soft)' }}><Trash2 size={12} /></button>}
      </div>)}
      {!visible.length && <State>Nenhuma atividade encontrada.</State>}
    </div>}
  </Surface>
}

function ActivityModal({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial.name ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [processes, setProcesses] = useState([])
  const [linked, setLinked] = useState(new Set()) // processos em que a atividade aparece hoje
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api.listProcesses().then(async (data) => {
      const list = Array.isArray(data) ? data : data?.items ?? []
      const current = new Set()
      if (initial.id) {
        await Promise.all(list.map(async (process) => {
          const activities = await api.listProcessActivities(process.id).catch(() => [])
          if (activities.some((activity) => activity.id === initial.id)) current.add(process.id)
        }))
      }
      if (!alive) return
      setProcesses(list); setLinked(current); setSelected(new Set(current))
    }).catch(() => {})
    return () => { alive = false }
  }, [initial.id])

  const toggle = (processId) => setSelected((current) => {
    const next = new Set(current)
    if (next.has(processId)) next.delete(processId); else next.add(processId)
    return next
  })

  async function submit() {
    setBusy(true); setError('')
    try {
      const saved = initial.id
        ? await api.updateActivity(initial.id, { name: name.trim(), description: description.trim() })
        : await api.createActivity({ name: name.trim(), description: description.trim() })
      const added = [...selected].filter((id) => !linked.has(id))
      const removed = [...linked].filter((id) => !selected.has(id))
      await Promise.all([
        ...added.map((processId) => api.addProcessActivity(processId, saved.id)),
        ...removed.map((processId) => api.removeProcessActivity(processId, saved.id)),
      ])
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a atividade.')
    } finally {
      setBusy(false)
    }
  }

  return <FormModal title={initial.id ? 'Editar atividade' : 'Nova atividade'} onClose={onClose} onSubmit={submit} busy={busy} canSubmit={Boolean(name.trim())} error={error} columns={1}>
    <Field label="Nome *"><TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Inspeção visual" /></Field>
    <Field label="Descrição"><TextArea value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-[10px] text-muted-foreground mb-1">Processos que usam esta atividade</legend>
      {processes.map((process) => <label key={process.id} className="flex items-center gap-2 text-xs text-foreground">
        <input type="checkbox" checked={selected.has(process.id)} onChange={() => toggle(process.id)} />{process.name || 'Processo sem nome'}
      </label>)}
      {!processes.length && <p className="text-[11px] text-muted-foreground">Nenhum processo cadastrado.</p>}
    </fieldset>
  </FormModal>
}

