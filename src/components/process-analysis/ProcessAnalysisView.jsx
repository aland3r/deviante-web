import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Clock3,
  Layers, Play, RefreshCw, Scan, SkipForward, SlidersHorizontal, XCircle,
} from 'lucide-react'
import BrandMark from '../layout/BrandMark'
import { api } from '../../lib/api'

const formatSeconds = (value) => `${Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`
const EMPTY_LIST = []

/** The `scope` select value that reproduces a saved run's series. */
const scopeToValue = (scope) => {
  if (scope?.kind === 'operation' && scope.operationId) return `op:${scope.operationId}`
  if (scope?.kind === 'activity' && scope.activityId) return `act:${scope.activityId}`
  return ''
}

/**
 * Maintenance is scheduled against a calendar, so a drift located only by its
 * position in the series cannot be acted on. Every timestamp the API returns is
 * rendered — never inferred from row order — and missing ones stay visibly
 * absent rather than being filled in.
 */
const formatDateTime = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('pt-BR')
}

/** Detection delay as a duration a planner can reason about, not as seconds. */
const formatDuration = (totalSeconds) => {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return null
  const seconds = Math.abs(totalSeconds)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days} d ${hours} h`
  if (hours > 0) return `${hours} h ${minutes} min`
  if (minutes > 0) return `${minutes} min`
  return `${Math.round(seconds)} s`
}

const TREATMENTS = [
  { id: 'treated', label: 'Tratada', hint: 'Substitui picos isolados e suaviza antes do ADWIN (base de chão de fábrica).' },
  { id: 'raw', label: 'Crua', hint: 'Série como lida do log, sem tratamento (reproduz o baseline sintético da pesquisa).' },
]

function percentile(sorted, fraction) {
  if (!sorted.length) return 0
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))]
}

function findOutliers(points) {
  const values = points.map((point) => point.durationSeconds).sort((a, b) => a - b)
  if (values.length < 4) return new Set()
  const q1 = percentile(values, 0.25)
  const q3 = percentile(values, 0.75)
  const spread = q3 - q1
  const low = q1 - spread * 1.5
  const high = q3 + spread * 1.5
  return new Set(points.filter((point) => point.durationSeconds < low || point.durationSeconds > high).map((point) => point.index))
}

function TraceList({ points, driftIndexes, outliers, dismissed, selectedTrace, onSelect }) {
  return (
    // Sized by the flex parent instead of a `calc(100vh - 155px)` guess: that
    // number assumed a fixed chrome height and stopped being true the moment
    // the parameters panel could push the list down.
    <div className="flex-1 min-h-0 overflow-y-auto">
      {points.map((point) => {
        const isDismissed = dismissed.has(point.index)
        const isOutlier = outliers.has(point.index) && !isDismissed
        const isDrift = driftIndexes.has(point.index) && !isDismissed
        return (
          <button key={point.traceId} type="button" onClick={() => onSelect(point.index)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors"
            style={{
              background: selectedTrace === point.index ? 'rgba(40,112,168,0.18)' : 'transparent',
              color: selectedTrace === point.index ? '#e2e8f0' : '#64748b',
              opacity: isDismissed ? 0.4 : 1,
              border: 0,
            }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: isDismissed ? '#475569' : isDrift ? '#dc2626' : isOutlier ? '#f59e0b' : '#10b981' }} />
            <span className="flex-1 min-w-0">
              <span className="block text-[10px] truncate"
                style={{ fontFamily: "'JetBrains Mono',monospace", textDecoration: isDismissed ? 'line-through' : 'none' }}>
                {point.caseId}
              </span>
              <span className="block text-[9px] truncate" style={{ color: '#475569', fontFamily: "'JetBrains Mono',monospace" }}>
                {formatDate(point.startedAt)}
              </span>
            </span>
            <span className="text-[9px] shrink-0" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              {formatSeconds(point.durationSeconds)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function DriftChart({ points, processedValues, drifts, outliers, dismissed, selectedDrift, selectedTrace, onSelectDrift, onSelectTrace }) {
  const width = 900
  const height = 410
  const pad = { left: 58, right: 24, top: 28, bottom: 42 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const rawValues = points.map((point) => point.durationSeconds)
  const values = [...rawValues, ...processedValues]
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const range = Math.max(rawMax - rawMin, rawMax * 0.1, 1)
  const min = Math.max(0, rawMin - range * 0.08)
  const max = rawMax + range * 0.08
  const lastIndex = Math.max(points.length - 1, 1)
  const x = (arrayIndex) => pad.left + (arrayIndex / lastIndex) * innerW
  const y = (metric) => pad.top + (1 - (metric - min) / Math.max(max - min, 1)) * innerH
  const linePoints = points.map((point, index) => `${x(index)},${y(point.durationSeconds)}`).join(' ')
  const processedLinePoints = processedValues.map((value, index) => `${x(index)},${y(value)}`).join(' ')
  const yTicks = Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4)
  const xTicks = Array.from(new Set([0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(lastIndex * fraction))))

  function selectFromPointer(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const localX = ((event.clientX - rect.left) / rect.width) * width
    const arrayIndex = Math.max(0, Math.min(points.length - 1, Math.round(((localX - pad.left) / innerW) * lastIndex)))
    const point = points[arrayIndex]
    onSelectTrace(point.index)
    const nearby = drifts.find((drift) => Math.abs(drift.index - point.index) <= Math.max(2, points.length * 0.01))
    if (nearby) onSelectDrift(nearby.index)
  }

  return (
    <div className="flex-1 min-h-0 px-4 sm:px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-xs font-semibold text-foreground">Duração total por trace</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Log completo · ADWIN · ordem cronológica</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-slate-500" />Trace original</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-blue-400" />Série tratada</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-amber-400" />Início da anomalia</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-amber-500" />Outlier</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-red-600" />Drift</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full"
        style={{ height: 'calc(100% - 42px)', minHeight: 280, cursor: 'crosshair' }}
        onClick={selectFromPointer} role="img" aria-label="Gráfico temporal de detecção de desvios">
        <rect width={width} height={height} fill="#0d1119" rx="4" />
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.left - 10} y={y(tick) + 3} textAnchor="end" fill="#475569" fontSize="10">{formatSeconds(tick)}</text>
          </g>
        ))}
        {/* Faint interval band for the selected drift only. */}
        {drift && (() => {
          const startArrayIndex = points.findIndex((point) => point.index === drift.anomalyStartIndex)
          const arrayIndex = points.findIndex((point) => point.index === drift.index)
          return startArrayIndex >= 0 && arrayIndex >= 0 ? (
            <rect x={x(startArrayIndex)} y={pad.top} width={Math.max(1, x(arrayIndex) - x(startArrayIndex))}
              height={innerH} fill="rgba(245,158,11,0.10)" />
          ) : null
        })()}
        {/* Every detection as a tick on a top rail plus a faint guide, so dozens
            of drifts read as a density band instead of a wall of overlapping
            "Detecção #N" labels. Only the selected drift gets a name (below). */}
        {drifts.map((driftItem) => {
          const arrayIndex = points.findIndex((point) => point.index === driftItem.index)
          if (arrayIndex < 0) return null
          const dx = x(arrayIndex)
          const isSelected = selectedDrift === driftItem.index
          return (
            <g key={driftItem.index} onClick={(event) => { event.stopPropagation(); onSelectDrift(driftItem.index) }}
              style={{ cursor: 'pointer' }}>
              <rect x={dx - 5} y={pad.top} width={10} height={innerH} fill="transparent" />
              {!isSelected && (
                <line x1={dx} x2={dx} y1={pad.top} y2={height - pad.bottom} stroke="#dc2626" strokeWidth={1} opacity={0.2} />
              )}
              <path d={`M ${dx - 4} ${pad.top - 9} L ${dx + 4} ${pad.top - 9} L ${dx} ${pad.top - 1} Z`}
                fill={isSelected ? '#ef4444' : 'rgba(220,38,38,0.5)'} />
            </g>
          )
        })}
        <polyline points={linePoints} fill="none" stroke="#64748b" strokeWidth="1" opacity="0.42" />
        <polyline points={processedLinePoints} fill="none" stroke="#4a90c2" strokeWidth="1.8" opacity="0.95" />
        {points.map((point, index) => outliers.has(point.index) && !dismissed.has(point.index) ? (
          <circle key={point.traceId} cx={x(index)} cy={y(point.durationSeconds)} r="2.4" fill="#f59e0b" opacity="0.72" />
        ) : null)}
        {selectedTrace != null && (() => {
          const index = points.findIndex((point) => point.index === selectedTrace)
          const point = points[index]
          return point ? (
            <g>
              <line x1={x(index)} x2={x(index)} y1={pad.top} y2={height - pad.bottom} stroke="#e2e8f0" opacity="0.45" />
              <circle cx={x(index)} cy={y(point.durationSeconds)} r="5" fill="#e2e8f0" stroke="#2870a8" strokeWidth="2" />
            </g>
          ) : null
        })()}
        {/* Selected drift on top of the series: emphasized guides + one label. */}
        {drift && (() => {
          const startArrayIndex = points.findIndex((point) => point.index === drift.anomalyStartIndex)
          const arrayIndex = points.findIndex((point) => point.index === drift.index)
          if (arrayIndex < 0) return null
          const dx = x(arrayIndex)
          const number = drifts.indexOf(drift) + 1
          const labelX = Math.min(Math.max(dx, pad.left + 32), width - pad.right - 32)
          return (
            <g pointerEvents="none">
              {startArrayIndex >= 0 && (
                <line x1={x(startArrayIndex)} x2={x(startArrayIndex)} y1={pad.top} y2={height - pad.bottom}
                  stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 4" />
              )}
              <line x1={dx} x2={dx} y1={pad.top} y2={height - pad.bottom} stroke="#ef4444" strokeWidth={2} />
              <g transform={`translate(${labelX},${pad.top + 3})`}>
                <rect x={-31} y={0} width={62} height={15} rx={3} fill="#dc2626" />
                <text x={0} y={11} textAnchor="middle" fill="#fff" fontSize="9.5" fontWeight="600"
                  fontFamily="'JetBrains Mono',monospace">Drift #{number}</text>
              </g>
            </g>
          )
        })()}
        {xTicks.map((tick) => (
          <text key={tick} x={x(tick)} y={height - 20} textAnchor="middle" fill="#475569" fontSize="10">
            {points[tick]?.startedAt ? formatDate(points[tick].startedAt) : points[tick]?.index}
          </text>
        ))}
        <text x={width / 2} y={height - 4} textAnchor="middle" fill="#64748b" fontSize="10">
          {points.some((point) => point.startedAt) ? 'Início da execução' : 'Traces do log'}
        </text>
      </svg>
    </div>
  )
}

export default function ProcessAnalysisView({ processId, processName, eventLog, analysisId, onBack, onGoHome }) {
  const [analysis, setAnalysis] = useState(null)
  const [runState, setRunState] = useState('running')
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [selectedDrift, setSelectedDrift] = useState(null)
  const [selectedTrace, setSelectedTrace] = useState(null)
  const [dismissed, setDismissed] = useState(new Set())

  // UC13 — the parameters the Manager chooses before running. They are held
  // separately from `analysis` so the panel keeps showing what is about to run
  // while the previous result stays on screen.
  const [operations, setOperations] = useState(EMPTY_LIST)
  // `scope` selects what series ADWIN runs on: '' = whole-trace duration,
  // `act:<id>` = one Activity's sojourn, `op:<id>` = one raw operation's.
  const [params, setParams] = useState({ scope: '', treatment: 'treated', delta: '0.002' })
  const [showParams, setShowParams] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.listOperations(processId)
      .then((result) => { if (!cancelled) setOperations(Array.isArray(result) ? result : EMPTY_LIST) })
      .catch(() => { if (!cancelled) setOperations(EMPTY_LIST) })
    return () => { cancelled = true }
  }, [processId])

  // Read through a ref so editing a parameter does not, by itself, re-trigger
  // the effect below and silently launch a run the Manager did not ask for.
  const paramsRef = useRef(params)
  useEffect(() => { paramsRef.current = params }, [params])

  const runAnalysis = useCallback(async (overrides) => {
    const started = performance.now()
    setRunState('running')
    setError('')
    const effective = { ...paramsRef.current, ...(overrides ?? {}) }
    const scope = effective.scope ?? ''
    const request = {
      operationId: scope.startsWith('op:') ? scope.slice(3) : '',
      activityId: scope.startsWith('act:') ? scope.slice(4) : '',
      treatment: effective.treatment,
      delta: effective.delta,
    }
    try {
      const result = await api.runProcessAnalysis(processId, analysisId, request)
      setAnalysis(result)
      setSelectedDrift(result.drifts[0]?.index ?? null)
      setSelectedTrace(null)
      // A fresh run recomputes outliers from scratch, so trace indexes the
      // Manager had desconsiderado no longer refer to the same points. Clear
      // them, otherwise the "traces analisados" count would subtract stale ids.
      setDismissed(new Set())
      setElapsed((performance.now() - started) / 1000)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setRunState('done')
    }
  }, [processId, analysisId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (analysisId) {
        try {
          const saved = await api.getAnalysis(analysisId)
          if (cancelled) return
          // Summary-only (no points) → run and persist; full payload → reopen.
          if (Array.isArray(saved?.points) && saved.points.length > 0) {
            setAnalysis(saved)
            setSelectedDrift(saved.drifts?.[0]?.index ?? null)
            // Restore where the Manager left off — the desconsiderados persisted
            // with the run, and the parameters it was executed with — instead of
            // starting from an empty set and the default series.
            setDismissed(new Set(saved.dismissedIndexes ?? EMPTY_LIST))
            setParams((current) => ({
              ...current,
              scope: scopeToValue(saved.scope),
              treatment: saved.treatment ?? current.treatment,
              delta: saved.delta != null ? String(saved.delta) : current.delta,
            }))
            setRunState('done')
            return
          }
        } catch {
          // Fall through to a fresh run.
        }
      }
      if (!cancelled) runAnalysis()
    }
    load()
    return () => { cancelled = true }
  }, [analysisId, runAnalysis])

  // Persist the desconsiderados (debounced) onto the saved run, so a reload or
  // reopen restores them. The first pass after a load/run is skipped: it would
  // only echo the value we just hydrated or the empty set a fresh run cleared.
  const dismissedSynced = useRef(false)
  useEffect(() => {
    if (!analysisId || !analysis) return undefined
    if (!dismissedSynced.current) { dismissedSynced.current = true; return undefined }
    const handle = setTimeout(() => {
      api.updateDismissedTraces(analysisId, [...dismissed]).catch(() => {})
    }, 500)
    return () => clearTimeout(handle)
  }, [dismissed, analysisId, analysis])

  const points = analysis?.points ?? EMPTY_LIST
  const drifts = analysis?.drifts ?? EMPTY_LIST
  const drift = drifts.find((item) => item.index === selectedDrift) ?? null
  const selectedPoint = points.find((item) => item.index === selectedTrace) ?? null
  const processedValues = analysis?.processedValues?.length === points.length
    ? analysis.processedValues
    : points.map((point) => point.durationSeconds)
  const outliers = useMemo(
    () => analysis?.outlierIndexes
      ? new Set(analysis.outlierIndexes)
      : findOutliers(points),
    [analysis?.outlierIndexes, points],
  )
  const driftIndexes = useMemo(() => new Set(drifts.map((item) => item.index)), [drifts])
  const selectedIsDismissed = selectedTrace != null && dismissed.has(selectedTrace)
  const selectedIsOutlier = selectedTrace != null && outliers.has(selectedTrace) && !selectedIsDismissed

  // How many traces the Manager marked "pra sumir": only those that are still
  // actual points, so the count never drops below the real population.
  const dismissedCount = useMemo(
    () => points.reduce((total, point) => (dismissed.has(point.index) ? total + 1 : total), 0),
    [points, dismissed],
  )
  const totalTraces = analysis?.traceCount ?? points.length
  const remainingTraces = Math.max(totalTraces - dismissedCount, 0)
  const outliersRemaining = outliers.size - [...dismissed].filter((item) => outliers.has(item)).length

  // Distinct Activities the mapped operations resolve to (many raw aliases can
  // share one Activity). Doubles as the "por atividade" options in the filter
  // and the "atividades diferentes" count — no extra request.
  const activities = useMemo(() => {
    const byId = new Map()
    for (const operation of operations) {
      if (operation.activityId && !byId.has(operation.activityId)) {
        byId.set(operation.activityId, operation.activityName || 'Atividade')
      }
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name }))
  }, [operations])
  const activityCount = activities.length

  // Persistent readout of the parameters this run was executed with.
  const seriesLabel = analysis?.scope?.kind === 'operation'
    ? (analysis.scope.operationLabel ?? 'operação')
    : analysis?.scope?.kind === 'activity'
      ? (analysis.scope.activityLabel ?? 'atividade')
      : 'trace total'
  const isSojournScope = analysis?.scope?.kind === 'operation' || analysis?.scope?.kind === 'activity'
  const treatmentLabel = analysis?.treatment === 'raw' ? 'crua' : 'tratada'

  return (
    <div className="flex flex-col w-full overflow-hidden" style={{ height: '100vh', background: '#0d1017', fontFamily: "'Inter',sans-serif" }}>
      <header className="shrink-0 flex items-center gap-3 px-3 sm:px-5 border-b border-border" style={{ height: 52, background: '#111520' }}>
        <BrandMark />
        <button type="button" onClick={onGoHome} title="Voltar aos projetos"
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground"
          style={{ background: 'rgba(255,255,255,0.05)' }}><ArrowLeft size={11} /><span className="hidden sm:inline">Projetos</span></button>
        <ChevronRight className="hidden md:block" size={13} color="#334155" />
        <button type="button" onClick={onBack} className="hidden md:block px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground truncate"
          style={{ maxWidth: 220, background: 'rgba(255,255,255,0.05)' }}>{processName}</button>
        <ChevronRight className="hidden md:block" size={13} color="#334155" />
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
          <Scan size={13} /><span className="hidden sm:inline">Análise de desvios</span>
        </span>
        <span className="hidden lg:block px-2 py-0.5 rounded text-[10px] text-muted-foreground border border-border"
          style={{ fontFamily: "'JetBrains Mono',monospace" }}>{analysis?.eventLog?.fileName ?? eventLog?.fileName ?? 'log de eventos'}</span>
        <div className="flex-1" />
        <button type="button" onClick={() => setShowParams((open) => !open)}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded text-[11px] border border-border text-muted-foreground hover:text-foreground"
          style={{ background: showParams ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
          <SlidersHorizontal size={12} /><span className="hidden sm:inline">Parâmetros</span>
        </button>
        <button type="button" onClick={() => runAnalysis()} disabled={runState === 'running'}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded text-xs font-medium text-white disabled:opacity-60"
          style={{ background: '#991b1b' }}>
          {runState === 'running'
            ? <><RefreshCw size={12} className="animate-spin" /><span className="hidden sm:inline">Processando...</span></>
            : <><Play size={12} /><span className="hidden sm:inline">Reexecutar análise</span></>}
        </button>
      </header>

      {showParams && (
        <div className="shrink-0 border-b border-border px-3 sm:px-5 py-3" style={{ background: '#111520' }}>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-[9px] uppercase text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Série analisada</span>
              <select value={params.scope}
                onChange={(event) => setParams((current) => ({ ...current, scope: event.target.value }))}
                className="px-2 py-1.5 rounded text-[11px] text-foreground border border-border"
                style={{ background: '#0d1017', minWidth: 240 }}>
                <option value="">Duração total do trace</option>
                {activities.length > 0 && (
                  <optgroup label="Por atividade">
                    {activities.map((activity) => (
                      <option key={activity.id} value={`act:${activity.id}`}>
                        Atividade · {activity.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {operations.length > 0 && (
                  <optgroup label="Por operação (rótulo cru)">
                    {operations.map((operation) => (
                      <option key={operation.id} value={`op:${operation.id}`}>
                        Sojourn · {operation.rawLabel}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Tratamento</span>
              <div className="flex rounded border border-border overflow-hidden">
                {TREATMENTS.map((option) => (
                  <button key={option.id} type="button" title={option.hint}
                    onClick={() => setParams((current) => ({ ...current, treatment: option.id }))}
                    className="px-3 py-1.5 text-[11px]"
                    style={{
                      background: params.treatment === option.id ? 'rgba(40,112,168,0.22)' : '#0d1017',
                      color: params.treatment === option.id ? '#e2e8f0' : '#64748b',
                      border: 0,
                    }}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[9px] uppercase text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>δ (sensibilidade)</span>
              <input type="number" step="0.0001" min="0.0001" max="0.9999" value={params.delta}
                onChange={(event) => setParams((current) => ({ ...current, delta: event.target.value }))}
                className="px-2 py-1.5 rounded text-[11px] text-foreground border border-border"
                style={{ background: '#0d1017', width: 110, fontFamily: "'JetBrains Mono',monospace" }} />
            </label>

            <button type="button" onClick={() => runAnalysis()} disabled={runState === 'running'}
              className="flex items-center gap-1.5 px-3 py-2 rounded text-[11px] font-medium text-white disabled:opacity-60"
              style={{ background: '#2870a8' }}>
              <Play size={11} />Executar com estes parâmetros
            </button>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {TREATMENTS.find((option) => option.id === params.treatment)?.hint}
          </p>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {analysis && (
          <aside className="hidden lg:flex flex-col shrink-0 min-h-0 border-r border-border overflow-hidden" style={{ width: 238, background: '#111520' }}>
            <div className="shrink-0 px-4 py-3 border-b border-border">
              <p className="text-[10px] uppercase text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                {isSojournScope ? 'Sojourn time' : 'Traces do log'}
              </p>
              <p className="text-[9px] text-muted-foreground mt-1">
                {isSojournScope
                  ? `${seriesLabel} · ${points.length} execuções`
                  : `${points.length} em ordem cronológica`}
              </p>
            </div>
            <TraceList points={points} driftIndexes={driftIndexes} outliers={outliers} dismissed={dismissed}
              selectedTrace={selectedTrace} onSelect={setSelectedTrace} />
          </aside>
        )}

        <main className="flex flex-1 min-w-0 flex-col">
          {analysis && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-b border-border" style={{ background: '#111520' }}>
              {[
                [
                  remainingTraces,
                  dismissedCount > 0
                    ? `de ${totalTraces} · ${dismissedCount} desconsiderado${dismissedCount > 1 ? 's' : ''}`
                    : 'traces analisados',
                  CheckCircle2,
                  '#10b981',
                ],
                [activityCount, 'atividades diferentes', Layers, '#4a90c2'],
                [drifts.length, 'mudanças detectadas', Scan, '#dc2626'],
                [outliersRemaining, 'outliers estatísticos', AlertTriangle, '#f59e0b'],
                [
                  `${elapsed.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`,
                  `${analysis.method} · δ ${analysis.delta} · ${treatmentLabel} · ${seriesLabel}`,
                  Clock3,
                  '#64748b',
                ],
              ].map(([value, label, Icon, color]) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 border-r border-border last:border-r-0">
                  <Icon size={14} color={color} />
                  <div><p className="text-sm font-semibold text-foreground">{value}</p><p className="text-[9px] text-muted-foreground">{label}</p></div>
                </div>
              ))}
            </div>
          )}
          {runState === 'running' ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center"><RefreshCw size={22} className="animate-spin mx-auto mb-3" color="#991b1b" /><p className="text-xs text-muted-foreground">Analisando as durações dos traces...</p></div>
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="max-w-md text-center">
                <AlertTriangle size={22} className="mx-auto mb-3" color="#f59e0b" />
                <p className="text-sm text-foreground">A análise ainda não pode ser executada</p>
                <p className="text-xs text-muted-foreground mt-2">{error}</p>
              </div>
            </div>
          ) : points.length ? (
            <DriftChart points={points} processedValues={processedValues} drifts={drifts} outliers={outliers} dismissed={dismissed}
              selectedDrift={selectedDrift} selectedTrace={selectedTrace}
              onSelectDrift={setSelectedDrift} onSelectTrace={setSelectedTrace} />
          ) : null}
        </main>

        {analysis && (
          <aside className="hidden lg:block shrink-0 border-l border-border overflow-y-auto" style={{ width: 286, background: '#111520' }}>
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[10px] uppercase text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Detalhe da detecção</p>
            </div>
            {selectedPoint && (
              <div className="p-4 border-b border-border">
                <p className="text-xs font-semibold text-foreground truncate">{selectedPoint.caseId}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {isSojournScope
                    ? `${seriesLabel} · ${formatSeconds(selectedPoint.durationSeconds)}`
                    : `Duração total · ${formatSeconds(selectedPoint.durationSeconds)}`}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Início · {formatDateTime(selectedPoint.startedAt)}</p>
                {selectedIsDismissed ? (
                  <button type="button"
                    onClick={() => setDismissed((items) => {
                      const next = new Set(items)
                      next.delete(selectedTrace)
                      return next
                    })}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-[11px] border border-border text-muted-foreground hover:text-foreground">
                    <RefreshCw size={11} />Reconsiderar trace
                  </button>
                ) : (
                  <button type="button" onClick={() => setDismissed((items) => new Set([...items, selectedTrace]))}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-[11px] border"
                    style={{ borderColor: 'rgba(245,158,11,0.25)', color: '#f59e0b', background: 'rgba(120,53,15,0.12)' }}>
                    <SkipForward size={11} />{selectedIsOutlier ? 'Desconsiderar outlier' : 'Desconsiderar trace'}
                  </button>
                )}
              </div>
            )}
            {drift ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-foreground">Drift #{drifts.indexOf(drift) + 1}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: '#fca5a5', background: 'rgba(153,27,27,0.18)' }}>detectado</span>
                </div>
                {[
                  ['Detectado em', formatDateTime(drift.detectedAt)],
                  ['Degradação começa', formatDateTime(drift.anomalyStartedAt)],
                  // The P-F interval the Manager actually plans against: how
                  // much calendar time passed between the start of the
                  // degradation and the moment ADWIN was able to signal it.
                  ['Janela até a detecção', formatDuration(drift.detectionDelaySeconds) ?? `${drift.detectionDelayTraces} execuções`],
                  ['Ponto', `Trace ${drift.index}`],
                  ['Início estimado', `Trace ${drift.anomalyStartIndex}`],
                  ['Atraso da detecção', `${drift.detectionDelayTraces} execuções`],
                  ['Caso', drift.caseId],
                  ['Antes', formatSeconds(drift.beforeMeanSeconds)],
                  ['Depois', formatSeconds(drift.afterMeanSeconds)],
                  ['Variação', `${drift.magnitudePercent > 0 ? '+' : ''}${drift.magnitudePercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 py-2 border-b border-border text-[11px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground text-right truncate" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{value}</span>
                  </div>
                ))}
                <button type="button" onClick={() => setSelectedDrift(null)}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-[11px] border border-border text-muted-foreground hover:text-foreground">
                  <XCircle size={11} />Dispensar alerta
                </button>
              </div>
            ) : (
              <div className="p-6 text-center"><Scan size={18} className="mx-auto mb-2" color="#475569" /><p className="text-[11px] text-muted-foreground">
                {drifts.length ? 'Selecione um drift no gráfico.' : 'Nenhuma mudança de distribuição foi detectada.'}
              </p></div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
