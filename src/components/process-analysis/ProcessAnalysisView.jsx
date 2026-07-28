import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Clock3,
  Play, RefreshCw, Scan, SkipForward, XCircle,
} from 'lucide-react'
import BrandMark from '../layout/BrandMark'
import { api } from '../../lib/api'

const formatSeconds = (value) => `${Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`
const EMPTY_LIST = []

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
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 155px)' }}>
      {points.map((point) => {
        const isOutlier = outliers.has(point.index) && !dismissed.has(point.index)
        const isDrift = driftIndexes.has(point.index)
        return (
          <button key={point.traceId} type="button" onClick={() => onSelect(point.index)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors"
            style={{
              background: selectedTrace === point.index ? 'rgba(40,112,168,0.18)' : 'transparent',
              color: selectedTrace === point.index ? '#e2e8f0' : '#64748b',
              border: 0,
            }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: isDrift ? '#dc2626' : isOutlier ? '#f59e0b' : '#10b981' }} />
            <span className="text-[10px] flex-1 truncate" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              {point.caseId}
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
        {drifts.map((drift) => {
          const startArrayIndex = points.findIndex((point) => point.index === drift.anomalyStartIndex)
          const arrayIndex = points.findIndex((point) => point.index === drift.index)
          return startArrayIndex >= 0 && arrayIndex >= 0 ? (
            <rect key={`interval-${drift.index}`} x={x(startArrayIndex)} y={pad.top}
              width={Math.max(1, x(arrayIndex) - x(startArrayIndex))} height={innerH}
              fill="rgba(245,158,11,0.055)" />
          ) : null
        })}
        {drifts.map((drift, driftIndex) => {
          const startArrayIndex = points.findIndex((point) => point.index === drift.anomalyStartIndex)
          const arrayIndex = points.findIndex((point) => point.index === drift.index)
          const selected = selectedDrift === drift.index
          return (
            <g key={drift.index} onClick={(event) => { event.stopPropagation(); onSelectDrift(drift.index) }}>
              {startArrayIndex >= 0 && (
                <>
                  <line x1={x(startArrayIndex)} x2={x(startArrayIndex)} y1={pad.top} y2={height - pad.bottom}
                    stroke="#f59e0b" strokeWidth={selected ? 1.8 : 1} strokeDasharray="3 4" />
                  <text x={x(startArrayIndex) + 6} y={height - pad.bottom - 8} fill="#fbbf24" fontSize="9">
                    Início #{driftIndex + 1}
                  </text>
                </>
              )}
              <line x1={x(arrayIndex)} x2={x(arrayIndex)} y1={pad.top} y2={height - pad.bottom}
                stroke="#dc2626" strokeWidth={selected ? 2 : 1} strokeDasharray="5 4" />
              <text x={x(arrayIndex) + 6} y={pad.top + 14} fill="#fca5a5" fontSize="10">Detecção #{driftIndex + 1}</text>
            </g>
          )
        })}
        <polyline points={linePoints} fill="none" stroke="#64748b" strokeWidth="1" opacity="0.42" />
        <polyline points={processedLinePoints} fill="none" stroke="#4a90c2" strokeWidth="1.8" opacity="0.95" />
        {points.map((point, index) => outliers.has(point.index) && !dismissed.has(point.index) ? (
          <circle key={point.traceId} cx={x(index)} cy={y(point.durationSeconds)} r="3.5" fill="#f59e0b" stroke="#0d1119" strokeWidth="1.5" />
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
        {xTicks.map((tick) => (
          <text key={tick} x={x(tick)} y={height - 16} textAnchor="middle" fill="#475569" fontSize="10">{points[tick]?.index}</text>
        ))}
        <text x={width / 2} y={height - 2} textAnchor="middle" fill="#64748b" fontSize="10">Traces do log</text>
      </svg>
    </div>
  )
}

export default function ProcessAnalysisView({ processId, processName, eventLog, onBack, onGoHome }) {
  const [analysis, setAnalysis] = useState(null)
  const [runState, setRunState] = useState('running')
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [selectedDrift, setSelectedDrift] = useState(null)
  const [selectedTrace, setSelectedTrace] = useState(null)
  const [dismissed, setDismissed] = useState(new Set())

  const runAnalysis = useCallback(async () => {
    const started = performance.now()
    setRunState('running')
    setError('')
    try {
      const result = await api.runProcessAnalysis(processId)
      setAnalysis(result)
      setSelectedDrift(result.drifts[0]?.index ?? null)
      setElapsed((performance.now() - started) / 1000)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setRunState('done')
    }
  }, [processId])

  useEffect(() => {
    runAnalysis()
  }, [runAnalysis])

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
  const selectedIsOutlier = selectedTrace != null && outliers.has(selectedTrace) && !dismissed.has(selectedTrace)

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
        <button type="button" onClick={runAnalysis} disabled={runState === 'running'}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded text-xs font-medium text-white disabled:opacity-60"
          style={{ background: '#991b1b' }}>
          {runState === 'running'
            ? <><RefreshCw size={12} className="animate-spin" /><span className="hidden sm:inline">Processando...</span></>
            : <><Play size={12} /><span className="hidden sm:inline">Reexecutar análise</span></>}
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {analysis && (
          <aside className="hidden lg:block shrink-0 border-r border-border overflow-hidden" style={{ width: 238, background: '#111520' }}>
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[10px] uppercase text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Traces do log</p>
              <p className="text-[9px] text-muted-foreground mt-1">{points.length} em ordem cronológica</p>
            </div>
            <TraceList points={points} driftIndexes={driftIndexes} outliers={outliers} dismissed={dismissed}
              selectedTrace={selectedTrace} onSelect={setSelectedTrace} />
          </aside>
        )}

        <main className="flex flex-1 min-w-0 flex-col">
          {analysis && (
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-border" style={{ background: '#111520' }}>
              {[
                [analysis.traceCount, 'traces analisados', CheckCircle2, '#10b981'],
                [drifts.length, 'mudanças detectadas', Scan, '#dc2626'],
                [outliers.size - [...dismissed].filter((item) => outliers.has(item)).length, 'outliers estatísticos', AlertTriangle, '#f59e0b'],
                [`${elapsed.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`, `${analysis.method} · δ ${analysis.delta}`, Clock3, '#64748b'],
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
                <p className="text-[10px] text-muted-foreground mt-1">Duração total · {formatSeconds(selectedPoint.durationSeconds)}</p>
                {selectedIsOutlier && (
                  <button type="button" onClick={() => setDismissed((items) => new Set([...items, selectedTrace]))}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-[11px] border"
                    style={{ borderColor: 'rgba(245,158,11,0.25)', color: '#f59e0b', background: 'rgba(120,53,15,0.12)' }}>
                    <SkipForward size={11} />Desconsiderar outlier
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
                  ['Ponto', `Trace ${drift.index}`],
                  ['Início estimado', `Trace ${drift.anomalyStartIndex}`],
                  ['Atraso da detecção', `${drift.detectionDelayTraces} traces`],
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
