import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Search } from 'lucide-react'
import { api, ApiError } from '../lib/api'

export default function OperationsPage() {
  const [operations, setOperations] = useState([])
  const [query, setQuery] = useState('')
  const [processId, setProcessId] = useState('')
  const [equipmentId, setEquipmentId] = useState('')
  const [mappingStatus, setMappingStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listOperations()
      .then((rows) => setOperations(Array.isArray(rows) ? rows : rows?.items ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as operações.'))
      .finally(() => setLoading(false))
  }, [])

  const processes = useMemo(() => uniqueOptions(operations, 'processId', 'processName'), [operations])
  const equipment = useMemo(() => {
    const byId = new Map()
    operations.forEach((row) => (row.equipmentIds ?? []).forEach((id, index) => {
      byId.set(id, row.equipmentNames?.[index] ?? id)
    }))
    return [...byId].map(([value, label]) => ({ value, label })).sort(sortLabel)
  }, [operations])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return operations.filter((row) => {
      const matchesText = !term || [row.rawLabel, row.activityName, row.processName, row.eventLogName, ...(row.equipmentNames ?? [])]
        .some((value) => String(value ?? '').toLowerCase().includes(term))
      return matchesText
        && (!processId || row.processId === processId)
        && (!equipmentId || row.equipmentIds?.includes(equipmentId))
        && (!mappingStatus || row.mappingStatus === mappingStatus)
    })
  }, [operations, query, processId, equipmentId, mappingStatus])

  return (
    <Surface title="Operações" subtitle={`${operations.length} atividades observadas nos logs persistidos.`} icon={Activity}>
      <div className="grid gap-2 mb-4 sm:grid-cols-[minmax(220px,1fr)_190px_190px_150px]">
        <SearchBox value={query} onChange={setQuery} placeholder="Buscar operação, processo ou máquina…" compact />
        <FilterSelect value={processId} onChange={setProcessId} label="Todos os processos" options={processes} />
        <FilterSelect value={equipmentId} onChange={setEquipmentId} label="Todas as máquinas" options={equipment} />
        <FilterSelect value={mappingStatus} onChange={setMappingStatus} label="Todo mapeamento" options={[
          { value: 'mapped', label: 'Mapeadas' }, { value: 'auto_mapped', label: 'Mapeadas automaticamente' }, { value: 'unmapped', label: 'Não mapeadas' },
        ]} />
      </div>
      {loading ? <State>Carregando…</State> : error ? <State error>{error}</State> : (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-left" style={{ minWidth: 880, background: '#111520' }}>
            <thead><tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <Header>Operação</Header><Header>Processo</Header><Header>Máquina</Header><Header>Log de origem</Header><Header right>Ocorrências</Header><Header>Status</Header>
            </tr></thead>
            <tbody>{visible.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                <Cell><p className="text-xs font-semibold text-foreground">{row.activityName || row.rawLabel}</p>{row.activityName && row.activityName !== row.rawLabel && <p className="text-[10px] text-muted-foreground mt-0.5">Alias: {row.rawLabel}</p>}</Cell>
                <Cell>{row.processId ? <Link className="text-xs text-sky-400 hover:underline" to={`/processes/${row.processId}`}>{row.processName}</Link> : '—'}</Cell>
                <Cell>{row.equipmentNames?.length ? row.equipmentNames.join(', ') : '—'}</Cell>
                <Cell><span className="text-[10px] text-muted-foreground">{row.eventLogName || '—'}</span></Cell>
                <Cell right><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{row.occurrenceCount ?? 0}</span></Cell>
                <Cell><Status value={row.mappingStatus} /></Cell>
              </tr>
            ))}</tbody>
          </table>
          {!visible.length && <State>Nenhuma operação corresponde aos filtros.</State>}
        </div>
      )}
    </Surface>
  )
}

function uniqueOptions(rows, valueKey, labelKey) {
  const values = new Map(rows.filter((row) => row[valueKey]).map((row) => [row[valueKey], row[labelKey] || row[valueKey]]))
  return [...values].map(([value, label]) => ({ value, label })).sort(sortLabel)
}
const sortLabel = (a, b) => a.label.localeCompare(b.label, 'pt-BR')
const Header = ({ children, right = false }) => <th className={`px-4 py-2.5 font-semibold ${right ? 'text-right' : ''}`}>{children}</th>
const Cell = ({ children, right = false }) => <td className={`px-4 py-3 text-[11px] text-muted-foreground align-middle ${right ? 'text-right' : ''}`}>{children}</td>
const Status = ({ value }) => <span className="inline-flex px-2 py-0.5 rounded-full text-[10px]" style={{ color: value === 'unmapped' ? '#f59e0b' : '#10b981', background: value === 'unmapped' ? 'rgba(245,158,11,.12)' : 'rgba(16,185,129,.12)' }}>{value === 'unmapped' ? 'Pendente' : 'Mapeada'}</span>

export function Surface({ title, subtitle, icon: Icon, actions, children }) {
  return <div style={{ minHeight: 'calc(100vh - 52px)', background: '#0d1017', margin: '-2rem calc(-50vw + 50%)', padding: '28px calc(50vw - 50%)' }}><div className="px-4 sm:px-6" style={{ maxWidth: 1180, margin: '0 auto' }}><div className="flex items-start justify-between gap-4 mb-6"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(40,112,168,.13)', color: '#4d8fc0' }}><Icon size={17} /></span><div><h1 className="text-xl font-bold text-foreground">{title}</h1><p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p></div></div>{actions}</div>{children}</div></div>
}

export function SearchBox({ value, onChange, placeholder, compact = false }) {
  return <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border ${compact ? '' : 'mb-4'}`} style={{ background: '#111520' }}><Search size={13} className="text-muted-foreground" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="flex-1 min-w-0 bg-transparent border-0 outline-none text-xs text-foreground" /></label>
}

export function FilterSelect({ value, onChange, label, options }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="px-3 py-2 rounded-lg border border-border text-xs text-foreground" style={{ background: '#111520' }}><option value="">{label}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
}

export function State({ children, error = false }) { return <p className="px-4 py-10 text-center text-xs" style={{ color: error ? '#fca5a5' : '#64748b' }}>{children}</p> }
