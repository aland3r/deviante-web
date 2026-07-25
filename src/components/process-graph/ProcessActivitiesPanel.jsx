import { useMemo, useState } from 'react'
import { Check, Loader2, Minus, Plus, Search, X } from 'lucide-react'
import { api, ApiError } from '../../lib/api'

function ActivityListItem({ activity, linked, busy, onToggle }) {
  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2 border-b border-border last:border-0"
      style={{ minHeight: 52, background: linked ? 'rgba(40,112,168,0.07)' : 'transparent' }}>
      <div className="self-stretch w-[3px] rounded-sm shrink-0"
        style={{ background: linked ? '#2870a8' : 'rgba(153,27,27,0.55)' }} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-foreground truncate">{activity.name}</p>
        <p className="text-[9px] text-muted-foreground truncate mt-0.5"
          style={{ fontFamily: "'JetBrains Mono',monospace" }}>
          {activity.description || (linked ? 'no modelo definido' : 'catálogo global')}
        </p>
      </div>
      <button type="button" onClick={() => onToggle(activity)} disabled={busy}
        title={linked ? 'Remover do modelo definido' : 'Adicionar ao modelo definido'}
        className="w-7 h-7 shrink-0 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40">
        {busy ? <Loader2 size={12} className="animate-spin" /> : linked ? <Minus size={12} /> : <Plus size={12} />}
      </button>
    </div>
  )
}

export default function ProcessActivitiesPanel({
  processId,
  activities,
  catalog,
  onActivitiesChange,
  onCatalogChange,
}) {
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const linkedIds = useMemo(() => new Set(activities.map((activity) => activity.id)), [activities])
  const term = search.trim().toLocaleLowerCase('pt-BR')
  const linked = activities.filter((activity) =>
    !term || `${activity.name} ${activity.description}`.toLocaleLowerCase('pt-BR').includes(term))
  const available = catalog.filter((activity) =>
    !linkedIds.has(activity.id)
    && (!term || `${activity.name} ${activity.description}`.toLocaleLowerCase('pt-BR').includes(term)))

  async function toggle(activity) {
    setBusyId(activity.id)
    setError('')
    try {
      if (linkedIds.has(activity.id)) {
        await api.removeProcessActivity(processId, activity.id)
        onActivitiesChange(activities.filter((item) => item.id !== activity.id))
      } else {
        const linkedActivity = await api.addProcessActivity(processId, activity.id)
        onActivitiesChange([...activities, linkedActivity].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar o modelo definido.')
    } finally {
      setBusyId('')
    }
  }

  async function create(event) {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return

    setBusyId('new')
    setError('')
    try {
      const activity = await api.createActivity({ name: cleanName, description: description.trim() })
      await api.addProcessActivity(processId, activity.id)
      onCatalogChange([...catalog, activity].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      onActivitiesChange([...activities, activity].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      setName('')
      setDescription('')
      setCreating(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar a atividade.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground"
              style={{ fontFamily: "'JetBrains Mono',monospace" }}>Atividades</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{activities.length} no modelo definido</p>
          </div>
          <button type="button" onClick={() => { setCreating((value) => !value); setError('') }}
            title={creating ? 'Cancelar criação' : 'Criar atividade'}
            className="w-7 h-7 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary">
            {creating ? <X size={12} /> : <Plus size={12} />}
          </button>
        </div>
      </div>

      {creating && (
        <form onSubmit={create} className="p-3 border-b border-border space-y-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)}
            placeholder="Nome da atividade" maxLength={150}
            className="w-full px-2.5 py-2 rounded text-[11px] text-foreground outline-none border border-border focus:border-slate-500"
            style={{ background: '#0d1017' }} />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição opcional" rows={2}
            className="w-full px-2.5 py-2 rounded text-[10px] text-foreground outline-none border border-border resize-none focus:border-slate-500"
            style={{ background: '#0d1017' }} />
          <button type="submit" disabled={!name.trim() || busyId === 'new'}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-[11px] font-medium disabled:opacity-40"
            style={{ background: '#2870a8', color: 'white' }}>
            {busyId === 'new' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}Criar e adicionar
          </button>
        </form>
      )}

      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded border border-border" style={{ background: '#0d1017' }}>
          <Search size={11} color="#475569" />
          <input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar atividades..."
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[10px] text-foreground" />
        </div>
      </div>

      {error && <p className="px-3 py-2 text-[10px] border-b border-border" style={{ color: '#fca5a5' }}>{error}</p>}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {linked.length > 0 && (
          <>
            <p className="px-3 pt-3 pb-1.5 text-[9px] uppercase text-muted-foreground"
              style={{ fontFamily: "'JetBrains Mono',monospace" }}>Neste processo</p>
            <div className="border-y border-border">
              {linked.map((activity) => (
                <ActivityListItem key={activity.id} activity={activity} linked busy={busyId === activity.id} onToggle={toggle} />
              ))}
            </div>
          </>
        )}

        <p className="px-3 pt-3 pb-1.5 text-[9px] uppercase text-muted-foreground"
          style={{ fontFamily: "'JetBrains Mono',monospace" }}>Catálogo global</p>
        {available.length ? (
          <div className="border-y border-border">
            {available.map((activity) => (
              <ActivityListItem key={activity.id} activity={activity} busy={busyId === activity.id} onToggle={toggle} />
            ))}
          </div>
        ) : (
          <p className="px-3 py-5 text-center text-[10px] text-muted-foreground">
            {search ? 'Nenhuma atividade encontrada.' : 'Todas as atividades já estão neste processo.'}
          </p>
        )}
      </div>
    </div>
  )
}
