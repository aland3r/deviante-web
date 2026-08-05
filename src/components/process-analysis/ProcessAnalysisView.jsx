import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ChevronRight, CircleDot, Clock3, Home,
  Layers, Play, RefreshCw, Scan, SlidersHorizontal,
} from 'lucide-react'
import BrandMark from '../layout/BrandMark'
import ProjectActionsMenu from '../projects/ProjectActionsMenu'
import { api } from '../../lib/api'

const formatSeconds = (value) => `${Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`
const EMPTY_LIST = []

// One capped type scale for the whole screen — captions, body, titles — so the
// same kind of text is the same size everywhere and the view stops shapeshifting
// between a dozen ad-hoc px values.
const T = {
  caption: 'text-[10px]',
  body: 'text-[11px]',
  title: 'text-[13px]',
}
const MONO = "'JetBrains Mono',monospace"

/** Whether two id sets hold the same members — used to detect a dirty filter. */
const sameMembers = (a, b) => a.size === b.size && [...a].every((item) => b.has(item))

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

// ─── Traces column ───────────────────────────────────────────────────────────
// Same object, same shape as the Process screen's trace column: a right-hand
// rail of flat rows (dot · id · date · duration) with the include/exclude toggle
// inline on the row. It must never move or restyle between screens.

function TraceList({ points, driftIndexes, outliers, excluded, selectedTrace, onSelect, onToggleExclude }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {points.map((point) => {
        const isDismissed = excluded.has(point.traceId)
        const isOutlier = outliers.has(point.index) && !isDismissed
        const isDrift = driftIndexes.has(point.index) && !isDismissed
        const isSelected = selectedTrace === point.index
        return (
          <div key={point.traceId} role="button" tabIndex={0} onClick={() => onSelect(point.index)}
            className="group w-full flex items-center gap-2 px-3 py-1.5 text-left cursor-pointer transition-colors hover:bg-white/[0.03]"
            style={{
              background: isSelected ? 'rgba(40,112,168,0.18)' : undefined,
              color: isSelected ? '#e2e8f0' : '#64748b',
              opacity: isDismissed ? 0.4 : 1,
            }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: isDismissed ? '#475569' : isDrift ? '#dc2626' : isOutlier ? '#f59e0b' : '#10b981' }} />
            <span className="flex-1 min-w-0">
              <span className={`block ${T.caption} truncate`}
                style={{ fontFamily: MONO, textDecoration: isDismissed ? 'line-through' : 'none' }}>
                {point.caseId}
              </span>
              <span className={`block ${T.caption} truncate`} style={{ color: '#475569', fontFamily: MONO }}>
                {formatDate(point.startedAt)}
              </span>
            </span>
            <span className={`${T.caption} shrink-0`} style={{ fontFamily: MONO }}>
              {formatSeconds(point.durationSeconds)}
            </span>
            <button type="button"
              title={isDismissed ? 'Reincluir trace na próxima análise' : 'Desconsiderar trace na próxima análise'}
              onClick={(event) => { event.stopPropagation(); onToggleExclude(point.traceId) }}
              className={`shrink-0 w-4 h-4 flex items-center justify-center transition-opacity ${isDismissed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              style={{ color: isDismissed ? '#334155' : '#4d8fc0' }}>
              <CircleDot size={12} strokeWidth={isDismissed ? 1.5 : 2} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Drift detail — floating, hover-only ─────────────────────────────────────

function DriftDetailPopover({ drift, number, leftPct }) {
  const rows = [
    ['Detectado em', formatDateTime(drift.detectedAt)],
    ['Degradação começa', formatDateTime(drift.anomalyStartedAt)],
    ['Janela até a detecção', formatDuration(drift.detectionDelaySeconds) ?? `${drift.detectionDelayTraces} execuções`],
    ['Antes', formatSeconds(drift.beforeMeanSeconds)],
    ['Depois', formatSeconds(drift.afterMeanSeconds)],
    ['Variação', `${drift.magnitudePercent > 0 ? '+' : ''}${drift.magnitudePercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`],
  ]
  return (
    <div className="absolute z-20 pointer-events-none rounded-lg border border-border shadow-xl p-3"
      style={{
        left: `${Math.min(Math.max(leftPct, 12), 88)}%`, top: '12%',
        transform: 'translateX(-50%)', width: 208, background: 'rgba(13,16,23,0.97)', backdropFilter: 'blur(6px)',
      }}>
      <div className="flex items-center justify-between mb-2">
        <p className={`${T.body} font-semibold text-foreground`}>Desvio {number}</p>
        <span className={T.caption} style={{ color: '#fca5a5', background: 'rgba(153,27,27,0.18)', padding: '1px 6px', borderRadius: 4 }}>detectado</span>
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 py-1">
          <span className={`${T.caption} text-muted-foreground`}>{label}</span>
          <span className={`${T.caption} text-foreground text-right truncate`} style={{ fontFamily: MONO }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function DriftChart({ title, points, processedValues, drifts, outliers, excluded, selectedDrift, selectedTrace, onSelectDrift, onSelectTrace }) {
  // Hover (transient) vs. selected (persisted by a click). The detail card only
  // appears while hovering the red drift; selecting keeps the on-chart emphasis.
  const [hoveredDrift, setHoveredDrift] = useState(null)
  const emphasisIndex = hoveredDrift ?? selectedDrift
  const drift = drifts.find((item) => item.index === emphasisIndex) ?? null
  const popoverDrift = hoveredDrift != null ? drifts.find((item) => item.index === hoveredDrift) ?? null : null
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
    const nearby = drifts.find((item) => Math.abs(item.index - point.index) <= Math.max(2, points.length * 0.01))
    if (nearby) onSelectDrift(nearby.index)
  }

  const popoverLeftPct = popoverDrift
    ? (x(points.findIndex((point) => point.index === popoverDrift.index)) / width) * 100
    : 0

  return (
    <div className="flex-1 min-h-0 px-4 sm:px-5 py-4 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className={`${T.title} font-semibold text-foreground truncate`}>{title}</h2>
          <p className={`${T.caption} text-muted-foreground mt-0.5`}>Duração por trace · ADWIN · ordem cronológica</p>
        </div>
        <div className={`flex items-center gap-3 ${T.caption} text-muted-foreground`}>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-slate-500" />Trace original</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-blue-400" />Série tratada</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-amber-400" />Início da anomalia</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-amber-500" />Outlier</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-red-600" />Desvio</span>
        </div>
      </div>
      <div className="relative flex-1 min-h-0">
        {popoverDrift && (
          <DriftDetailPopover drift={popoverDrift} number={drifts.indexOf(popoverDrift) + 1} leftPct={popoverLeftPct} />
        )}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full"
          style={{ height: '100%', minHeight: 280, cursor: 'crosshair' }}
          onClick={selectFromPointer} role="img" aria-label="Gráfico temporal de detecção de desvios">
          <rect width={width} height={height} fill="#0d1119" rx="4" />
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,0.06)" />
              <text x={pad.left - 10} y={y(tick) + 3} textAnchor="end" fill="#475569" fontSize="10">{formatSeconds(tick)}</text>
            </g>
          ))}
          {/* Faint interval band for the emphasized drift only. */}
          {drift && (() => {
            const startArrayIndex = points.findIndex((point) => point.index === drift.anomalyStartIndex)
            const arrayIndex = points.findIndex((point) => point.index === drift.index)
            return startArrayIndex >= 0 && arrayIndex >= 0 ? (
              <rect x={x(startArrayIndex)} y={pad.top} width={Math.max(1, x(arrayIndex) - x(startArrayIndex))}
                height={innerH} fill="rgba(245,158,11,0.10)" />
            ) : null
          })()}
          {/* Every detection as a tick on a top rail plus a faint guide, so dozens
              of drifts read as a density band. Hover a tick for its detail card. */}
          {drifts.map((driftItem) => {
            const arrayIndex = points.findIndex((point) => point.index === driftItem.index)
            if (arrayIndex < 0) return null
            const dx = x(arrayIndex)
            const isEmphasized = emphasisIndex === driftItem.index
            return (
              <g key={driftItem.index}
                onClick={(event) => { event.stopPropagation(); onSelectDrift(driftItem.index) }}
                onMouseEnter={() => setHoveredDrift(driftItem.index)}
                onMouseLeave={() => setHoveredDrift((current) => (current === driftItem.index ? null : current))}
                style={{ cursor: 'pointer' }}>
                <rect x={dx - 6} y={pad.top - 12} width={12} height={innerH + 12} fill="transparent" />
                {!isEmphasized && (
                  <line x1={dx} x2={dx} y1={pad.top} y2={height - pad.bottom} stroke="#dc2626" strokeWidth={1} opacity={0.2} />
                )}
                <path d={`M ${dx - 4} ${pad.top - 9} L ${dx + 4} ${pad.top - 9} L ${dx} ${pad.top - 1} Z`}
                  fill={isEmphasized ? '#ef4444' : 'rgba(220,38,38,0.5)'} />
              </g>
            )
          })}
          <polyline points={linePoints} fill="none" stroke="#64748b" strokeWidth="1" opacity="0.42" />
          <polyline points={processedLinePoints} fill="none" stroke="#4a90c2" strokeWidth="1.8" opacity="0.95" />
          {points.map((point, index) => outliers.has(point.index) && !excluded.has(point.traceId) ? (
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
          {/* Emphasized drift guides (no on-chart label — the name lives in the
              hover card, so the chart stays uncluttered). */}
          {drift && (() => {
            const startArrayIndex = points.findIndex((point) => point.index === drift.anomalyStartIndex)
            const arrayIndex = points.findIndex((point) => point.index === drift.index)
            if (arrayIndex < 0) return null
            const dx = x(arrayIndex)
            return (
              <g pointerEvents="none">
                {startArrayIndex >= 0 && (
                  <line x1={x(startArrayIndex)} x2={x(startArrayIndex)} y1={pad.top} y2={height - pad.bottom}
                    stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 4" />
                )}
                <line x1={dx} x2={dx} y1={pad.top} y2={height - pad.bottom} stroke="#ef4444" strokeWidth={2} />
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
    </div>
  )
}

export default function ProcessAnalysisView({ processId, processName, analysisId, onBack, onGoHome, onDelete }) {
  const [analysis, setAnalysis] = useState(null)
  const [runState, setRunState] = useState('running')
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [selectedDrift, setSelectedDrift] = useState(null)
  const [selectedTrace, setSelectedTrace] = useState(null)
  // The subtractive filter: everything is active by default. `excludedTraces`
  // holds trace ids (stable across recompute); `excludedActivities` holds
  // activity ids whose duration is filtered out of the series. Applied on run.
  const [excludedTraces, setExcludedTraces] = useState(() => new Set())
  const [excludedActivities, setExcludedActivities] = useState(() => new Set())
  const eventLogIdsRef = useRef([])

  // Parameters the Manager chooses before running. They are held separately
  // from `analysis` so the panel keeps showing what is about to run while the
  // previous result stays on screen. They live in a persistent left rail — never
  // a dropdown that hides them.
  const [operations, setOperations] = useState(EMPTY_LIST)
  const [params, setParams] = useState({ treatment: 'treated', delta: '0.002' })

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
  // Read the filter through refs too, so runAnalysis always applies the current
  // selection without the callback (and the run effect) depending on it.
  const excludedTracesRef = useRef(excludedTraces)
  useEffect(() => { excludedTracesRef.current = excludedTraces }, [excludedTraces])
  const excludedActivitiesRef = useRef(excludedActivities)
  useEffect(() => { excludedActivitiesRef.current = excludedActivities }, [excludedActivities])

  const runAnalysis = useCallback(async (overrides) => {
    const started = performance.now()
    setRunState('running')
    setError('')
    const effective = { ...paramsRef.current, ...(overrides ?? {}) }
    const request = {
      treatment: effective.treatment,
      delta: effective.delta,
      eventLogIds: eventLogIdsRef.current,
      excludedActivityIds: [...excludedActivitiesRef.current],
      excludedTraceIds: [...excludedTracesRef.current],
    }
    try {
      const result = await api.runProcessAnalysis(processId, analysisId, request)
      eventLogIdsRef.current = (result.eventLogs?.length ? result.eventLogs : [result.eventLog]).filter(Boolean).map((log) => log.id)
      setAnalysis(result)
      setSelectedDrift(result.drifts[0]?.index ?? null)
      setSelectedTrace(null)
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
            // Restore where the Manager left off — the subtractive filter and the
            // parameters the run used — instead of starting from all-active.
            setExcludedTraces(new Set(saved.excludedTraceIds ?? EMPTY_LIST))
            setExcludedActivities(new Set(saved.excludedActivityIds ?? EMPTY_LIST))
            eventLogIdsRef.current = (saved.eventLogs?.length ? saved.eventLogs : [saved.eventLog]).filter(Boolean).map((log) => log.id)
            setParams((current) => ({
              ...current,
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

  // Persist the filter (debounced) onto the saved run, so a reload or reopen
  // restores it. The first pass after a load/run is skipped: it would only echo
  // the value we just hydrated or the run applied.
  const filterSynced = useRef(false)
  useEffect(() => {
    if (!analysisId || !analysis) return undefined
    if (!filterSynced.current) { filterSynced.current = true; return undefined }
    const handle = setTimeout(() => {
      api.updateAnalysisFilter(analysisId, {
        excludedActivityIds: [...excludedActivities],
        excludedTraceIds: [...excludedTraces],
      }).catch(() => {})
    }, 500)
    return () => clearTimeout(handle)
  }, [excludedActivities, excludedTraces, analysisId, analysis])

  const points = analysis?.points ?? EMPTY_LIST
  const drifts = analysis?.drifts ?? EMPTY_LIST
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

  // Traces toggled off but not yet applied: only those still in the current
  // series count, so the live number previews the next run without dropping
  // below the real population.
  const pendingExcludedTraces = useMemo(
    () => points.reduce((total, point) => (excludedTraces.has(point.traceId) ? total + 1 : total), 0),
    [points, excludedTraces],
  )
  const remainingTraces = Math.max(points.length - pendingExcludedTraces, 0)
  const outliersRemaining = useMemo(
    () => points.reduce(
      (total, point) => (outliers.has(point.index) && !excludedTraces.has(point.traceId) ? total + 1 : total),
      0,
    ),
    [points, outliers, excludedTraces],
  )

  // Distinct Activities the mapped operations resolve to (many raw aliases can
  // share one Activity). Drives both the filter toggles and the counts — no
  // extra request.
  const activities = useMemo(() => {
    const byId = new Map()
    for (const operation of operations) {
      if (operation.activityId && !byId.has(operation.activityId)) {
        byId.set(operation.activityId, operation.activityName || 'Atividade')
      }
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name }))
  }, [operations])
  const activeActivityCount = activities.reduce(
    (total, activity) => (excludedActivities.has(activity.id) ? total : total + 1),
    0,
  )
  const activityFilterActive = activities.length > 0 && activeActivityCount < activities.length

  // The filter differs from what the shown result was computed with, so the
  // Manager must reexecute for it to take effect.
  const appliedActivityIds = useMemo(() => new Set(analysis?.excludedActivityIds ?? EMPTY_LIST), [analysis?.excludedActivityIds])
  const appliedTraceIds = useMemo(() => new Set(analysis?.excludedTraceIds ?? EMPTY_LIST), [analysis?.excludedTraceIds])
  const filterDirty = analysis != null
    && (!sameMembers(excludedActivities, appliedActivityIds) || !sameMembers(excludedTraces, appliedTraceIds))

  const treatmentLabel = analysis?.treatment === 'raw' ? 'crua' : 'tratada'
  const seriesLabel = activityFilterActive ? `${activeActivityCount}/${activities.length} atividades` : 'trace total'

  function toggleExcludedTrace(traceId) {
    setExcludedTraces((current) => {
      const next = new Set(current)
      if (next.has(traceId)) next.delete(traceId)
      else next.add(traceId)
      return next
    })
  }

  // The analysis inherits the identity of the process it came from — the chart
  // is named after the process, not a generic "duração por trace" caption.
  const chartTitle = processName || 'Análise de desvios'

  return (
    <div className="flex flex-col w-full overflow-hidden" style={{ height: '100vh', background: '#0d1017', fontFamily: "'Inter',sans-serif" }}>
      {/* Header — one logo (→ dashboard), a home glyph, then a lean breadcrumb.
          The old "Projetos" text link is gone; the mark already goes home. */}
      <header className="shrink-0 flex items-center gap-2 px-3 sm:px-5 border-b border-border" style={{ height: 52, background: '#111520' }}>
        <BrandMark />
        <button type="button" onClick={onGoHome} title="Projetos"
          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors">
          <Home size={13} />
        </button>
        <ChevronRight className="hidden md:block" size={13} color="#334155" />
        <button type="button" onClick={onBack}
          className={`hidden md:block px-1 py-1 rounded ${T.body} text-muted-foreground hover:text-foreground truncate`}
          style={{ maxWidth: 220 }}>{processName}</button>
        <ChevronRight className="hidden md:block" size={13} color="#334155" />
        <span className={`flex items-center gap-1.5 ${T.body} font-semibold text-foreground`} style={{ fontFamily: MONO }}>
          <Scan size={13} /><span className="hidden sm:inline">Análise de desvios</span>
        </span>
        {onDelete && <ProjectActionsMenu onDelete={onDelete} deleteLabel="Excluir análise" />}
        <div className="flex-1" />
        <button type="button" onClick={() => runAnalysis()} disabled={runState === 'running'}
          title={filterDirty ? 'Filtro alterado — reexecute para aplicá-lo' : 'Reexecutar a análise'}
          className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded ${T.body} font-medium text-white disabled:opacity-60`}
          style={{ background: filterDirty ? '#b45309' : '#991b1b' }}>
          {runState === 'running'
            ? <><RefreshCw size={12} className="animate-spin" /><span className="hidden sm:inline">Processando...</span></>
            : <><Play size={12} /><span className="hidden sm:inline">{filterDirty ? 'Aplicar filtro' : 'Reexecutar análise'}</span></>}
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* LEFT rail — parameters, always visible (never a hidden dropdown). */}
        <aside className="hidden lg:flex flex-col shrink-0 min-h-0 border-r border-border overflow-y-auto" style={{ width: 260, background: '#111520' }}>
          <div className="shrink-0 px-4 py-3 border-b border-border flex items-center gap-2">
            <SlidersHorizontal size={12} className="text-muted-foreground" />
            <p className={`${T.caption} uppercase text-muted-foreground`} style={{ fontFamily: MONO }}>Parâmetros</p>
          </div>
          <div className="px-4 py-4 space-y-5">
            <div className="flex flex-col gap-2">
              <span className={`${T.caption} uppercase text-muted-foreground`} style={{ fontFamily: MONO }}>
                Atividades na análise
                {activities.length > 0 && (
                  <span className="ml-2 normal-case" style={{ color: '#4a90c2' }}>{activeActivityCount}/{activities.length} ativas</span>
                )}
              </span>
              {activities.length === 0 ? (
                <span className={`${T.body} text-muted-foreground py-1.5`}>Nenhuma atividade mapeada ainda.</span>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {activities.map((activity) => {
                    const active = !excludedActivities.has(activity.id)
                    return (
                      <button key={activity.id} type="button"
                        onClick={() => setExcludedActivities((current) => {
                          const next = new Set(current)
                          if (next.has(activity.id)) next.delete(activity.id)
                          else next.add(activity.id)
                          return next
                        })}
                        title={active ? 'Ativa · clique para tirar da análise' : 'Fora da análise · clique para reincluir'}
                        className={`px-2 py-1 rounded ${T.caption} border transition-colors`}
                        style={{
                          borderColor: active ? 'rgba(40,112,168,0.4)' : 'rgba(100,116,139,0.3)',
                          background: active ? 'rgba(40,112,168,0.18)' : 'transparent',
                          color: active ? '#e2e8f0' : '#64748b',
                          textDecoration: active ? 'none' : 'line-through',
                        }}>
                        {activity.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className={`${T.caption} uppercase text-muted-foreground`} style={{ fontFamily: MONO }}>Tratamento</span>
              <div className="flex rounded border border-border overflow-hidden">
                {TREATMENTS.map((option) => (
                  <button key={option.id} type="button" title={option.hint}
                    onClick={() => setParams((current) => ({ ...current, treatment: option.id }))}
                    className={`flex-1 px-3 py-1.5 ${T.body}`}
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

            <label className="flex flex-col gap-2">
              <span className={`${T.caption} uppercase text-muted-foreground`} style={{ fontFamily: MONO }}>δ (sensibilidade)</span>
              <input type="number" step="0.0001" min="0.0001" max="0.9999" value={params.delta}
                onChange={(event) => setParams((current) => ({ ...current, delta: event.target.value }))}
                className={`px-2 py-1.5 rounded ${T.body} text-foreground border border-border`}
                style={{ background: '#0d1017', fontFamily: MONO }} />
            </label>

            <p className={`${T.caption} text-muted-foreground leading-relaxed`}>
              {filterDirty
                ? 'O filtro mudou desde a última execução — reexecute no topo para aplicá-lo à série.'
                : TREATMENTS.find((option) => option.id === params.treatment)?.hint}
            </p>
          </div>
        </aside>

        {/* CENTER — result summary + drift chart. */}
        <main className="flex flex-1 min-w-0 flex-col">
          {analysis && (
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-border" style={{ background: '#111520' }}>
              {[
                [
                  activityFilterActive ? `${activeActivityCount}/${activities.length}` : activities.length,
                  activityFilterActive ? 'atividades ativas' : 'atividades diferentes',
                  Layers, '#4a90c2',
                ],
                [drifts.length, 'desvios detectados', Scan, '#dc2626'],
                [outliersRemaining, 'outliers estatísticos', AlertTriangle, '#f59e0b'],
                [
                  `${elapsed.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`,
                  `${analysis.method} · δ ${analysis.delta} · ${treatmentLabel} · ${seriesLabel}`,
                  Clock3, '#64748b',
                ],
              ].map(([value, label, Icon, color]) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 border-r border-border last:border-r-0">
                  <Icon size={14} color={color} />
                  <div>
                    <p className={`${T.title} font-semibold text-foreground`}>{value}</p>
                    <p className={`${T.caption} text-muted-foreground`}>{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {runState === 'running' ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center"><RefreshCw size={22} className="animate-spin mx-auto mb-3" color="#991b1b" /><p className={`${T.body} text-muted-foreground`}>Analisando as durações dos traces...</p></div>
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="max-w-md text-center">
                <AlertTriangle size={22} className="mx-auto mb-3" color="#f59e0b" />
                <p className={`${T.title} text-foreground`}>A análise ainda não pode ser executada</p>
                <p className={`${T.body} text-muted-foreground mt-2`}>{error}</p>
              </div>
            </div>
          ) : points.length ? (
            <DriftChart title={chartTitle} points={points} processedValues={processedValues} drifts={drifts} outliers={outliers} excluded={excludedTraces}
              selectedDrift={selectedDrift} selectedTrace={selectedTrace}
              onSelectDrift={setSelectedDrift} onSelectTrace={setSelectedTrace} />
          ) : null}
        </main>

        {/* RIGHT rail — the Trace object, same column, same shape as the Process
            screen. Its count lives in this header, not in a detached stat tile. */}
        {analysis && (
          <aside className="hidden lg:flex flex-col shrink-0 min-h-0 border-l border-border overflow-hidden" style={{ width: 264, background: '#111520' }}>
            <div className="shrink-0 px-4 py-3 border-b border-border">
              <p className={`${T.caption} uppercase text-muted-foreground`} style={{ fontFamily: MONO }}>Traces</p>
              <p className={`${T.caption} text-muted-foreground mt-1`}>
                {remainingTraces} de {points.length}{pendingExcludedTraces > 0 ? ` · ${pendingExcludedTraces} fora` : ''} · ordem cronológica
              </p>
            </div>
            <TraceList points={points} driftIndexes={driftIndexes} outliers={outliers} excluded={excludedTraces}
              selectedTrace={selectedTrace} onSelect={setSelectedTrace} onToggleExclude={toggleExcludedTrace} />
          </aside>
        )}
      </div>
    </div>
  )
}
