import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight,
  Clock3, Play, RefreshCw, Scan, SkipForward, XCircle,
} from 'lucide-react'
import BrandMark from '../layout/BrandMark'

const DRIFTS = [
  { id: 'd1', trace: 50, end: 159, before: 45.2, after: 62.1, magnitude: 37.4 },
  { id: 'd2', trace: 160, end: 229, before: 62.1, after: 38.3, magnitude: -38.3 },
]
const OUTLIERS = [23, 87, 145, 199]
const CYCLES = [
  { id: 'c1', label: 'Ciclo 1', traces: 180, drifts: 1, outliers: 2 },
  { id: 'c2', label: 'Ciclo 2', traces: 230, drifts: 2, outliers: 4 },
  { id: 'c3', label: 'Ciclo 3', traces: 90, drifts: 0, outliers: 1 },
]

function metricAt(index) {
  const base = index < 50 ? 45 : index < 160 ? 62 : 38
  const noise = Math.sin(index * 0.7) * 3 + Math.cos(index * 1.3) * 1.5
  return Math.round((base + noise + (OUTLIERS.includes(index) ? 28 : 0)) * 10) / 10
}

const CHART = Array.from({ length: 230 }, (_, index) => ({ index, metric: metricAt(index) }))

function TraceList({ dismissed, selectedTrace, onSelect }) {
  return (
    <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
      {CHART.map((trace) => {
        const isOutlier = OUTLIERS.includes(trace.index) && !dismissed.includes(trace.index)
        const drift = DRIFTS.some((item) => trace.index >= item.trace && trace.index <= item.end)
        return (
          <button key={trace.index} type="button" onClick={() => onSelect(trace.index)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors"
            style={{
              background: selectedTrace === trace.index ? 'rgba(40,112,168,0.18)' : 'transparent',
              color: selectedTrace === trace.index ? '#e2e8f0' : '#64748b',
              border: 0,
            }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: isOutlier ? '#f59e0b' : drift ? '#dc2626' : '#10b981' }} />
            <span className="text-[10px] flex-1" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              TRACE-{String(trace.index + 1).padStart(4, '0')}
            </span>
            <span className="text-[9px]" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{trace.metric.toFixed(1)} s</span>
          </button>
        )
      })}
    </div>
  )
}

