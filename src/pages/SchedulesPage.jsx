import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, Columns3, Download, List, Plus, Trash2, Wrench, X } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { canDelete } from '../lib/permissions'
import { FEATURES, hasFeature } from '../lib/features'
import { State, Surface } from './OperationsPage'

const VIEWS = [{ id: 'list', label: 'Lista', icon: List }, { id: 'kanban', label: 'Kanban', icon: Columns3 }, { id: 'calendar', label: 'Calendário', icon: CalendarDays }]
const STATUS = { planned: 'Planejada', in_progress: 'Em andamento', completed: 'Concluída', canceled: 'Cancelada' }
const fmt = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '—'

export default function SchedulesPage() {
  const [rows, setRows] = useState([]); const [view, setView] = useState('list'); const [error, setError] = useState(''); const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const equipmentId = searchParams.get('equipmentId')
  const [editing, setEditing] = useState(null) // null = fechado, {} = nova, linha = edição
  const { user } = useAuth()
  const load = () => api.listSchedules({ equipmentId }).then((data) => setRows(Array.isArray(data) ? data : data?.items ?? [])).catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os agendamentos.')).finally(() => setLoading(false))
  useEffect(() => { load() }, [equipmentId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save(data) {
    if (editing?.id) await api.updateSchedule(editing.id, data)
    else await api.createSchedule(data)
    setEditing(null); load()
  }
  async function remove() {
    if (!window.confirm(`Excluir a manutenção "${editing.title}"?`)) return
    await api.deleteSchedule(editing.id)
    setEditing(null); load()
  }

  async function exportCsv() {
    try {
      const url = URL.createObjectURL(await api.exportSchedulesCsv())
      const link = Object.assign(document.createElement('a'), { href: url, download: 'agenda-de-manutencao.csv' })
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível exportar a agenda.')
    }
  }

  const open = (row) => setEditing(row)
  const actions = <div className="flex items-center gap-2">{hasFeature(user, FEATURES.scheduleExport) && <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-foreground" style={{ background: 'var(--surface-raised)' }}><Download size={12} />Exportar CSV</button>}<button onClick={() => setEditing({ equipmentId })} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--ok-strong)' }}><Plus size={12} />Nova manutenção</button><div className="flex rounded-lg border border-border overflow-hidden">{VIEWS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className="flex items-center gap-1.5 px-3 py-2 text-[11px]" style={{ border: 0, background: view === id ? 'var(--surface-inset)' : 'var(--surface-raised)', color: view === id ? 'var(--text-strong)' : 'var(--muted-foreground)' }}><Icon size={11} />{label}</button>)}</div></div>
  return <Surface title="Agendamentos" subtitle="Manutenções planejadas e ocorrências por equipamento." icon={Wrench} actions={actions}>{loading ? <State>Carregando…</State> : error ? <State error>{error}</State> : view === 'kanban' ? <Kanban rows={rows} onOpen={open} /> : view === 'calendar' ? <Calendar rows={rows} onOpen={open} /> : <ScheduleList rows={rows} onOpen={open} />}
    {editing && <ScheduleModal initial={editing} onClose={() => setEditing(null)} onSave={save} onDelete={editing.id && canDelete(user) ? remove : null} />}</Surface>
}

function Card({ row, onOpen }) { return <div role="button" tabIndex={0} onClick={() => onOpen(row)} onKeyDown={(event) => { if (event.key === 'Enter') onOpen(row) }} className="rounded-lg border border-border p-3 cursor-pointer hover:border-emerald-700" style={{ background: 'var(--surface-raised)' }}><div className="flex justify-between gap-2"><p className="text-xs font-semibold text-foreground truncate">{row.title || row.recommendation || 'Manutenção preventiva'}</p><span className="text-[9px] text-muted-foreground shrink-0">{STATUS[row.status] || row.status}</span></div><p className="text-[10px] text-muted-foreground mt-1 truncate">{row.equipmentName || 'Equipamento'} · {fmt(row.scheduledStart)}{row.scheduledEnd ? ` – ${fmt(row.scheduledEnd)}` : ''}</p></div> }
function ScheduleList({ rows, onOpen }) { return <div className="space-y-2">{rows.map((row) => <Card key={row.id} row={row} onOpen={onOpen} />)}{!rows.length && <State>Nenhuma manutenção agendada.</State>}</div> }
function Kanban({ rows, onOpen }) { const columns = ['planned', 'in_progress', 'completed']; return <div className="grid gap-3 md:grid-cols-3">{columns.map((status) => <section key={status} className="rounded-xl border border-border p-3" style={{ background: 'var(--surface-panel)' }}><h2 className="text-[10px] uppercase text-muted-foreground mb-3">{STATUS[status]}</h2><div className="space-y-2">{rows.filter((row) => row.status === status).map((row) => <Card key={row.id} row={row} onOpen={onOpen} />)}</div></section>)}</div> }
function Calendar({ rows, onOpen }) { const grouped = useMemo(() => rows.reduce((map, row) => { const key = String(row.scheduledStart ?? '').slice(0, 7) || 'sem-data'; (map[key] ||= []).push(row); return map }, {}), [rows]); return <div className="grid gap-3 md:grid-cols-2">{Object.entries(grouped).map(([month, items]) => <section key={month} className="rounded-xl border border-border p-3" style={{ background: 'var(--surface-panel)' }}><h2 className="text-xs font-semibold text-foreground mb-3">{month === 'sem-data' ? 'Sem data' : new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2><div className="space-y-2">{items.sort((a, b) => String(a.scheduledStart).localeCompare(String(b.scheduledStart))).map((row) => <Card key={row.id} row={row} onOpen={onOpen} />)}</div></section>)}{!rows.length && <State>Nenhuma manutenção agendada.</State>}</div> }

// datetime-local trabalha sem fuso; a API (OffsetDateTime) recebe ISO com fuso.
const toLocalInput = (iso) => { if (!iso) return ''; const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const toIso = (local) => local ? new Date(local).toISOString() : null

function ScheduleModal({ initial, onClose, onSave, onDelete }) {
  const [equipment, setEquipment] = useState([])
  const [values, setValues] = useState({
    equipmentId: initial.equipmentId ?? '', title: initial.title ?? '', notes: initial.notes ?? '',
    scheduledStart: toLocalInput(initial.scheduledStart), scheduledEnd: toLocalInput(initial.scheduledEnd), status: initial.status ?? 'planned',
  })
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  useEffect(() => { api.listAllMachines().then((data) => setEquipment(Array.isArray(data) ? data : data?.items ?? [])).catch(() => setEquipment([])) }, [])
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }))
  const valid = values.equipmentId && values.title.trim() && values.scheduledStart && (!values.scheduledEnd || values.scheduledEnd >= values.scheduledStart)
  const run = async (action) => { setBusy(true); setError(''); try { await action() } catch (err) { setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a manutenção.') } finally { setBusy(false) } }
  const submit = (event) => { event.preventDefault(); if (!valid) return; run(() => onSave({
    equipmentId: values.equipmentId, processId: initial.processId ?? null, recommendationId: initial.recommendationId ?? null,
    title: values.title.trim(), notes: values.notes.trim(), scheduledStart: toIso(values.scheduledStart), scheduledEnd: toIso(values.scheduledEnd), status: values.status,
  })) }
  const input = 'px-3 py-2 rounded-lg border border-border text-xs text-foreground'
  const label = 'flex flex-col gap-1 text-[10px] text-muted-foreground'
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,6,12,.78)' }}>
    <form onSubmit={submit} className="w-full rounded-xl border border-border" style={{ maxWidth: 480, background: 'var(--surface-raised)' }}>
      <div className="flex justify-between px-4 py-3 border-b border-border"><h2 className="text-sm font-semibold text-foreground">{initial.id ? 'Editar manutenção' : 'Nova manutenção'}</h2><button type="button" onClick={onClose} aria-label="Fechar"><X size={13} /></button></div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <label className={`${label} sm:col-span-2`}>Título *<input value={values.title} onChange={set('title')} placeholder="Ex.: Troca de rolamentos" className={input} style={{ background: 'var(--surface-base)' }} /></label>
        <label className={`${label} sm:col-span-2`}>Equipamento *<select value={values.equipmentId} onChange={set('equipmentId')} className={input} style={{ background: 'var(--surface-base)' }}><option value="">Selecione…</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className={label}>Início *<input type="datetime-local" value={values.scheduledStart} onChange={set('scheduledStart')} className={input} style={{ background: 'var(--surface-base)' }} /></label>
        <label className={label}>Fim<input type="datetime-local" value={values.scheduledEnd} onChange={set('scheduledEnd')} className={input} style={{ background: 'var(--surface-base)' }} /></label>
        <label className={label}>Situação<select value={values.status} onChange={set('status')} className={input} style={{ background: 'var(--surface-base)' }}>{Object.entries(STATUS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        <label className={`${label} sm:col-span-2`}>Observações<textarea value={values.notes} onChange={set('notes')} rows={3} className={input} style={{ background: 'var(--surface-base)' }} /></label>
        {error && <p className="sm:col-span-2 text-[11px]" style={{ color: 'var(--crit-soft)' }}>{error}</p>}
      </div>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
        {onDelete && <button type="button" disabled={busy} onClick={() => run(onDelete)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs" style={{ color: 'var(--crit-soft)' }}><Trash2 size={12} />Excluir</button>}
        <div className="flex-1" />
        <button type="button" onClick={onClose} className="px-3 py-2 text-xs text-muted-foreground">Cancelar</button>
        <button disabled={busy || !valid} className="px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ background: 'var(--ok-strong)' }}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </form>
  </div>
}
