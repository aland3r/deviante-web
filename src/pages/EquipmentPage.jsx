import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { canDelete } from '../lib/permissions'
import FormModal, { Field, Select, TextInput } from '../components/ui/FormModal'
import { FilterSelect, SearchBox, State, Surface } from './OperationsPage'

// Campos aceitos por POST/PUT /api/equipment (EquipmentRequest). O PUT grava
// todos eles, então a edição reenvia os valores atuais junto com os alterados.
const EQUIPMENT_FIELDS = ['name', 'tag', 'kind', 'location', 'description', 'manufacturer', 'model', 'serialNumber', 'status', 'assetUrl', 'assetFormat']
const toEquipmentRequest = (values) => Object.fromEntries(EQUIPMENT_FIELDS.filter((key) => values[key] !== undefined).map((key) => [key, values[key] ?? null]))

const STATUS = { healthy: ['Saudável', 'var(--success)'], watch: ['Atenção', 'var(--warn)'], critical: ['Crítico', 'var(--danger)'], unknown: ['Sem análise', 'var(--muted-foreground)'] }

export default function EquipmentPage() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [processId, setProcessId] = useState('')
  const [monitoringId, setMonitoringId] = useState('')
  const [health, setHealth] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const { user } = useAuth()
  const allowDelete = canDelete(user)
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

  async function removeEquipment(machine) {
    if (!window.confirm(`Excluir o equipamento "${machine.name}"? Parâmetros, leituras, análises e agendamentos dele também serão apagados.`)) return
    try { await api.deleteMachine(machine.id); setRows((current) => current.filter((row) => row.id !== machine.id)) }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Não foi possível excluir o equipamento.') }
  }

  const actions = <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'var(--ok-strong)' }}><Plus size={12} />Novo equipamento</button>
  return <Surface title="Equipamentos" subtitle={`${rows.length} ativos cadastrados com histórico, análises e vínculos.`} icon={Cpu} actions={actions}>
    {creating && <CreateEquipmentModal onClose={() => setCreating(false)} onCreate={async (data) => { await api.createEquipment(toEquipmentRequest(data)); setCreating(false); load() }} />}
    {editing && <CreateEquipmentModal initial={editing} onClose={() => setEditing(null)} onCreate={async (data) => { await api.updateMachine(editing.id, toEquipmentRequest({ ...editing, ...data })); setEditing(null); load() }} />}
    <div className="grid gap-2 mb-4 sm:grid-cols-[minmax(220px,1fr)_190px_190px_150px]">
      <SearchBox value={query} onChange={setQuery} placeholder="Buscar equipamento, TAG, processo ou local…" compact />
      <FilterSelect value={processId} onChange={setProcessId} label="Todos os processos" options={processes} />
      <FilterSelect value={monitoringId} onChange={setMonitoringId} label="Todos os monitoramentos" options={monitorings} />
      <FilterSelect value={health} onChange={setHealth} label="Toda condição" options={[
        { value: 'healthy', label: 'Saudável' }, { value: 'watch', label: 'Atenção' }, { value: 'critical', label: 'Crítico' }, { value: 'unknown', label: 'Sem análise' },
      ]} />
    </div>
    {loading ? <State>Carregando…</State> : error ? <State error>{error}</State> : <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-left" style={{ minWidth: 1120, background: 'var(--surface-raised)' }}>
        <thead><tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
          <Header>Equipamento</Header><Header>Processo</Header><Header>Monitoramento</Header><Header right>Leituras</Header><Header right>RUL</Header><Header right>Falha</Header><Header>Condição</Header><Header right>Ações</Header>
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
            <Cell right><div className="flex justify-end gap-1">
              <button type="button" onClick={() => setEditing(machine)} aria-label={`Editar ${machine.name}`} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
              {allowDelete && <button type="button" onClick={() => removeEquipment(machine)} aria-label={`Excluir ${machine.name}`} className="p-1.5 rounded hover:bg-red-950/40" style={{ color: 'var(--crit-soft)' }}><Trash2 size={12} /></button>}
            </div></Cell>
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

function CreateEquipmentModal({ initial = null, onClose, onCreate }) {
  const [values, setValues] = useState({ name: initial?.name ?? '', kind: initial?.kind ?? 'generico', tag: initial?.tag ?? '', location: initial?.location ?? '', manufacturer: initial?.manufacturer ?? '', model: initial?.model ?? '' })
  const [busy, setBusy] = useState(false)
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }))
  const submit = async () => { setBusy(true); try { await onCreate(values) } finally { setBusy(false) } }
  return <FormModal title={initial ? 'Editar equipamento' : 'Cadastrar equipamento'} subtitle={initial ? 'Altere os dados de identificação do ativo.' : 'Crie o ativo antes de associá-lo a processos ou monitoramentos.'}
    onClose={onClose} onSubmit={submit} busy={busy} canSubmit={Boolean(values.name.trim())} submitLabel={initial ? 'Salvar' : 'Cadastrar'}>
    <Field label="Nome *" wide><TextInput value={values.name} onChange={set('name')} placeholder="Ex.: Torno CNC Prod1" /></Field>
    <Field label="Tipo"><Select value={values.kind} onChange={set('kind')}><option value="torno">Torno CNC</option><option value="fresadora">Fresadora</option><option value="compressor">Compressor</option><option value="esteira">Esteira</option><option value="generico">Genérico</option></Select></Field>
    <Field label="TAG"><TextInput value={values.tag} onChange={set('tag')} placeholder="Ex.: TRN-01" /></Field>
    <Field label="Fabricante"><TextInput value={values.manufacturer} onChange={set('manufacturer')} placeholder="Ex.: Romi" /></Field>
    <Field label="Modelo"><TextInput value={values.model} onChange={set('model')} placeholder="Ex.: GL 240" /></Field>
    <Field label="Localização" wide><TextInput value={values.location} onChange={set('location')} placeholder="Ex.: Célula 01" /></Field>
  </FormModal>
}

