import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { X, ZoomIn, ZoomOut, Maximize2, SlidersHorizontal, RotateCcw, Scan, Upload } from 'lucide-react'
import {
  NODE_W, NODE_H, CIRC_R,
  GRAD_LIGHT, GRAD_MID, GRAD_DEEP, DASH_COLOR,
  STATUS_DOT, STATUS_LABEL,
  freqOpacity, freqHalfW, computeEdgeCPs, edgeArrowPath,
  nodeById, nodeHitTest, getInitialView,
} from './graph-core'
import { buildGraphModel, positionNodes, withEdgeOffsets, formatDuration, formatCount } from './graph-layout'
import { api, ApiError } from '../../lib/api'
import ProcessActivitiesPanel from './ProcessActivitiesPanel'

const MIN_ANALYSIS_TRACES = Number(import.meta.env.VITE_MIN_ANALYSIS_TRACES ?? 32)

/*
  "Grafo do Processo" tab — the canvas plus its two side panels. Visual
  language ported from the Figma Make export "Process Mining Canvas Design"
  (ZZKdwxgmeCNJFG64zGbADe), including the newer export's dotted canvas, the
  traces window and the Horizontal/Vertical toggle sitting INSIDE the canvas
  rather than in the app header.

  Everything drawn here comes from the process's latest parsed event log via
  `GET /api/processes/:id/graph` and `/traces` — the seed PCB line that used
  to live in graph-core.js is gone. A process with no ingested log gets an
  empty state, not a demo graph.
*/

// ─── Small shared bits ──────────────────────────────────────────────────────

function Slider({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px', letterSpacing: '0.06em' }} className="font-medium text-muted-foreground uppercase">{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '10px' }} className="tabular-nums text-muted-foreground">{value}%</span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="w-full h-[3px] rounded-full bg-secondary relative overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${value}%`, background: 'linear-gradient(90deg,#475569,#991b1b)' }} />
        </div>
        <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer" />
        <div className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{ left: `calc(${value}% - 7px)`, background: value > 60 ? '#991b1b' : value > 30 ? '#c2410c' : '#475569' }} />
      </div>
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{value}</span>
    </div>
  )
}

function Histogram({ data }) {
  const bW = 15, gap = 3, maxH = 34
  return (
    <svg width={data.length * (bW + gap) - gap} height={maxH + 2}>
      {data.map((v, i) => (
        <rect key={i} x={i * (bW + gap)} y={maxH - Math.max(2, v * maxH)} width={bW} height={Math.max(2, v * maxH)} rx={2} fill={`rgba(153,27,27,${0.25 + v * 0.75})`} />
      ))}
    </svg>
  )
}

// ─── Cases / layers panel (Figma-layers-style overlay on the left) ──────────

