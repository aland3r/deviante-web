import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Activity, AlertTriangle, ArrowLeft, BarChart3, ChevronRight, Cpu, Gauge,
  Link2, Play, Plus, RefreshCw, Scan, Trash2, Unlink, Upload, X,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { parameterLatest, parameterStatus } from '../lib/monitoring'
import MachineIllustration from '../components/monitoring/MachineIllustration'
import HealthDriftChart from '../components/monitoring/HealthDriftChart'

const STATUS = {
  healthy: { label: 'Saudável', color: '#10b981', soft: 'rgba(16,185,129,0.14)' },
  watch: { label: 'Atenção', color: '#f59e0b', soft: 'rgba(245,158,11,0.14)' },
  critical: { label: 'Crítico', color: '#dc2626', soft: 'rgba(220,38,38,0.14)' },
  unknown: { label: 'Sem dados', color: '#64748b', soft: 'rgba(100,116,139,0.14)' },
}

const inputBase = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.09)', background: '#0d1017', color: '#e2e8f0',
  fontFamily: "'Inter',sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

const fmt = (value, unit) =>
  value == null ? '—' : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`

const fmtDateTime = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const fmtDuration = (seconds) => {
  if (seconds == null || !Number.isFinite(seconds)) return null
  const s = Math.abs(seconds)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  if (d > 0) return `${d} d ${h} h`
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h} h ${m} min`
  return `${m} min`
}

