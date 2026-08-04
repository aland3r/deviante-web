/*
  Drift chart for a machine health parameter.

  Deliberately the same visual grammar as the process DriftChart
  (components/process-analysis/ProcessAnalysisView.jsx): grey original series,
  blue processed series, amber outliers, red drift ticks/guides, a faint band
  for the selected drift. Differences are domain, not style — the Y axis is the
  parameter's own unit, and dashed warn/crit lines show the health thresholds
  the ADWIN signal should be read against.
*/

const fmt = (value, unit) =>
  `${Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`

const fmtDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function HealthDriftChart({
  points, processedValues, drifts, outliers, selectedDrift, selectedPoint,
  onSelectDrift, onSelectPoint, unit, warn, crit,
}) {
  const width = 900
  const height = 380
  const pad = { left: 62, right: 24, top: 26, bottom: 40 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const rawValues = points.map((point) => point.v)
  const thresholdCandidates = [warn, crit].filter((value) => value != null && Number.isFinite(value))
  const values = [...rawValues, ...processedValues, ...thresholdCandidates]
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const span = Math.max(rawMax - rawMin, rawMax * 0.1, 1)
  const min = rawMin - span * 0.08
  const max = rawMax + span * 0.08
  const lastIndex = Math.max(points.length - 1, 1)
  const x = (i) => pad.left + (i / lastIndex) * innerW
  const y = (metric) => pad.top + (1 - (metric - min) / Math.max(max - min, 1)) * innerH

  const linePoints = points.map((point, i) => `${x(i)},${y(point.v)}`).join(' ')
  const processedLinePoints = processedValues.map((value, i) => `${x(i)},${y(value)}`).join(' ')
  const yTicks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4)
  const xTicks = Array.from(new Set([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(lastIndex * f))))
  const drift = drifts.find((item) => item.index === selectedDrift) ?? null

  function selectFromPointer(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const localX = ((event.clientX - rect.left) / rect.width) * width
    const i = Math.max(0, Math.min(points.length - 1, Math.round(((localX - pad.left) / innerW) * lastIndex)))
    onSelectPoint(points[i]?.index ?? null)
    const nearby = drifts.find((d) => Math.abs(d.index - i) <= Math.max(2, points.length * 0.01))
    if (nearby) onSelectDrift(nearby.index)
  }

  return (
    <div className="flex-1 min-h-0">
      <div className="flex flex-wrap items-center justify-end gap-3 text-[10px] text-muted-foreground mb-2">
        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-slate-500" />Leitura</span>
        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-blue-400" />Série tratada</span>
        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-amber-500" />Outlier</span>
        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-red-600" />Drift</span>
        {warn != null && <span className="flex items-center gap-1.5"><i className="w-3 h-px" style={{ background: '#f59e0b' }} />Alerta</span>}
        {crit != null && <span className="flex items-center gap-1.5"><i className="w-3 h-px" style={{ background: '#dc2626' }} />Crítico</span>}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minHeight: 260, cursor: 'crosshair' }}
        onClick={selectFromPointer} role="img" aria-label="Gráfico temporal de saúde do parâmetro">
        <rect width={width} height={height} fill="#0d1119" rx="4" />
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.left - 10} y={y(tick) + 3} textAnchor="end" fill="#475569" fontSize="10">{fmt(tick, unit)}</text>
          </g>
        ))}

        {/* Health thresholds — dashed guides the ADWIN signal is read against. */}
        {warn != null && Number.isFinite(warn) && (
          <line x1={pad.left} x2={width - pad.right} y1={y(warn)} y2={y(warn)} stroke="#f59e0b" strokeWidth={1} strokeDasharray="5 4" opacity={0.55} />
        )}
        {crit != null && Number.isFinite(crit) && (
          <line x1={pad.left} x2={width - pad.right} y1={y(crit)} y2={y(crit)} stroke="#dc2626" strokeWidth={1} strokeDasharray="5 4" opacity={0.55} />
        )}

        {/* Faint band for the selected drift's P-F interval. */}
        {drift && (() => {
          const startI = points.findIndex((point) => point.index === drift.anomalyStartIndex)
          const endI = points.findIndex((point) => point.index === drift.index)
          return startI >= 0 && endI >= 0 ? (
            <rect x={x(startI)} y={pad.top} width={Math.max(1, x(endI) - x(startI))} height={innerH} fill="rgba(245,158,11,0.10)" />
          ) : null
        })()}

        {/* All detections as top-rail ticks; only the selected one gets a label. */}
        {drifts.map((item) => {
          const i = points.findIndex((point) => point.index === item.index)
          if (i < 0) return null
          const dx = x(i)
          const isSelected = selectedDrift === item.index
          return (
            <g key={item.index} onClick={(event) => { event.stopPropagation(); onSelectDrift(item.index) }} style={{ cursor: 'pointer' }}>
              <rect x={dx - 5} y={pad.top} width={10} height={innerH} fill="transparent" />
              {!isSelected && <line x1={dx} x2={dx} y1={pad.top} y2={height - pad.bottom} stroke="#dc2626" strokeWidth={1} opacity={0.2} />}
              <path d={`M ${dx - 4} ${pad.top - 9} L ${dx + 4} ${pad.top - 9} L ${dx} ${pad.top - 1} Z`}
                fill={isSelected ? '#ef4444' : 'rgba(220,38,38,0.5)'} />
            </g>
          )
        })}

        <polyline points={linePoints} fill="none" stroke="#64748b" strokeWidth="1" opacity="0.42" />
        <polyline points={processedLinePoints} fill="none" stroke="#4a90c2" strokeWidth="1.8" opacity="0.95" />

        {points.map((point, i) => outliers.has(point.index)
          ? <circle key={point.index} cx={x(i)} cy={y(point.v)} r="2.4" fill="#f59e0b" opacity="0.72" />
          : null)}

        {selectedPoint != null && (() => {
          const i = points.findIndex((point) => point.index === selectedPoint)
          const point = points[i]
          return point ? (
            <g>
              <line x1={x(i)} x2={x(i)} y1={pad.top} y2={height - pad.bottom} stroke="#e2e8f0" opacity="0.45" />
              <circle cx={x(i)} cy={y(point.v)} r="5" fill="#e2e8f0" stroke="#2870a8" strokeWidth="2" />
            </g>
          ) : null
        })()}

        {drift && (() => {
          const startI = points.findIndex((point) => point.index === drift.anomalyStartIndex)
          const endI = points.findIndex((point) => point.index === drift.index)
          if (endI < 0) return null
          const dx = x(endI)
          const number = drifts.indexOf(drift) + 1
          const labelX = Math.min(Math.max(dx, pad.left + 32), width - pad.right - 32)
          return (
            <g pointerEvents="none">
              {startI >= 0 && <line x1={x(startI)} x2={x(startI)} y1={pad.top} y2={height - pad.bottom} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 4" />}
              <line x1={dx} x2={dx} y1={pad.top} y2={height - pad.bottom} stroke="#ef4444" strokeWidth={2} />
              <g transform={`translate(${labelX},${pad.top + 3})`}>
                <rect x={-31} y={0} width={62} height={15} rx={3} fill="#dc2626" />
                <text x={0} y={11} textAnchor="middle" fill="#fff" fontSize="9.5" fontWeight="600" fontFamily="'JetBrains Mono',monospace">Drift #{number}</text>
              </g>
            </g>
          )
        })()}

        {xTicks.map((tick) => (
          <text key={tick} x={x(tick)} y={height - 18} textAnchor="middle" fill="#475569" fontSize="10">
            {points[tick]?.t ? fmtDate(points[tick].t) : tick}
          </text>
        ))}
        <text x={width / 2} y={height - 4} textAnchor="middle" fill="#64748b" fontSize="10">Leituras em ordem cronológica</text>
      </svg>
    </div>
  )
}