function CasesLayersPanel({ node, variants, onClose }) {
  const relevantVariants = useMemo(
    () => node ? variants.filter((v) => v.nodeIds.includes(node.id)) : variants,
    [variants, node],
  )
  const totalCases = variants.reduce((s, v) => s + v.caseCount, 0)

  const [filter, setFilter] = useState('')
  // Collapsed by default: a real log has dozens of variants, and the export's
  // all-open tree only reads well with the three it invented.
  const [expanded, setExpanded] = useState({})
  const [selectedCase, setSelectedCase] = useState(null)
  const [hiddenVariants, setHiddenVariants] = useState(() => new Set())
  const [ignoredTraces, setIgnoredTraces] = useState(() => new Set())
  const [hoveredCase, setHoveredCase] = useState(null)

  const visibleVariants = useMemo(() => {
    const term = filter.trim().toLowerCase()
    if (!term) return relevantVariants
    return relevantVariants.filter((v) =>
      v.label.toLowerCase().includes(term)
      || v.sequence.some((s) => s.toLowerCase().includes(term))
      || v.cases.some((c) => c.caseId.toLowerCase().includes(term)))
  }, [relevantVariants, filter])

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }))
  const toggleHide = (id, e) => {
    e.stopPropagation()
    setHiddenVariants((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  const ROW_H = 28
  const INDENT = 20

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 30, width: 252,
      background: '#090c13', borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column', fontFamily: "'Inter',sans-serif",
      boxShadow: '4px 0 24px rgba(0,0,0,0.55)', userSelect: 'none',
    }}>
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.10em', color: '#475569', textTransform: 'uppercase' }}>
            Ciclos · Traces
          </span>
          <button onClick={onClose}
            style={{ width: 18, height: 18, borderRadius: 3, border: 'none', background: 'transparent', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569' }}>
            <X size={11} />
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'white', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node?.label || 'Todos os ciclos'}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#64748b' }}>
            {relevantVariants.length} ciclo{relevantVariants.length !== 1 ? 's' : ''}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#64748b' }}>
            {totalCases.toLocaleString('pt-BR')} traces
          </span>
        </div>
      </div>

      <div style={{ padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '4px 8px' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar traces…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', fontFamily: "'Inter',sans-serif", fontSize: 11, padding: 0 }} />
        </div>
        {ignoredTraces.size > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#475569' }}>
              {ignoredTraces.size} ignorado{ignoredTraces.size !== 1 ? 's' : ''}
            </span>
            <button type="button" onClick={() => setIgnoredTraces(new Set())}
              style={{ border: 0, padding: 0, background: 'transparent', color: '#2870a8', fontSize: 9, cursor: 'pointer' }}>
              resetar
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {visibleVariants.length === 0 && (
          <p style={{ padding: '16px 12px', margin: 0, fontSize: 11, color: '#475569', fontFamily: "'Inter',sans-serif" }}>
            Nenhum trace encontrado para “{filter}”.
          </p>
        )}
        {visibleVariants.map((variant) => {
          const isHidden = hiddenVariants.has(variant.id)
          const isOpen = expanded[variant.id]
          const variantColor = variant.deviation ? '#f97316' : '#22c55e'

          return (
            <div key={variant.id}>
              <div onClick={() => toggleExpand(variant.id)}
                style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 8px 0 6px', gap: 5, cursor: 'pointer', opacity: isHidden ? 0.35 : 1, background: 'transparent', transition: 'background 0.1s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>

                <button onClick={(e) => toggleHide(variant.id, e)}
                  style={{ width: 16, height: 16, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', color: isHidden ? '#1e2738' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'white' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = isHidden ? '#1e2738' : '#475569' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isHidden
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
                  </svg>
                </button>

                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" style={{ flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>

                <svg width="12" height="12" viewBox="0 0 24 24" fill={variantColor} opacity={0.7} style={{ flexShrink: 0 }}>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>

                <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.80)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {variant.label}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#475569', flexShrink: 0 }}>
                  {variant.caseCount}
                </span>
              </div>

              {isOpen && variant.cases.map((c) => {
                const isSelCase = selectedCase === c.id
                const isIgnored = ignoredTraces.has(c.id)
                const isHovered = hoveredCase === c.id
                return (
                  <div key={c.id} onClick={() => setSelectedCase(isSelCase ? null : c.id)}
                    style={{
                      height: ROW_H, display: 'flex', alignItems: 'center',
                      padding: `0 8px 0 ${INDENT}px`, gap: 5, cursor: 'pointer',
                      background: isSelCase ? 'rgba(40,112,168,0.20)' : 'transparent',
                      borderLeft: isSelCase ? '2px solid #2870a8' : '2px solid transparent',
                      transition: 'background 0.1s', opacity: isHidden ? 0.2 : isIgnored ? 0.25 : 1,
                    }}
                    onMouseEnter={(e) => { setHoveredCase(c.id); if (!isSelCase) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={(e) => { setHoveredCase(null); if (!isSelCase) e.currentTarget.style.background = 'transparent' }}>

                    <div style={{ width: 16, flexShrink: 0 }} />
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_DOT[c.status], flexShrink: 0 }} />
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: isSelCase ? 'white' : 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isIgnored ? 'line-through' : 'none' }}>
                      {c.caseId}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#475569', flexShrink: 0 }}>
                      {formatDuration(c.durationSeconds)}
                    </span>
                    <button type="button" title={isIgnored ? 'Reincluir trace' : 'Ignorar trace nesta análise'}
                      onClick={(event) => {
                        event.stopPropagation()
                        setIgnoredTraces((current) => {
                          const next = new Set(current)
                          if (next.has(c.id)) next.delete(c.id); else next.add(c.id)
                          return next
                        })
                      }}
                      style={{
                        width: 16, height: 16, border: 0, padding: 0, background: 'transparent',
                        color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        visibility: isHovered || isIgnored ? 'visible' : 'hidden', cursor: 'pointer',
                      }}>
                      <X size={9} />
                    </button>
                  </div>
                )
              })}

              {isOpen && variant.caseCount > variant.cases.length && (
                <div style={{ height: 24, display: 'flex', alignItems: 'center', paddingLeft: INDENT + 31, gap: 4 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#2870a8', cursor: 'pointer' }}>
                    + {(variant.caseCount - variant.cases.length).toLocaleString('pt-BR')} traces ocultos…
                  </span>
                </div>
              )}

              <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '2px 0' }} />
            </div>
          )
        })}
      </div>

      {selectedCase ? (() => {
        const c = relevantVariants.flatMap((v) => v.cases).find((x) => x.id === selectedCase)
        if (!c) return null
        return (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', flexShrink: 0 }}>
            <p style={{ margin: '0 0 6px', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trace selecionado</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                ['ID', c.caseId],
                ['Duração', formatDuration(c.durationSeconds)],
                ['Início', c.startedAt ? new Date(c.startedAt).toLocaleString('pt-BR') : '—'],
                ['Status', STATUS_LABEL[c.status] ?? c.status],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#475569' }}>{k}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })() : null}
    </div>
  )
}

// ─── Right-rail activity detail ─────────────────────────────────────────────

function NodeDetailPanel({ node, onClose }) {
  const [tab, setTab] = useState('freq')
  const m = node.metrics
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-start justify-between p-4 pb-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Detalhe da Atividade</p>
          <h3 className="text-sm font-semibold text-foreground leading-tight pr-2">{node.label}</h3>
        </div>
        <button onClick={onClose} className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><X size={13} /></button>
      </div>
      <div className="flex border-b border-border">
        {['freq', 'perf'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 py-2.5 text-xs font-medium transition-colors relative"
            style={{ color: tab === t ? '#e2e8f0' : '#64748b', fontFamily: "'JetBrains Mono',monospace" }}>
            {t === 'freq' ? 'Frequência' : 'Desempenho'}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-800" />}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'freq' ? (
          <>
            <StatRow label="Frequência absoluta" value={m.absoluteFreq.toLocaleString('pt-BR')} />
            <StatRow label="Frequência por caso" value={m.caseFreq.toLocaleString('pt-BR')} />
            <StatRow label="Máx. repetições" value={`${m.maxRepetitions}×`} />
            <StatRow label="Frequência final" value={m.endFreq.toLocaleString('pt-BR')} />
          </>
        ) : (
          <>
            <StatRow label="Duração total" value={m.totalDuration} />
            <StatRow label="Duração mediana" value={m.medianDuration} />
            <StatRow label="Duração média" value={m.meanDuration} />
            <StatRow label="Duração máxima" value={m.maxDuration} />
            <StatRow label="Duração mínima" value={m.minDuration} />
            <div className="pt-4">
              <p className="text-[10px] text-muted-foreground mb-2.5 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Distribuição de duração</p>
              <Histogram data={m.histogram} />
              <div className="flex justify-between mt-1"><span className="text-[9px] text-muted-foreground">mín</span><span className="text-[9px] text-muted-foreground">máx</span></div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── SVG node shapes ────────────────────────────────────────────────────────

function SvgDefs() {
  return (
    <defs>
      <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.048)" />
      </pattern>
      <marker id="arrow-dashed" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
        <path d="M 0 1 L 8 4 L 0 7 Z" fill={DASH_COLOR} />
      </marker>
    </defs>
  )
}

function StartNode({ isSelected, layout }) {
  const cx = CIRC_R, cy = CIRC_R
  const play = layout === 'horizontal' ? `${cx - 8},${cy - 10} ${cx + 11},${cy} ${cx - 8},${cy + 10}` : `${cx - 10},${cy - 8} ${cx + 10},${cy - 8} ${cx},${cy + 11}`
  return (<g style={{ cursor: 'pointer' }}>{isSelected && <circle cx={cx} cy={cy} r={CIRC_R + 6} fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth={1.5} />}<circle cx={cx} cy={cy} r={CIRC_R} fill="#064e3b" stroke="#10b981" strokeWidth={2} /><polygon points={play} fill="#34d399" /></g>)
}

function EndNode({ isSelected }) {
  const cx = CIRC_R, cy = CIRC_R
  return (<g style={{ cursor: 'pointer' }}>{isSelected && <circle cx={cx} cy={cy} r={CIRC_R + 6} fill="rgba(153,27,27,0.15)" stroke="#991b1b" strokeWidth={1.5} />}<circle cx={cx} cy={cy} r={CIRC_R} fill="#3b0a0a" stroke="#991b1b" strokeWidth={2} /><circle cx={cx} cy={cy} r={CIRC_R - 7} fill="#991b1b" /></g>)
}

function ActivityNode({ node, isSelected }) {
  const a = 0.20 + (node.frequency / 100) * 0.65
  return (<g style={{ cursor: 'pointer' }}>
    {isSelected && <rect x={-3} y={-3} width={NODE_W + 6} height={NODE_H + 6} rx={7} fill="rgba(153,27,27,0.10)" stroke="#991b1b" strokeWidth={1.5} />}
    <rect x={0} y={0} width={NODE_W} height={NODE_H} rx={5} fill={isSelected ? '#1e2840' : '#16202e'} stroke={isSelected ? '#991b1b' : 'rgba(255,255,255,0.10)'} strokeWidth={isSelected ? 1.5 : 1} />
    <rect x={0} y={0} width={NODE_W} height={3} rx={3} fill={`rgba(153,27,27,${a})`} />
    <rect x={0} y={1.5} width={NODE_W} height={1.5} fill={`rgba(153,27,27,${a})`} />
    <text x={12} y={24} fontSize={12} fontFamily="'Inter',sans-serif" fontWeight="500" fill="#e2e8f0" letterSpacing="-0.01em">{node.label.length > 22 ? node.label.slice(0, 21) + '…' : node.label}</text>
    <text x={12} y={43} fontSize={11} fontFamily="'JetBrains Mono',monospace" fill={isSelected ? '#fca5a5' : '#64748b'} letterSpacing="0.01em">{node.displayMetric}</text>
  </g>)
}

// ─── Empty / error canvas ───────────────────────────────────────────────────

/**
 * No parsed log means there is no graph to draw — say that instead of
 * showing a demo one. A log that failed to parse is a different sentence:
 * the process has history, it just has nothing drawable.
 */
function EmptyCanvas({ message, eventLog, onUploadLog }) {
  const failed = eventLog?.parseStatus === 'failed'
  return (
    <div className="flex flex-1 items-center justify-center p-8" style={{ background: '#090d14' }}>
      <div className="flex flex-col items-center gap-4 text-center" style={{ maxWidth: 380 }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Upload size={18} color="#475569" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {message ? 'Não foi possível carregar o grafo' : failed ? 'O último log não pôde ser interpretado' : 'Nenhum log de eventos neste processo'}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            {message
              || (failed
                ? `${eventLog.fileName}: ${eventLog.parseError ?? 'arquivo inválido'}. Envie outro arquivo .xes ou .csv.`
                : 'O grafo é derivado do log carregado (UC4) — envie um arquivo .xes ou .csv para desenhar este processo.')}
          </p>
        </div>
        {onUploadLog && (
          <button type="button" onClick={onUploadLog}
            className="flex items-center gap-2 py-2 px-3 rounded text-xs font-medium transition-colors border border-border text-muted-foreground hover:text-foreground"
            style={{ fontFamily: "'JetBrains Mono',monospace" }}>
            <Upload size={12} />Carregar log de eventos
          </button>
        )}
      </div>
    </div>
  )
}

function DefinedModelCanvas({ activities, onUploadLog }) {
  return (
    <div className="relative flex-1 overflow-auto p-8" style={{
      backgroundColor: '#090d14',
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 0.8px, transparent 0.8px)',
      backgroundSize: '24px 24px',
    }}>
      {activities.length ? (
        <div className="grid gap-5 content-start mx-auto" style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 220px))',
          maxWidth: 920,
        }}>
          {activities.map((activity) => (
            <div key={activity.id} className="relative overflow-hidden border border-border"
              style={{ minHeight: 64, borderRadius: 5, background: '#16202e' }}>
              <div className="h-[3px]" style={{ background: 'rgba(40,112,168,0.85)' }} />
              <div className="px-3 py-2.5">
                <p className="text-xs font-medium text-foreground truncate">{activity.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2"
                  style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                  {activity.description || 'Atividade definida no processo'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-sm">
            <p className="text-sm font-medium text-foreground">O modelo definido está vazio</p>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              Crie atividades no painel lateral ou carregue um log para descobrir o processo observado.
            </p>
            <button type="button" onClick={onUploadLog}
              className="inline-flex items-center gap-2 mt-4 py-2 px-3 rounded text-xs border border-border text-muted-foreground hover:text-foreground">
              <Upload size={12} />Carregar log
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab body ───────────────────────────────────────────────────────────────

export default function ProcessGraphTab({ processId, isMobile, onStats, onUploadLog, onAnalyze }) {
  const [layout, setLayout] = useState('vertical')
  const [pan, setPan] = useState(() => getInitialView('vertical').pan)
  const [zoom, setZoom] = useState(() => getInitialView('vertical').zoom)
  const [selectedId, setSelectedId] = useState(null)
  const [actSlider, setActSlider] = useState(80)
  const [pathSlider, setPathSlider] = useState(52)
  const [cursorGrab, setCursorGrab] = useState(false)
  const [mobileFilters, setMobileFilters] = useState(false)
  const [showCasesPanel, setShowCasesPanel] = useState(false)

  const [graph, setGraph] = useState(null)
  const [variants, setVariants] = useState([])
  const [definedActivities, setDefinedActivities] = useState([])
  const [activityCatalog, setActivityCatalog] = useState([])
  const [viewMode, setViewMode] = useState('defined')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const isDragging = useRef(false)
  const onNode = useRef(false)
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const touchOrigin = useRef({ tx: 0, ty: 0, px: 0, py: 0 })
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  // The graph and the variant tree are two views of the same ingestion, so
  // they load together — a canvas whose traces panel disagrees with its nodes
  // would be worse than one that is still loading.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.getProcessGraph(processId),
      api.getProcessTraces(processId),
      api.listProcessActivities(processId),
      api.listActivities(),
    ])
      .then(([graphData, traceData, processActivities, catalog]) => {
        if (cancelled) return
        setGraph(graphData)
        setVariants(traceData.variants ?? [])
        setDefinedActivities(processActivities)
        setActivityCatalog(catalog)
        setViewMode(graphData.nodes?.length ? 'observed' : 'defined')
        setLoadError('')
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar o grafo deste processo.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [processId])

  const model = useMemo(() => buildGraphModel(graph), [graph])

  // Report upwards so the header badge counts the same cases the canvas draws.
  useEffect(() => {
    onStats?.({
      caseCount: graph?.caseCount ?? 0,
      eventLog: graph?.eventLog ?? null,
      hasUnmappedOperations: graph?.hasUnmappedOperations ?? false,
      definedActivityCount: definedActivities.length,
      analysisMinimumTraces: MIN_ANALYSIS_TRACES,
      analysisEligible: (graph?.caseCount ?? 0) >= MIN_ANALYSIS_TRACES
        && !(graph?.hasUnmappedOperations ?? false),
    })
  }, [graph, definedActivities.length, onStats])

  // Reset the viewport when the direction flips — the coordinates change.
  useEffect(() => {
    const v = getInitialView(layout)
    setPan(v.pan); setZoom(v.zoom)
  }, [layout])

  const nodes = useMemo(() => positionNodes(model.nodes, layout), [model.nodes, layout])
  const actThr = (1 - actSlider / 100) * 100
  const pathThr = (1 - pathSlider / 100)
  const visNodes = nodes.filter((n) => n.isStart || n.isEnd || n.frequency >= actThr)
  const visIds = new Set(visNodes.map((n) => n.id))
  // Keyed on the visible set itself, not on `nodes`: raising the activity
  // slider hides nodes, and their edges have to go with them.
  const visKey = [...visIds].join('|')
  const visEdges = useMemo(() => {
    const visible = new Set(visKey ? visKey.split('|') : [])
    return withEdgeOffsets(
      model.edges.filter((e) => e.frequency >= pathThr && visible.has(e.source) && visible.has(e.target)),
      nodes, layout,
    )
  }, [model.edges, pathThr, visKey, nodes, layout])
  const sideExitMap = useMemo(() => {
    if (layout !== 'vertical') return {}
    const bySource = {}
    visEdges.forEach((edge) => { (bySource[edge.source] ??= []).push(edge) })
    const exits = {}
    Object.entries(bySource).forEach(([sourceId, edges]) => {
      if (edges.length <= 1) return
      const source = nodeById(nodes, sourceId)
      ;[...edges].sort((a, b) => b.frequency - a.frequency).forEach((edge, index) => {
        if (index === 0) {
          exits[edge.id] = 'bottom'
          return
        }
        const target = nodeById(nodes, edge.target)
        if (source && target) {
          exits[edge.id] = target.x + NODE_W / 2 < source.x + NODE_W / 2 ? 'left' : 'right'
        }
      })
    })
    return exits
  }, [layout, nodes, visEdges])
  // Only activity nodes carry metrics — Início/Fim are graph punctuation.
  const activityNodeCount = model.nodes.filter((n) => !n.isStart && !n.isEnd).length
  const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId && !n.isStart && !n.isEnd) ?? null : null
  const hasObservedProcess = model.nodes.length > 0
  const analysisEligible = (graph?.caseCount ?? 0) >= MIN_ANALYSIS_TRACES
    && !graph?.hasUnmappedOperations

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1)
    const f = Math.exp(-delta * 0.002)
    setZoom((z) => {
      const nz = Math.min(3, Math.max(0.2, z * f))
      if (nz === z) return z
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      setPan((p) => ({ x: mx - (mx - p.x) * (nz / z), y: my - (my - p.y) * (nz / z) }))
      return nz
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current; if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel, loading])

  function toCanvas(vx, vy) {
    const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return { x: 0, y: 0 }
    return { x: (vx - rect.left - pan.x) / zoom, y: (vy - rect.top - pan.y) / zoom }
  }
  function getNodeAt(vx, vy) { const { x, y } = toCanvas(vx, vy); return visNodes.find((n) => nodeHitTest(n, x, y)) }

  function onMouseDown(e) {
    if (e.button !== 0) return
    const node = getNodeAt(e.clientX, e.clientY); onNode.current = !!node
    if (!node) { isDragging.current = true; setCursorGrab(true); dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y } }
  }
  function onMouseMove(e) {
    if (!isDragging.current || onNode.current) return
    setPan({ x: dragOrigin.current.px + (e.clientX - dragOrigin.current.mx), y: dragOrigin.current.py + (e.clientY - dragOrigin.current.my) })
  }
  function onMouseUp(e) {
    if (onNode.current) {
      const node = getNodeAt(e.clientX, e.clientY)
      if (node) { setSelectedId((prev) => (prev === node.id ? null : node.id)); setShowCasesPanel(true) }
    }
    isDragging.current = false; onNode.current = false; setCursorGrab(false)
  }
  function onTouchStart(e) {
    if (e.touches.length !== 1) return
    const t = e.touches[0]; onNode.current = !!getNodeAt(t.clientX, t.clientY)
    if (!onNode.current) touchOrigin.current = { tx: t.clientX, ty: t.clientY, px: pan.x, py: pan.y }
  }
  function onTouchMove(e) {
    if (e.touches.length !== 1 || onNode.current) return
    const t = e.touches[0]
    setPan({ x: touchOrigin.current.px + (t.clientX - touchOrigin.current.tx), y: touchOrigin.current.py + (t.clientY - touchOrigin.current.ty) })
  }
  function onTouchEnd(e) {
    if (onNode.current && e.changedTouches.length === 1) {
      const t = e.changedTouches[0]; const node = getNodeAt(t.clientX, t.clientY)
      if (node) setSelectedId((prev) => (prev === node.id ? null : node.id))
    }
    onNode.current = false
  }
  const fitView = useCallback(() => {
    if (!visNodes.length) return
    const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return
    const xs = visNodes.map((n) => n.x), ys = visNodes.map((n) => n.y), pad = 60
    const nz = Math.min((rect.width - pad * 2) / (Math.max(...xs) + NODE_W - Math.min(...xs)), (rect.height - pad * 2) / (Math.max(...ys) + NODE_H - Math.min(...ys)), 1.6)
    setPan({ x: pad - Math.min(...xs) * nz, y: pad - Math.min(...ys) * nz }); setZoom(nz)
  }, [visNodes])

  // A log's shape is unknown until it is fetched, so the export's fixed
  // starting pan/zoom can leave the graph off-screen — frame it once instead.
  const framed = useRef(false)
  useEffect(() => {
    if (framed.current || loading || nodes.length === 0) return
    framed.current = true
    fitView()
  }, [loading, nodes.length, fitView])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: '#090d14' }}>
        <p className="text-sm text-muted-foreground">Carregando grafo…</p>
      </div>
    )
  }

  return (
    <>
      <div className="relative flex flex-1 min-w-0 overflow-hidden" style={{ background: '#090d14' }}>
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center p-0.5 rounded border border-border"
          style={{ background: '#111520' }}>
          <button type="button" onClick={() => setViewMode('defined')}
            className="px-3 py-1.5 rounded text-[10px] transition-colors"
            style={{
              background: viewMode === 'defined' ? '#1e2738' : 'transparent',
              color: viewMode === 'defined' ? '#e2e8f0' : '#64748b',
              fontFamily: "'JetBrains Mono',monospace",
            }}>
            Modelo definido
          </button>
          <button type="button" onClick={() => hasObservedProcess && setViewMode('observed')}
            disabled={!hasObservedProcess}
            title={hasObservedProcess ? 'Ver processo derivado do log' : 'Mapeie um log para gerar esta visão'}
            className="px-3 py-1.5 rounded text-[10px] transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
            style={{
              background: viewMode === 'observed' ? '#1e2738' : 'transparent',
              color: viewMode === 'observed' ? '#e2e8f0' : '#64748b',
              fontFamily: "'JetBrains Mono',monospace",
            }}>
            Processo observado
          </button>
        </div>

        {viewMode === 'defined' ? (
          <DefinedModelCanvas activities={definedActivities} onUploadLog={onUploadLog} />
        ) : loadError || !hasObservedProcess ? (
          <EmptyCanvas message={loadError} eventLog={graph?.eventLog ?? null} onUploadLog={onUploadLog} />
        ) : (
      <div ref={containerRef} className="relative flex-1 min-w-0 overflow-hidden" style={{ background: '#090d14' }}>

        {!isMobile && showCasesPanel && (
          <CasesLayersPanel node={selectedNode} variants={variants} onClose={() => setShowCasesPanel(false)} />
        )}

        <svg ref={svgRef} className="w-full h-full"
          style={{ cursor: cursorGrab ? 'grabbing' : 'grab', touchAction: 'none' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
          onMouseLeave={() => { isDragging.current = false; setCursorGrab(false) }}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <SvgDefs />
          <rect width="100%" height="100%" fill="url(#dots)" />
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {visEdges.map((edge) => {
              const src = nodeById(nodes, edge.source), tgt = nodeById(nodes, edge.target)
              if (!src || !tgt) return null
              const offset = layout === 'horizontal' ? (edge.offsetH ?? 0) : (edge.offsetV ?? 0)
              const cps = computeEdgeCPs(src, tgt, layout, offset, sideExitMap[edge.id])
              const { midX, midY } = cps
              const opacity = freqOpacity(edge.frequency)

              // Gradient runs source → target in the transformed canvas space.
              const gSrc = cps.p0
              const gTgt = cps.kind === 'cubic' ? cps.p3 : cps.p2
              const gid = `fg-${edge.id}`, dgid = `dg-${edge.id}`

              if (edge.dashed) {
                let d
                if (cps.kind === 'cubic') { const { p0, p1, p2, p3 } = cps; d = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}` }
                else { const { p0, p1, p2 } = cps; d = `M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y}, ${p2.x} ${p2.y}` }
                return (
                  <g key={edge.id} opacity={opacity * 0.60}>
                    <defs>
                      <linearGradient id={dgid} x1={gSrc.x} y1={gSrc.y} x2={gTgt.x} y2={gTgt.y} gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor={DASH_COLOR} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={DASH_COLOR} stopOpacity={1.00} />
                      </linearGradient>
                    </defs>
                    <path d={d} fill="none" stroke={`url(#${dgid})`} strokeWidth={1.6} strokeDasharray="6 4" strokeLinecap="round" markerEnd="url(#arrow-dashed)" />
                    <g transform={`translate(${midX},${midY})`}>
                      <rect x={-28} y={-10} width={56} height={18} rx={3} fill="rgba(8,12,20,0.92)" stroke="rgba(90,143,184,0.15)" strokeWidth={0.8} />
                      <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontFamily="'JetBrains Mono',monospace" fill="#4a7898" letterSpacing="0.01em">{edge.label.split(' · ')[0]}</text>
                    </g>
                  </g>
                )
              }

              const halfW = freqHalfW(edge.frequency), arrowD = edgeArrowPath(cps, halfW)
              const labelAlpha = (0.40 + edge.frequency * 0.55).toFixed(2)
              return (
                <g key={edge.id} opacity={opacity}>
                  <defs>
                    <linearGradient id={gid} x1={gSrc.x} y1={gSrc.y} x2={gTgt.x} y2={gTgt.y} gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor={GRAD_LIGHT} />
                      <stop offset="55%" stopColor={GRAD_MID} />
                      <stop offset="100%" stopColor={GRAD_DEEP} />
                    </linearGradient>
                  </defs>
                  <path d={arrowD} fill={`url(#${gid})`} />
                  <g transform={`translate(${midX},${midY})`}>
                    <rect x={-30} y={-11} width={60} height={20} rx={4} fill="rgba(8,12,20,0.88)" stroke="rgba(77,143,192,0.16)" strokeWidth={0.8} />
                    <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={9.5} fontFamily="'JetBrains Mono',monospace" fill={`rgba(140,195,230,${labelAlpha})`} letterSpacing="0.01em">{edge.label.split(' · ')[0]}</text>
                  </g>
                </g>
              )
            })}
            {visNodes.map((node) => (
              <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                {node.isStart ? <StartNode node={node} isSelected={selectedId === node.id} layout={layout} />
                  : node.isEnd ? <EndNode node={node} isSelected={selectedId === node.id} />
                    : <ActivityNode node={node} isSelected={selectedId === node.id} />}
              </g>
            ))}
          </g>
        </svg>

        <div className="absolute bottom-5 right-5 flex flex-col rounded overflow-hidden border border-border" style={{ background: '#161c28' }}>
          {[
            { icon: <ZoomIn size={13} />, fn: () => setZoom((z) => Math.min(3, z * 1.2)), title: 'Aumentar zoom' },
            { icon: <ZoomOut size={13} />, fn: () => setZoom((z) => Math.max(0.2, z * 0.8)), title: 'Reduzir zoom' },
            { icon: <Maximize2 size={13} />, fn: fitView, title: 'Ajustar visualização' },
          ].map(({ icon, fn, title }, i) => (
            <button key={i} onClick={fn} title={title}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-b border-border last:border-0">
              {icon}
            </button>
          ))}
        </div>
        <div className="absolute bottom-[122px] right-5 w-8 text-center text-[9px] text-muted-foreground"
          style={{ fontFamily: "'JetBrains Mono',monospace" }}>
          {Math.round(zoom * 100)}%
        </div>

        {/* Direction toggle — inside the canvas, per the newer Figma export;
            it steers the drawing, not the app shell, so it lives with it. */}
        {!isMobile && (
          <button onClick={() => setLayout((l) => (l === 'horizontal' ? 'vertical' : 'horizontal'))}
            title="Alternar direção do grafo"
            style={{
              position: 'absolute', bottom: 154, right: 20, zIndex: 20,
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.09)', background: '#161c28', color: '#64748b',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = '#94a3b8' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#64748b' }}>
            <RotateCcw size={13} style={{ transform: layout === 'horizontal' ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
          </button>
        )}

        {/* Traces window toggle — only meaningful with an activity selected,
            since the panel lists the variants that pass through it. */}
        {!isMobile && (
          <button onClick={() => setShowCasesPanel((v) => !v)}
            style={{
              position: 'absolute', bottom: 20, left: 20,
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 8px', borderRadius: 6,
              border: `1px solid ${showCasesPanel ? 'rgba(40,112,168,0.50)' : 'rgba(255,255,255,0.09)'}`,
              background: showCasesPanel ? 'rgba(40,112,168,0.18)' : '#161c28',
              color: showCasesPanel ? '#c8e2f5' : '#64748b',
              cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            {showCasesPanel ? 'Ocultar ciclos' : `${formatCount(graph?.caseCount ?? 0)} traces`}
          </button>
        )}

        {isMobile && (
          <div className="absolute top-4 right-4 z-20">
            <button onClick={() => setMobileFilters((v) => !v)}
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-border transition-colors"
              style={{ background: mobileFilters ? '#1e2738' : '#161c28', color: mobileFilters ? '#e2e8f0' : '#64748b' }}>
              <SlidersHorizontal size={14} />
            </button>
            {mobileFilters && (
              <div className="absolute top-full right-0 mt-2 p-4 rounded-xl border border-border space-y-5"
                style={{ background: '#161c28', width: '220px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <Slider label="Atividades" value={actSlider} onChange={setActSlider} />
                <Slider label="Caminhos" value={pathSlider} onChange={setPathSlider} />
              </div>
            )}
          </div>
        )}
      </div>
        )}
      </div>

      {!isMobile && (
        <div className="shrink-0 flex flex-col border-l border-border" style={{ width: '284px', background: '#111520' }}>
          <div className="shrink-0 p-3 border-b border-border">
            <button type="button" onClick={onUploadLog}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-medium transition-colors border border-border text-muted-foreground hover:text-foreground"
              style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              <Upload size={12} />{graph?.eventLog ? 'Recarregar log' : 'Carregar log de eventos'}
            </button>
          </div>

          {viewMode === 'defined' ? (
            <ProcessActivitiesPanel
              processId={processId}
              activities={definedActivities}
              catalog={activityCatalog}
              onActivitiesChange={setDefinedActivities}
              onCatalogChange={setActivityCatalog}
            />
          ) : (
            <>
              <div className="p-4 border-b border-border space-y-5">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground"
                  style={{ fontFamily: "'JetBrains Mono',monospace" }}>Densidade do grafo</p>
                <Slider label="Atividades" value={actSlider} onChange={setActSlider} />
                <Slider label="Caminhos" value={pathSlider} onChange={setPathSlider} />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground"><span className="text-foreground font-medium">{visNodes.filter((n) => !n.isStart && !n.isEnd).length}</span> de {activityNodeCount}</span>
                  <span className="text-[11px] text-muted-foreground"><span className="text-foreground font-medium">{visEdges.length}</span> caminhos</span>
                </div>
              </div>
              {selectedNode ? (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <NodeDetailPanel node={selectedNode} onClose={() => setSelectedId(null)} />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-center">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Selecione uma atividade</p>
                    <p className="text-[11px] text-muted-foreground mt-1 opacity-60">Inspecione frequência e desempenho.</p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="shrink-0 p-3 border-t border-border mt-auto space-y-2">
            {graph?.eventLog && (
              <p className="text-[10px] text-muted-foreground truncate"
                style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                {graph.eventLog.fileName} · {formatCount(graph.caseCount)} traces
              </p>
            )}
            <button type="button" onClick={() => onAnalyze?.(selectedNode)}
              disabled={!analysisEligible}
              title={!graph?.caseCount
                ? 'Carregue e mapeie um log antes de analisar'
                : graph.hasUnmappedOperations
                  ? 'Conclua o mapeamento antes de analisar'
                  : graph.caseCount < MIN_ANALYSIS_TRACES
                    ? `São necessários ao menos ${MIN_ANALYSIS_TRACES} traces`
                    : 'Gerar análise de desvios'}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded text-xs font-medium disabled:opacity-35 disabled:cursor-not-allowed"
              style={{ background: 'rgba(180,83,9,0.16)', color: '#fbbf24', border: '1px solid rgba(180,83,9,0.42)' }}>
              <Scan size={12} />Gerar análise de desvios
            </button>
          </div>
        </div>
      )}

      {isMobile && (
        <>
          <div onClick={() => setSelectedId(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.55)', opacity: selectedNode ? 1 : 0, pointerEvents: selectedNode ? 'auto' : 'none', transition: 'opacity 0.3s ease' }} />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, background: '#161c28', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px 20px 0 0', maxHeight: '78vh', display: 'flex', flexDirection: 'column', transform: selectedNode ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}><div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} /></div>
            {selectedNode && <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><NodeDetailPanel node={selectedNode} onClose={() => setSelectedId(null)} /></div>}
          </div>
        </>
      )}
    </>
  )
}
