import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, Columns3, List, Wrench } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { State, Surface } from './OperationsPage'

const VIEWS = [{ id: 'list', label: 'Lista', icon: List }, { id: 'kanban', label: 'Kanban', icon: Columns3 }, { id: 'calendar', label: 'Calendário', icon: CalendarDays }]
const STATUS = { planned: 'Planejada', in_progress: 'Em andamento', completed: 'Concluída', canceled: 'Cancelada' }
const fmt = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '—'

export default function SchedulesPage() {
  const [rows, setRows] = useState([]); const [view, setView] = useState('list'); const [error, setError] = useState(''); const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const equipmentId = searchParams.get('equipmentId')
  useEffect(() => { api.listSchedules({ equipmentId }).then((data) => setRows(Array.isArray(data) ? data : data?.items ?? [])).catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os agendamentos.')).finally(() => setLoading(false)) }, [equipmentId])
  const actions = <div className="flex rounded-lg border border-border overflow-hidden">{VIEWS.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className="flex items-center gap-1.5 px-3 py-2 text-[11px]" style={{ border: 0, background: view === id ? 'var(--surface-inset)' : 'var(--surface-raised)', color: view === id ? 'var(--text-strong)' : 'var(--muted-foreground)' }}><Icon size={11} />{label}</button>)}</div>
  return <Surface title="Agendamentos" subtitle="Manutenções planejadas e ocorrências por equipamento." icon={Wrench} actions={actions}>{loading ? <State>Carregando…</State> : error ? <State error>{error}</State> : view === 'kanban' ? <Kanban rows={rows} /> : view === 'calendar' ? <Calendar rows={rows} /> : <ScheduleList rows={rows} />}</Surface>
}

function Card({ row }) { return <div className="rounded-lg border border-border p-3" style={{ background: 'var(--surface-raised)' }}><div className="flex justify-between gap-2"><p className="text-xs font-semibold text-foreground truncate">{row.title || row.recommendation || 'Manutenção preventiva'}</p><span className="text-[9px] text-muted-foreground shrink-0">{STATUS[row.status] || row.status}</span></div><p className="text-[10px] text-muted-foreground mt-1 truncate">{row.equipmentName || 'Equipamento'} · {fmt(row.scheduledStart)}{row.scheduledEnd ? ` – ${fmt(row.scheduledEnd)}` : ''}</p></div> }
function ScheduleList({ rows }) { return <div className="space-y-2">{rows.map((row) => <Card key={row.id} row={row} />)}{!rows.length && <State>Nenhuma manutenção agendada.</State>}</div> }
function Kanban({ rows }) { const columns = ['planned', 'in_progress', 'completed']; return <div className="grid gap-3 md:grid-cols-3">{columns.map((status) => <section key={status} className="rounded-xl border border-border p-3" style={{ background: 'var(--surface-panel)' }}><h2 className="text-[10px] uppercase text-muted-foreground mb-3">{STATUS[status]}</h2><div className="space-y-2">{rows.filter((row) => row.status === status).map((row) => <Card key={row.id} row={row} />)}</div></section>)}</div> }
function Calendar({ rows }) { const grouped = useMemo(() => rows.reduce((map, row) => { const key = String(row.scheduledStart ?? '').slice(0, 7) || 'sem-data'; (map[key] ||= []).push(row); return map }, {}), [rows]); return <div className="grid gap-3 md:grid-cols-2">{Object.entries(grouped).map(([month, items]) => <section key={month} className="rounded-xl border border-border p-3" style={{ background: 'var(--surface-panel)' }}><h2 className="text-xs font-semibold text-foreground mb-3">{month === 'sem-data' ? 'Sem data' : new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2><div className="space-y-2">{items.sort((a, b) => String(a.scheduledStart).localeCompare(String(b.scheduledStart))).map((row) => <Card key={row.id} row={row} />)}</div></section>)}{!rows.length && <State>Nenhuma manutenção agendada.</State>}</div> }