function Sparkline({ series, color = '#4a90c2' }) {
  if (!series?.length) return null
  const values = series.map((point) => point.v)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1e-6)
  const w = 96
  const h = 26
  const pts = series.map((point, i) => `${(i / (series.length - 1)) * w},${h - ((point.v - min) / span) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" opacity="0.9" />
    </svg>
  )
}

function StatusPill({ status, size = 'sm' }) {
  const meta = STATUS[status] ?? STATUS.unknown
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full font-medium"
      style={{ background: meta.soft, color: meta.color, fontSize: size === 'lg' ? 11 : 10, padding: size === 'lg' ? '3px 9px' : '2px 7px' }}>
      <i className="rounded-full" style={{ width: 6, height: 6, background: meta.color }} />{meta.label}
    </span>
  )
}

const PROFILE_HINT = {
  degrading: 'Tende a subir com o desgaste (temperatura, vibração, corrente).',
  stable: 'Deve permanecer estável (rotação, pressão nominal).',
}

function AddParameterModal({ onClose, onCreate }) {
  const [vals, setVals] = useState({ name: '', unit: '', component: '', profile: 'degrading', baseline: '', warn: '', crit: '' })
  const [busy, setBusy] = useState(false)
  const set = (key, value) => setVals((prev) => ({ ...prev, [key]: value }))

  async function submit(event) {
    event.preventDefault()
    if (!vals.name.trim()) return
    setBusy(true)
    await onCreate(vals)
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,6,12,0.78)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form onSubmit={submit} className="w-full border border-border" role="dialog" aria-modal="true"
        style={{ maxWidth: 460, borderRadius: 8, background: '#111520', boxShadow: '0 24px 70px rgba(0,0,0,0.55)' }}>
        <div className="flex items-start justify-between gap-4 px-4 py-3.5 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Adicionar parâmetro</h2>
            <p className="text-[11px] text-muted-foreground mt-1">Um sinal de saúde monitorado da máquina.</p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary"><X size={13} /></button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
              Nome do parâmetro *
              <input autoFocus value={vals.name} onChange={(e) => set('name', e.target.value)} style={inputBase} placeholder="Ex.: Temperatura do mancal" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Unidade
              <input value={vals.unit} onChange={(e) => set('unit', e.target.value)} style={inputBase} placeholder="°C" />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Componente
            <input value={vals.component} onChange={(e) => set('component', e.target.value)} style={inputBase} placeholder="Ex.: Mancal do fuso" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Comportamento esperado
            <select value={vals.profile} onChange={(e) => set('profile', e.target.value)} style={{ ...inputBase, cursor: 'pointer' }}>
              <option value="degrading" style={{ background: '#0d1017' }}>Degrada com o tempo</option>
              <option value="stable" style={{ background: '#0d1017' }}>Estável (controle)</option>
            </select>
            <span className="text-[10px] text-muted-foreground">{PROFILE_HINT[vals.profile]}</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Valor nominal
              <input type="number" step="any" value={vals.baseline} onChange={(e) => set('baseline', e.target.value)} style={inputBase} placeholder="46" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Limite alerta
              <input type="number" step="any" value={vals.warn} onChange={(e) => set('warn', e.target.value)} style={inputBase} placeholder="60" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Limite crítico
              <input type="number" step="any" value={vals.crit} onChange={(e) => set('crit', e.target.value)} style={inputBase} placeholder="70" />
            </label>
          </div>
          <p className="text-[10px] text-muted-foreground">Uma série histórica simulada é gerada para o parâmetro, pronta para detecção de deriva.</p>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', background: 'transparent' }}>Cancelar</button>
          <button type="submit" disabled={busy || !vals.name.trim()} className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            style={{ background: '#059669', color: 'white', opacity: busy || !vals.name.trim() ? 0.5 : 1 }}>
            <Plus size={12} />{busy ? 'Adicionando…' : 'Adicionar parâmetro'}
          </button>
        </div>
      </form>
    </div>
  )
}

function LinkProcessModal({ processes, onClose, onPick }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,6,12,0.78)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full border border-border" role="dialog" aria-modal="true"
        style={{ maxWidth: 440, maxHeight: 'min(560px, 82vh)', borderRadius: 8, background: '#111520', boxShadow: '0 24px 70px rgba(0,0,0,0.55)' }}>
        <div className="flex items-start justify-between gap-4 px-4 py-3.5 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Vincular processo</h2>
            <p className="text-[11px] text-muted-foreground mt-1">Associe esta máquina a um processo de mineração.</p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary"><X size={13} /></button>
        </div>
        <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(min(560px, 82vh) - 66px)' }}>
          {processes.length ? processes.map((process) => (
            <button key={process.id} type="button" onClick={() => onPick(process)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded hover:bg-secondary/60 text-left" style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>
              <span className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: 'rgba(40,112,168,0.12)', color: '#4d8fc0' }}><Cpu size={13} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-foreground truncate">{process.name}</span>
                <span className="block text-[10px] text-muted-foreground truncate mt-0.5">{process.companyName || 'Empresa não definida'}</span>
              </span>
              <ChevronRight size={13} className="text-muted-foreground shrink-0" />
            </button>
          )) : <p className="px-3 py-8 text-center text-xs text-muted-foreground">Nenhum processo disponível.</p>}
        </div>
      </div>
    </div>
  )
}

function ParameterRow({ parameter, selected, onSelect, onDelete }) {
  const status = parameterStatus(parameter)
  const latest = parameterLatest(parameter)
  const meta = STATUS[status] ?? STATUS.unknown
  return (
    <button type="button" onClick={() => onSelect(parameter.id)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group"
      style={{ background: selected ? 'rgba(5,150,105,0.10)' : '#0d1017', border: `1px solid ${selected ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.07)'}` }}>
      <i className="rounded-full shrink-0" style={{ width: 8, height: 8, background: meta.color }} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground truncate">{parameter.name}</span>
          {parameter.component && <span className="text-[9px] text-muted-foreground truncate hidden sm:inline">· {parameter.component}</span>}
        </span>
        <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
          {fmt(latest, parameter.unit)}
          {parameter.warn != null && <span> · alerta {fmt(parameter.warn, parameter.unit)}</span>}
        </span>
      </span>
      <span className="hidden sm:block shrink-0"><Sparkline series={parameter.series} color={meta.color} /></span>
      <span className="w-6 h-6 rounded flex items-center justify-center shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); onDelete(parameter.id) }} title="Remover parâmetro" role="button">
        <Trash2 size={12} />
      </span>
    </button>
  )
}

const TREATMENTS = [
  { id: 'treated', label: 'Tratada' },
  { id: 'raw', label: 'Crua' },
]

