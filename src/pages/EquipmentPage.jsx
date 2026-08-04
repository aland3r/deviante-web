import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, Plus, X } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { FilterSelect, SearchBox, State, Surface } from './OperationsPage'

const STATUS = { healthy: ['Saudável', '#10b981'], watch: ['Atenção', '#f59e0b'], critical: ['Crítico', '#dc2626'], unknown: ['Sem análise', '#64748b'] }

export default function EquipmentPage() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [processId, setProcessId] = useState('')
  const [monitoringId, setMonitoringId] = useState('')
  const [health, setHealth] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const load = () => api.listAllMachines().then((data) => setRows(Array.isArray(data) ? data : data?.items ?? [])).catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os equipamentos.')).finally(() => setLoading(false))
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const processes = useMemo(() => associationOptions(rows, 'processIds', 'processNames'), [rows])
  const monitorings = useMemo(() => associationOptions(rows, 'monitoringIds', 'monitoringNames'), [rows])
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter((row) => {
      const rowHealth = equipmentHealth(row)
      const matchesText = !term || [row.name, row.tag, row.location, row.kind, ...(row.processNames ?? []), ...(row.monitoringNames ?? [])]
        .some((value) => String(value ?? '').toLowerCase().includes(term))
      return matchesText
        && (!processId || row.processIds?.includes(processId))
        && (!monitoringId || row.monitoringIds?.includes(monitoringId))
        && (!health || rowHealth === health)
    })
  }, [rows, query, processId, monitoringId, health])

  const actions = <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#059669' }}><Plus size={12} />Novo equipamento</button>
  return <Surface title="Equipamentos" subtitle={`${rows.length} ativos cadastrados com histórico, análises e vínculos.`} icon={Cpu} actions={actions}>
    {creating && <CreateEquipmentModal onClose={() => setCreating(false)} onCreate={async (data) => { await api.createEquipment(data); setCreating(false); load() }} />}
    <div className="grid gap-2 mb-4 sm:grid-cols-[minmax(220px,1fr)_190px_190px_150px]">
      <SearchBox value={query} onChange={setQuery} placeholder="Buscar equipamento, TAG, processo ou local…" compact />
      <FilterSelect value={processId} onChange={setProcessId} label="Todos os processos" options={processes} />
      <FilterSelect value={monitoringId} onChange={setMonitoringId} label="Todos os monitoramentos" options={monitorings} />
      <FilterSelect value={health} onChange={setHealth} label="Toda condição" options={[
        { value: 'healthy', label: 'Saudável' }, { value: 'watch', label: 'Atenção' }, { value: 'critical', label: 'Crítico' }, { value: 'unknown', label: 'Sem análise' },
      ]} />
    </div>
    {loading ? <State>Carregando…</State> : error ? <State error>{error}</State> : <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-left" style={{ minWidth: 1040, background: '#111520' }}>
        <thead><tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
          <Header>Equipamento</Header><Header>Processo</Header><Header>Monitoramento</Header><Header right>Leituras</Header><Header right>RUL</Header><Header right>Falha</Header><Header>Condição</Header>
        </tr></thead>
        <tbody>{visible.map((machine) => {
          const state = equipmentHealth(machine); const meta = STATUS[state]
          return <tr key={machine.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
            <Cell><Link to={`/equipment/${machine.id}`} className="text-xs font-semibold text-foreground hover:text-emerald-400">{machine.name}</Link><p className="text-[10px] text-muted-foreground mt-0.5">{[machine.tag, machine.kind, machine.location].filter(Boolean).join(' · ') || 'Sem identificação técnica'}</p></Cell>
            <Cell>{machine.processNames?.join(', ') || '—'}</Cell>
            <Cell>{machine.monitoringNames?.join(', ') || '—'}<p className="text-[10px] text-muted-foreground mt-0.5">{machine.parameterCount ?? 0} parâmetros · {machine.analysisCount ?? 0} análises</p></Cell>
            <Cell right mono>{machine.readingCount ?? 0}</Cell>
            <Cell right mono>{formatRul(machine.latestRulValue, machine.latestRulUnit)}</Cell>
            <Cell right mono>{formatProbability(machine.latestFailureProbability)}</Cell>
            <Cell><span className="inline-flex px-2 py-0.5 rounded-full text-[10px]" style={{ color: meta[1], background: `${meta[1]}1f` }}>{meta[0]}</span></Cell>
          </tr>
        })}</tbody>
      </table>
      {!visible.length && <State>Nenhum equipamento corresponde aos filtros.</State>}
    </div>}
  </Surface>
}

