import { useEffect, useMemo, useState } from 'react'
import { Activity, Search } from 'lucide-react'
import { api, ApiError } from '../lib/api'

export default function OperationsPage() {
  const [operations, setOperations] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listOperations()
      .then((rows) => setOperations(Array.isArray(rows) ? rows : rows?.items ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as operações.'))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return operations
    return operations.filter((row) => [row.name, row.rawLabel, row.activityName, row.processName]
      .some((value) => String(value ?? '').toLowerCase().includes(term)))
  }, [operations, query])

  return (
    <Surface title="Operações" subtitle="Catálogo global e aliases observados nos logs." icon={Activity}>
      <SearchBox value={query} onChange={setQuery} placeholder="Buscar operação, alias ou processo…" />
      {loading ? <State>Carregando…</State> : error ? <State error>{error}</State> : (
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#111520' }}>
          {visible.map((row) => (
            <div key={row.id} className="grid gap-3 px-4 py-3 border-b border-border last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="min-w-0"><p className="text-xs font-semibold text-foreground truncate">{row.activityName || row.name || row.rawLabel}</p><p className="text-[10px] text-muted-foreground truncate">{row.rawLabel && row.rawLabel !== row.activityName ? `Alias: ${row.rawLabel}` : row.description || '—'}</p></div>
              <p className="text-[10px] text-muted-foreground truncate self-center">{row.processName || row.eventLogName || 'Catálogo global'}</p>
              <span className="text-[10px] text-muted-foreground self-center" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{row.occurrenceCount ?? 0} ocorr.</span>
            </div>
          ))}
          {!visible.length && <State>Nenhuma operação encontrada.</State>}
        </div>
      )}
    </Surface>
  )
}

export function Surface({ title, subtitle, icon: Icon, actions, children }) {
  return <div style={{ minHeight: 'calc(100vh - 52px)', background: '#0d1017', margin: '-2rem calc(-50vw + 50%)', padding: '28px calc(50vw - 50%)' }}><div className="px-4 sm:px-6" style={{ maxWidth: 1120, margin: '0 auto' }}><div className="flex items-start justify-between gap-4 mb-6"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(40,112,168,.13)', color: '#4d8fc0' }}><Icon size={17} /></span><div><h1 className="text-xl font-bold text-foreground">{title}</h1><p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p></div></div>{actions}</div>{children}</div></div>
}

export function SearchBox({ value, onChange, placeholder }) {
  return <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border mb-4" style={{ background: '#111520' }}><Search size={13} className="text-muted-foreground" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground" /></label>
}

export function State({ children, error = false }) { return <p className="px-4 py-10 text-center text-xs" style={{ color: error ? '#fca5a5' : '#64748b' }}>{children}</p> }