function DriftChart({ selectedDrift, selectedTrace, onSelectDrift, onSelectTrace }) {
  const width = 900
  const height = 410
  const pad = { left: 54, right: 24, top: 28, bottom: 42 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const x = (index) => pad.left + (index / 229) * innerW
  const y = (metric) => pad.top + (1 - (metric - 20) / 80) * innerH
  const points = CHART.map((item) => `${x(item.index)},${y(item.metric)}`).join(' ')

  function selectFromPointer(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const localX = ((event.clientX - rect.left) / rect.width) * width
    const index = Math.max(0, Math.min(229, Math.round(((localX - pad.left) / innerW) * 229)))
    onSelectTrace(index)
    const nearby = DRIFTS.find((drift) => Math.abs(drift.trace - index) <= 8)
    if (nearby) onSelectDrift(nearby.id)
  }

  return (
    <div className="flex-1 min-h-0 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-semibold text-foreground">Tempo de ciclo por traço</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Ciclo 2 · ADWIN · duração total</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-blue-400" />Traço</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-amber-500" />Outlier</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-red-600" />Drift</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full"
        style={{ height: 'calc(100% - 42px)', minHeight: 280, cursor: 'crosshair' }}
        onClick={selectFromPointer} role="img" aria-label="Gráfico temporal de detecção de desvios">
        <rect width={width} height={height} fill="#0d1119" rx="4" />
        {[20, 40, 60, 80, 100].map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.left - 10} y={y(tick) + 3} textAnchor="end" fill="#475569" fontSize="10">{tick}s</text>
          </g>
        ))}
        {DRIFTS.map((drift) => (
          <g key={drift.id} onClick={(event) => { event.stopPropagation(); onSelectDrift(drift.id) }}>
            <rect x={x(drift.trace)} y={pad.top} width={x(drift.end) - x(drift.trace)} height={innerH}
              fill={selectedDrift === drift.id ? 'rgba(153,27,27,0.10)' : 'rgba(153,27,27,0.045)'} />
            <line x1={x(drift.trace)} x2={x(drift.trace)} y1={pad.top} y2={height - pad.bottom}
              stroke="#dc2626" strokeWidth={selectedDrift === drift.id ? 2 : 1} strokeDasharray="5 4" />
            <text x={x(drift.trace) + 6} y={pad.top + 14} fill="#fca5a5" fontSize="10">Drift #{drift.id.slice(1)}</text>
          </g>
        ))}
        <polyline points={points} fill="none" stroke="#4a90c2" strokeWidth="1.5" opacity="0.9" />
        {OUTLIERS.map((index) => <circle key={index} cx={x(index)} cy={y(metricAt(index))} r="4" fill="#f59e0b" stroke="#0d1119" strokeWidth="2" />)}
        {selectedTrace != null && (
          <g>
            <line x1={x(selectedTrace)} x2={x(selectedTrace)} y1={pad.top} y2={height - pad.bottom} stroke="#e2e8f0" opacity="0.45" />
            <circle cx={x(selectedTrace)} cy={y(metricAt(selectedTrace))} r="5" fill="#e2e8f0" stroke="#2870a8" strokeWidth="2" />
          </g>
        )}
        {[0, 50, 100, 150, 200, 229].map((tick) => (
          <text key={tick} x={x(tick)} y={height - 16} textAnchor="middle" fill="#475569" fontSize="10">{tick + 1}</text>
        ))}
        <text x={width / 2} y={height - 2} textAnchor="middle" fill="#64748b" fontSize="10">Traços do ciclo</text>
      </svg>
    </div>
  )
}