function associationOptions(rows, idsKey, namesKey) {
  const values = new Map()
  rows.forEach((row) => (row[idsKey] ?? []).forEach((id, index) => values.set(id, row[namesKey]?.[index] ?? id)))
  return [...values].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}
function equipmentHealth(machine) {
  const probability = machine.latestFailureProbability
  const rul = machine.latestRulValue
  if (probability == null && rul == null) return 'unknown'
  if ((probability ?? 0) >= 0.7 || (rul != null && rul <= 10)) return 'critical'
  if ((probability ?? 0) >= 0.4 || (rul != null && rul <= 20)) return 'watch'
  return 'healthy'
}
const formatRul = (value, unit) => value == null ? '—' : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit === 'traces' ? 'traços' : unit || ''}`
const formatProbability = (value) => value == null ? '—' : `${(Number(value) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const Header = ({ children, right = false }) => <th className={`px-4 py-2.5 font-semibold ${right ? 'text-right' : ''}`}>{children}</th>
const Cell = ({ children, right = false, mono = false }) => <td className={`px-4 py-3 text-[11px] text-muted-foreground align-middle ${right ? 'text-right' : ''}`} style={mono ? { fontFamily: "'JetBrains Mono',monospace" } : undefined}>{children}</td>

function CreateEquipmentModal({ onClose, onCreate }) {
  const [values, setValues] = useState({ name: '', kind: 'generico', tag: '', location: '', manufacturer: '', model: '' }); const [busy, setBusy] = useState(false)
  const field = (key, placeholder) => <input value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} className="px-3 py-2 rounded-lg border border-border text-xs text-foreground" style={{ background: '#0d1017' }} />
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,6,12,.78)' }}><form onSubmit={async (event) => { event.preventDefault(); if (!values.name.trim()) return; setBusy(true); try { await onCreate(values) } finally { setBusy(false) } }} className="w-full rounded-xl border border-border" style={{ maxWidth: 480, background: '#111520' }}><div className="flex justify-between px-4 py-3 border-b border-border"><div><h2 className="text-sm font-semibold text-foreground">Cadastrar equipamento</h2><p className="text-[11px] text-muted-foreground mt-1">Crie o ativo antes de associá-lo a processos ou monitoramentos.</p></div><button type="button" onClick={onClose}><X size={13} /></button></div><div className="grid gap-3 p-4 sm:grid-cols-2"><label className="flex flex-col gap-1 text-[10px] text-muted-foreground sm:col-span-2">Nome *{field('name', 'Ex.: Torno CNC Prod1')}</label><label className="flex flex-col gap-1 text-[10px] text-muted-foreground">Tipo<select value={values.kind} onChange={(event) => setValues((current) => ({ ...current, kind: event.target.value }))} className="px-3 py-2 rounded-lg border border-border text-xs text-foreground" style={{ background: '#0d1017' }}><option value="torno">Torno CNC</option><option value="fresadora">Fresadora</option><option value="compressor">Compressor</option><option value="esteira">Esteira</option><option value="generico">Genérico</option></select></label><label className="flex flex-col gap-1 text-[10px] text-muted-foreground">TAG{field('tag', 'Ex.: TRN-01')}</label><label className="flex flex-col gap-1 text-[10px] text-muted-foreground">Fabricante{field('manufacturer', 'Ex.: Romi')}</label><label className="flex flex-col gap-1 text-[10px] text-muted-foreground">Modelo{field('model', 'Ex.: GL 240')}</label><label className="flex flex-col gap-1 text-[10px] text-muted-foreground sm:col-span-2">Localização{field('location', 'Ex.: Célula 01')}</label></div><div className="flex justify-end gap-2 px-4 py-3 border-t border-border"><button type="button" onClick={onClose} className="px-3 py-2 text-xs text-muted-foreground">Cancelar</button><button disabled={busy || !values.name.trim()} className="px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#059669' }}>{busy ? 'Cadastrando…' : 'Cadastrar'}</button></div></form></div>
}