function AnalysisPanel({ machineId, parameter, savedAnalysis, onSaved }) {
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [params, setParams] = useState({ treatment: 'treated', delta: '0.002' })
  const [selectedDrift, setSelectedDrift] = useState(null)
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [saved, setSaved] = useState(false)

  const points = useMemo(() => (parameter.series ?? parameter.readings ?? []).map((sample, index) => ({
    index,
    t: sample.t ?? sample.observedAt,
    v: sample.v ?? sample.value,
  })), [parameter])

  // Reopening a saved analysis restores its detection without recomputing.
  useEffect(() => {
    if (savedAnalysis) {
      setResult({
        method: savedAnalysis.method, delta: savedAnalysis.delta, treatment: savedAnalysis.treatment,
        processedValues: savedAnalysis.processedValues, outlierIndexes: savedAnalysis.outlierIndexes, drifts: savedAnalysis.drifts,
      })
      setSelectedDrift(savedAnalysis.drifts?.[0]?.index ?? null)
    } else {
      setResult(null)
      setSelectedDrift(null)
    }
    setSelectedPoint(null)
    setError('')
    setSaved(false)
  }, [savedAnalysis, parameter.id])

  async function run() {
    setRunning(true)
    setError('')
    setSaved(false)
    try {
      const values = points.map((point) => point.v)
      const raw = await api.detectMonitoringSeries(values, params)
      const drifts = (raw.drifts ?? []).map((d) => ({
        index: d.index, anomalyStartIndex: d.anomaly_start_index ?? d.anomalyStartIndex, value: d.value, width: d.width, estimation: d.estimation,
      }))
      const mapped = {
        method: raw.method, delta: raw.delta, treatment: raw.treatment,
        processedValues: raw.processed_values ?? raw.processedValues ?? [],
        outlierIndexes: raw.outlier_indices ?? raw.outlierIndexes ?? [],
        drifts,
      }
      setResult(mapped)
      setSelectedDrift(drifts[0]?.index ?? null)
      setSelectedPoint(null)
      // "Gero um arquivo separado que fica vinculado" — persist the run onto the machine.
      // The API reloads the persisted series, runs ADWIN and computes RUL/risk
      // server-side. The browser never supplies predictive outcomes.
      const record = await api.saveMachineAnalysis(machineId, {
        parameterId: parameter.id,
        delta: mapped.delta,
        treatment: mapped.treatment,
      })
      setSaved(true)
      onSaved?.(record)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível executar a análise.')
    } finally {
      setRunning(false)
    }
  }

  const processedValues = result?.processedValues?.length === points.length ? result.processedValues : points.map((p) => p.v)
  const drifts = result?.drifts ?? []
  const outliers = useMemo(() => new Set(result?.outlierIndexes ?? []), [result])
  const drift = drifts.find((item) => item.index === selectedDrift) ?? null

  const driftDetail = useMemo(() => {
    if (!drift) return null
    const width = Math.max(1, Math.round(drift.width || 1))
    const before = processedValues.slice(Math.max(0, drift.anomalyStartIndex - width), drift.anomalyStartIndex)
    const after = processedValues.slice(drift.anomalyStartIndex, Math.min(processedValues.length, drift.index + 1))
    const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
    const beforeMean = mean(before)
    const afterMean = mean(after)
    const detectedAt = points[drift.index]?.t
    const startedAt = points[drift.anomalyStartIndex]?.t
    const delaySeconds = detectedAt && startedAt ? (new Date(detectedAt) - new Date(startedAt)) / 1000 : null
    return {
      detectedAt, startedAt, delaySeconds, beforeMean, afterMean,
      magnitude: beforeMean === 0 ? 0 : ((afterMean - beforeMean) * 100) / beforeMean,
      delayTraces: drift.index - drift.anomalyStartIndex,
    }
  }, [drift, processedValues, points])

  return (
    <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#111520' }}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><Scan size={13} color="#059669" />Análise preditiva · IPDD + ADWIN</span>
        <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{parameter.name}{parameter.unit ? ` (${parameter.unit})` : ''}</span>
        <div className="flex-1" />
        <div className="flex rounded border border-border overflow-hidden">
          {TREATMENTS.map((option) => (
            <button key={option.id} type="button" onClick={() => setParams((p) => ({ ...p, treatment: option.id }))} className="px-2.5 py-1 text-[10px]"
              style={{ background: params.treatment === option.id ? 'rgba(5,150,105,0.18)' : '#0d1017', color: params.treatment === option.id ? '#e2e8f0' : '#64748b', border: 0 }}>
              {option.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">δ
          <input type="number" step="0.0001" min="0.0001" max="0.9999" value={params.delta} onChange={(e) => setParams((p) => ({ ...p, delta: e.target.value }))}
            className="px-2 py-1 rounded text-[10px] text-foreground border border-border" style={{ background: '#0d1017', width: 84, fontFamily: "'JetBrains Mono',monospace" }} />
        </label>
        <button type="button" onClick={run} disabled={running} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium text-white disabled:opacity-60" style={{ background: '#059669' }}>
          {running ? <><RefreshCw size={11} className="animate-spin" />Detectando…</> : <><Play size={11} />Detectar deriva</>}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 border-b border-border flex items-start gap-2" style={{ background: 'rgba(220,38,38,0.06)' }}>
          <AlertTriangle size={13} color="#f59e0b" className="mt-0.5 shrink-0" />
          <p className="text-[11px]" style={{ color: '#fca5a5' }}>{error}</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 min-w-0 p-4">
          {result && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                [points.length, 'leituras', Activity, '#10b981'],
                [drifts.length, 'derivas detectadas', Scan, '#dc2626'],
                [`${result.method} · δ ${result.delta}`, result.treatment === 'raw' ? 'série crua' : 'série tratada', Gauge, '#64748b'],
              ].map(([value, label, Icon, color]) => (
                <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border" style={{ background: '#0d1017' }}>
                  <Icon size={13} color={color} />
                  <div className="min-w-0"><p className="text-xs font-semibold text-foreground truncate">{value}</p><p className="text-[9px] text-muted-foreground truncate">{label}</p></div>
                </div>
              ))}
            </div>
          )}
          <HealthDriftChart points={points} processedValues={processedValues} drifts={drifts} outliers={outliers}
            selectedDrift={selectedDrift} selectedPoint={selectedPoint} onSelectDrift={setSelectedDrift} onSelectPoint={setSelectedPoint}
            unit={parameter.unit} warn={parameter.warn} crit={parameter.crit} />
          {!result && !running && (
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Série histórica do parâmetro. Rode a detecção para localizar mudanças de regime (deriva de desempenho).</p>
          )}
          {saved && <p className="text-[11px] text-emerald-400 mt-2 text-center">Análise salva e vinculada à máquina.</p>}
        </div>

        {result && (
          <aside className="shrink-0 border-t lg:border-t-0 lg:border-l border-border p-4" style={{ width: '100%', maxWidth: 300 }}>
            <p className="text-[10px] uppercase text-muted-foreground mb-3" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Detalhe da detecção</p>
            {drift && driftDetail ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-foreground">Drift #{drifts.indexOf(drift) + 1}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: '#fca5a5', background: 'rgba(153,27,27,0.18)' }}>detectado</span>
                </div>
                {[
                  ['Detectado em', fmtDateTime(driftDetail.detectedAt)],
                  ['Degradação começa', fmtDateTime(driftDetail.startedAt)],
                  ['Janela até detecção', fmtDuration(driftDetail.delaySeconds) ?? `${driftDetail.delayTraces} leituras`],
                  ['Antes', fmt(driftDetail.beforeMean, parameter.unit)],
                  ['Depois', fmt(driftDetail.afterMean, parameter.unit)],
                  ['Variação', `${driftDetail.magnitude > 0 ? '+' : ''}${driftDetail.magnitude.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 py-2 border-b border-border text-[11px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground text-right truncate" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{value}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-6">
                <Scan size={16} className="mx-auto mb-2" color="#475569" />
                <p className="text-[11px] text-muted-foreground">{drifts.length ? 'Selecione uma deriva no gráfico.' : 'Nenhuma mudança de regime detectada.'}</p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

export default function MachineDetailPage() {
  const { monitoringId, machineId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const fileInputRef = useRef(null)
  const [machine, setMachine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedParam, setSelectedParam] = useState(null)
  const [openAnalysis, setOpenAnalysis] = useState(null) // a saved analysis being reopened
  const [showAddParam, setShowAddParam] = useState(false)
  const [showLinkProcess, setShowLinkProcess] = useState(false)
  const [processes, setProcesses] = useState([])
  const [uploading, setUploading] = useState(false)

  async function reload(keepSelection = true) {
    try {
      const data = await api.getMachine(machineId)
      if (!data) { setError('Máquina não encontrada.'); return }
      setMachine(data)
      if (!keepSelection || !selectedParam) {
        setSelectedParam(data.parameters?.[0]?.id ?? null)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a máquina.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload(false) }, [machineId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.listProcesses().then(setProcesses).catch(() => setProcesses([])) }, [])
  useEffect(() => {
    const analysisId = searchParams.get('analysisId')
    if (!analysisId || !machine?.analyses?.length) return
    const saved = machine.analyses.find((item) => item.id === analysisId)
    if (saved) { setSelectedParam(saved.parameterId); setOpenAnalysis(saved) }
  }, [machine, searchParams])

  async function handleAddParameter(def) {
    const created = await api.addParameter(machineId, def)
    setShowAddParam(false)
    await reload()
    if (created) { setSelectedParam(created.id); setOpenAnalysis(null) }
  }

  async function handleDeleteParameter(parameterId) {
    await api.deleteParameter(machineId, parameterId)
    if (selectedParam === parameterId) { setSelectedParam(null); setOpenAnalysis(null) }
    reload()
  }

  async function handleLinkProcess(process) {
    await api.linkProcessEquipment(process.id, machineId)
    setShowLinkProcess(false)
    reload()
  }

  async function handleUnlinkProcess(processId) {
    await api.unlinkProcessEquipment(processId, machineId)
    reload()
  }

  async function handleUploadLog(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      await api.uploadEquipmentReadings(machineId, file)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar as leituras.')
    } finally {
      setUploading(false)
    }
  }

  const parameter = useMemo(
    () => machine?.parameters?.find((item) => item.id === selectedParam) ?? null,
    [machine, selectedParam],
  )
  const status = machine ? (machine.parameters?.length ? worstStatus(machine.parameters) : 'unknown') : 'unknown'
  const analyses = machine?.analyses ?? []

  if (loading) {
    return <div style={{ background: '#0d1017', minHeight: 'calc(100vh - 52px)', padding: 32 }}><p className="text-sm text-muted-foreground">Carregando…</p></div>
  }
  if (error) {
    return (
      <div style={{ background: '#0d1017', minHeight: 'calc(100vh - 52px)', padding: 32 }}>
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4" style={{ textDecoration: 'none' }}><ArrowLeft size={12} />Projetos</Link>
        <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ background: '#0d1017', margin: '-2rem calc(-50vw + 50%)', padding: '0 calc(50vw - 50%)', minHeight: 'calc(100vh - 52px)' }}>
      {showAddParam && <AddParameterModal onClose={() => setShowAddParam(false)} onCreate={handleAddParameter} />}
      {showLinkProcess && <LinkProcessModal processes={processes.filter((process) => !(machine.processes ?? []).some((linked) => linked.id === process.id))} onClose={() => setShowLinkProcess(false)} onPick={handleLinkProcess} />}
      <input ref={fileInputRef} type="file" accept=".csv,.xes,.log,.txt" onChange={handleUploadLog} style={{ display: 'none' }} />

      <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8" style={{ maxWidth: 1120, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-5 flex-wrap">
          <button type="button" onClick={() => navigate('/equipment')} className="hover:text-foreground flex items-center gap-1" style={{ background: 'transparent', border: 0, cursor: 'pointer' }}><ArrowLeft size={12} />Equipamentos</button>
          <ChevronRight size={12} color="#334155" />
          {(machine.monitoringId || monitoringId) && <><button type="button" onClick={() => navigate(`/monitoring/${machine.monitoringId || monitoringId}`)} className="hover:text-foreground truncate" style={{ background: 'transparent', border: 0, cursor: 'pointer', maxWidth: 200 }}>{machine.monitoringName || 'Monitoramento'}</button><ChevronRight size={12} color="#334155" /></>}
          <span className="text-foreground truncate" style={{ maxWidth: 220 }}>{machine.name}</span>
        </div>

        <PredictionSummary machine={machine} />

        <EquipmentSchedules machine={machine} onOpenAll={() => navigate(`/schedules?equipmentId=${machine.id}`)} />

        {/* Hero: comprida/retangular — illustration left, identity + parameters right. */}
        <div className="rounded-xl border border-border overflow-hidden mb-5" style={{ background: '#111520' }}>
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)' }}>
            <div className="relative border-r border-border" style={{ background: '#080c14', minHeight: 300 }}>
              <div className="absolute inset-0 p-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <StatusPill status={status} size="lg" />
                  {machine.tag && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontFamily: "'JetBrains Mono',monospace" }}>{machine.tag}</span>}
                </div>
                <div className="flex-1 flex items-center justify-center py-4"><div style={{ width: '100%', maxWidth: 300 }}><MachineIllustration kind={machine.kind} /></div></div>
                <div className="grid grid-cols-2 gap-2 text-[10px]" style={{ color: '#64748b', fontFamily: "'JetBrains Mono',monospace" }}>
                  {machine.manufacturer && <span>Fab. {machine.manufacturer}</span>}
                  {machine.model && <span>Mod. {machine.model}</span>}
                  {machine.location && <span className="col-span-2 truncate">{machine.location}</span>}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col min-w-0">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="min-w-0">
                  <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 19, color: 'white', letterSpacing: '-0.01em' }} className="truncate">{machine.name}</h1>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Saúde do equipamento · {machine.parameters?.length ?? 0} parâmetro{(machine.parameters?.length ?? 0) !== 1 ? 's' : ''} monitorado{(machine.parameters?.length ?? 0) !== 1 ? 's' : ''}</p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || !(machine.parameters?.length)} title="Enviar log de leituras"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium shrink-0" style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', background: 'rgba(255,255,255,0.04)', opacity: uploading || !(machine.parameters?.length) ? 0.5 : 1 }}>
                  {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />}<span className="hidden sm:inline">Enviar log</span>
                </button>
              </div>

              {/* Related process — bidirectional navigation. */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {(machine.processes ?? []).map((process) => <span key={process.id} className="inline-flex items-center gap-1">
                  <button type="button" onClick={() => navigate(`/processes/${process.id}`)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px]" style={{ background: 'rgba(40,112,168,0.14)', color: '#4d8fc0', border: '1px solid rgba(40,112,168,0.28)' }}><Cpu size={11} />{process.name}<ChevronRight size={11} /></button>
                  <button type="button" onClick={() => handleUnlinkProcess(process.id)} className="text-muted-foreground hover:text-foreground" title="Desvincular processo" style={{ background: 'transparent', border: 0, cursor: 'pointer' }}><Unlink size={12} /></button>
                </span>)}
                <button type="button" onClick={() => setShowLinkProcess(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground" style={{ border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent' }}><Link2 size={11} />Vincular processo</button>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Parâmetros</p>
                <button type="button" onClick={() => setShowAddParam(true)} className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300" style={{ background: 'transparent', border: 0, cursor: 'pointer' }}>
                  <Plus size={12} />Adicionar parâmetro
                </button>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 260 }}>
                {machine.parameters?.length ? machine.parameters.map((param) => (
                  <ParameterRow key={param.id} parameter={param}
                    selected={selectedParam === param.id}
                    onSelect={(id) => { setSelectedParam(id); setOpenAnalysis(null); setSearchParams({}) }}
                    onDelete={handleDeleteParameter} />
                )) : (
                  <div className="rounded-lg border border-dashed border-border p-5 text-center" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                    <Gauge size={18} className="mx-auto mb-2" color="#475569" />
                    <p className="text-[11px] text-muted-foreground">Nenhum parâmetro ainda. Adicione um sinal de saúde para começar a monitorar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis for the selected parameter. */}
        {parameter && (
          <div className="mb-5">
            <AnalysisPanel machineId={machineId} parameter={parameter} savedAnalysis={openAnalysis}
              onSaved={(record) => { if (record?.id) setSearchParams({ analysisId: record.id }); reload() }} />
          </div>
        )}

        {/* Linked analyses — each ADWIN run is a separate artifact tied to the machine. */}
        {analyses.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#111520' }}>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <BarChart3 size={13} color="#6366f1" /><p className="text-xs font-semibold text-foreground">Análises da máquina</p>
              <span className="text-[10px] text-muted-foreground">{analyses.length}</span>
            </div>
            <div>
              {analyses.map((analysis) => (
                <button key={analysis.id} type="button"
                  onClick={() => { setSelectedParam(analysis.parameterId); setOpenAnalysis(analysis); setSearchParams({ analysisId: analysis.id }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-secondary/40 text-left" style={{ background: 'transparent', border: 0, borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <span className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}><Scan size={12} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-foreground truncate">{analysis.parameterName}</span>
                    <span className="block text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                      {analysis.method} · δ {analysis.delta} · {analysis.driftCount} deriva{analysis.driftCount !== 1 ? 's' : ''} · {fmtDateTime(analysis.createdAt)}
                    </span>
                  </span>
                  <ChevronRight size={13} className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PredictionSummary({ machine }) {
  const prediction = machine.latestPrediction ?? machine.prediction ?? machine.analyses?.[0]?.prediction ?? null
  const probability = prediction?.failureProbability
  const probabilityLabel = probability == null ? 'Não calculada' : `${(Number(probability) <= 1 ? Number(probability) * 100 : Number(probability)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
  const rul = prediction?.rulValue
  const rulUnit = prediction?.rulUnit ?? 'traces'
  const recommendation = prediction?.recommendation ?? machine.recommendation ?? machine.analyses?.[0]?.recommendation
  return <section className="grid gap-3 mb-5 md:grid-cols-3">
    <Metric title="Vida útil restante (RUL)" value={rul == null ? 'Previsão indisponível' : `${Number(rul).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${rulUnit}`} hint={prediction?.computedAt ? `Calculada em ${fmtDateTime(prediction.computedAt)}` : 'Aguardando uma previsão persistida'} />
    <Metric title="Probabilidade de falha" value={probabilityLabel} hint={prediction?.failureHorizonValue ? `Horizonte de ${prediction.failureHorizonValue} ${prediction.failureHorizonUnit ?? 'traces'}` : 'Horizonte não informado'} />
    <Metric title="Recomendação" value={recommendation || 'Sem recomendação'} hint={[prediction?.modelVersion && `Modelo ${prediction.modelVersion}`, prediction?.provenance].filter(Boolean).join(' · ') || 'Vinculada à análise mais recente'} />
  </section>
}

function Metric({ title, value, hint }) {
  return <div className="rounded-xl border border-border p-4" style={{ background: '#111520' }}><p className="text-[10px] uppercase text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{title}</p><p className="text-base font-bold text-foreground mt-2">{value}</p><p className="text-[10px] text-muted-foreground mt-1">{hint}</p></div>
}

function EquipmentSchedules({ machine, onOpenAll }) {
  const rows = machine.schedules ?? []
  return <section className="rounded-xl border border-border overflow-hidden mb-5" style={{ background: '#111520' }}><div className="flex items-center justify-between px-4 py-3 border-b border-border"><div><p className="text-xs font-semibold text-foreground">Agendamentos do equipamento</p><p className="text-[10px] text-muted-foreground mt-0.5">Manutenções planejadas e ocorrências</p></div><button onClick={onOpenAll} className="text-[11px] text-emerald-400">Ver agenda</button></div>{rows.length ? rows.slice(0, 3).map((row) => <div key={row.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0"><span className="w-2 h-2 rounded-full" style={{ background: row.status === 'completed' ? '#10b981' : row.status === 'in_progress' ? '#f59e0b' : '#4d8fc0' }} /><span className="min-w-0 flex-1 text-xs text-foreground truncate">{row.title || row.recommendation || 'Manutenção preventiva'}</span><span className="text-[10px] text-muted-foreground">{row.scheduledStart ? new Date(row.scheduledStart).toLocaleDateString('pt-BR') : '—'}</span></div>) : <p className="px-4 py-5 text-center text-[11px] text-muted-foreground">Nenhuma manutenção agendada.</p>}</section>
}

function worstStatus(parameters) {
  const order = { critical: 3, watch: 2, healthy: 1, unknown: 0 }
  let worst = 'healthy'
  for (const parameter of parameters) {
    const status = parameterStatus(parameter)
    if (order[status] > order[worst]) worst = status
  }
  return worst
}