export default function ProcessAnalysisView({ processName, eventLog, onBack, onGoHome }) {
  const [runState, setRunState] = useState('done')
  const [expandedCycle, setExpandedCycle] = useState('c2')
  const [selectedDrift, setSelectedDrift] = useState('d1')
  const [selectedTrace, setSelectedTrace] = useState(null)
  const [dismissed, setDismissed] = useState([])

  const drift = useMemo(() => DRIFTS.find((item) => item.id === selectedDrift) ?? null, [selectedDrift])
  const selectedIsOutlier = selectedTrace != null && OUTLIERS.includes(selectedTrace) && !dismissed.includes(selectedTrace)

  function runAnalysis() {
    setRunState('running')
    setSelectedDrift(null)
    window.setTimeout(() => {
      setRunState('done')
      setSelectedDrift('d1')
    }, 1400)
  }

  return (
    <div className="flex flex-col w-full overflow-hidden" style={{ height: '100vh', background: '#0d1017', fontFamily: "'Inter',sans-serif" }}>
      <header className="shrink-0 flex items-center gap-3 px-5 border-b border-border" style={{ height: 52, background: '#111520' }}>
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
          style={{ fontFamily: "'JetBrains Mono',monospace" }}>{eventLog?.fileName ?? 'log de eventos'}</span>
        <div className="flex-1" />
        <button type="button" onClick={runAnalysis} disabled={runState === 'running'}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium text-white disabled:opacity-60"
          style={{ background: '#991b1b' }}>
          {runState === 'running'
            ? <><RefreshCw size={12} className="animate-spin" /><span className="hidden sm:inline">Processando...</span></>
            : <><Play size={12} /><span className="hidden sm:inline">Reexecutar análise</span></>}
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="hidden lg:block shrink-0 border-r border-border overflow-y-auto" style={{ width: 238, background: '#111520' }}>
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] uppercase text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Ciclos e traços</p>
          </div>
          {CYCLES.map((cycle) => {
            const open = expandedCycle === cycle.id
            return (
              <div key={cycle.id} className="border-b border-border">
                <button type="button" onClick={() => setExpandedCycle(open ? null : cycle.id)}
                  className="w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-secondary">
                  {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="text-xs text-foreground flex-1">{cycle.label}</span>
                  <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{cycle.traces}</span>
                </button>
                <div className="flex gap-2 px-8 pb-2 text-[9px]" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                  <span style={{ color: cycle.drifts ? '#fca5a5' : '#64748b' }}>{cycle.drifts} drifts</span>
                  <span style={{ color: cycle.outliers ? '#f59e0b' : '#64748b' }}>{cycle.outliers} outliers</span>
                </div>
                {open && cycle.id === 'c2' && (
                  <TraceList dismissed={dismissed} selectedTrace={selectedTrace} onSelect={setSelectedTrace} />
                )}
              </div>
            )
          })}
        </aside>

        <main className="flex flex-1 min-w-0 flex-col">
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-border" style={{ background: '#111520' }}>
            {[
              ['230', 'traços analisados', CheckCircle2, '#10b981'],
              ['2', 'mudanças detectadas', Scan, '#dc2626'],
              ['4', 'outliers', AlertTriangle, '#f59e0b'],
              ['1,8 s', 'tempo de análise', Clock3, '#64748b'],
            ].map(([value, label, Icon, color]) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 border-r border-border last:border-r-0">
                <Icon size={14} color={color} />
                <div><p className="text-sm font-semibold text-foreground">{value}</p><p className="text-[9px] text-muted-foreground">{label}</p></div>
              </div>
            ))}
          </div>
          {runState === 'running' ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center"><RefreshCw size={22} className="animate-spin mx-auto mb-3" color="#991b1b" /><p className="text-xs text-muted-foreground">Analisando os traços do ciclo...</p></div>
            </div>
          ) : (
            <DriftChart selectedDrift={selectedDrift} selectedTrace={selectedTrace} onSelectDrift={setSelectedDrift} onSelectTrace={setSelectedTrace} />
          )}
        </main>

        <aside className="hidden lg:block shrink-0 border-l border-border overflow-y-auto" style={{ width: 286, background: '#111520' }}>
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] uppercase text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Detalhe da detecção</p>
          </div>
          {selectedTrace != null && (
            <div className="p-4 border-b border-border">
              <p className="text-xs font-semibold text-foreground">TRACE-{String(selectedTrace + 1).padStart(4, '0')}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Duração total · {metricAt(selectedTrace).toFixed(1)} s</p>
              {selectedIsOutlier && (
                <button type="button" onClick={() => setDismissed((items) => [...items, selectedTrace])}
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
                <p className="text-xs font-semibold text-foreground">Drift #{drift.id.slice(1)}</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: '#fca5a5', background: 'rgba(153,27,27,0.18)' }}>detectado</span>
              </div>
              {[
                ['Início', `Traço ${drift.trace + 1}`],
                ['Faixa afetada', `${drift.trace + 1}–${drift.end + 1}`],
                ['Antes', `${drift.before.toFixed(1)} s`],
                ['Depois', `${drift.after.toFixed(1)} s`],
                ['Variação', `${drift.magnitude > 0 ? '+' : ''}${drift.magnitude.toFixed(1)}%`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-border text-[11px]">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{value}</span>
                </div>
              ))}
              <button type="button" onClick={() => setSelectedDrift(null)}
                className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-[11px] border border-border text-muted-foreground hover:text-foreground">
                <XCircle size={11} />Dispensar alerta
              </button>
            </div>
          ) : (
            <div className="p-6 text-center"><Scan size={18} className="mx-auto mb-2" color="#475569" /><p className="text-[11px] text-muted-foreground">Selecione um drift no gráfico.</p></div>
          )}
        </aside>
      </div>
    </div>
  )
}
