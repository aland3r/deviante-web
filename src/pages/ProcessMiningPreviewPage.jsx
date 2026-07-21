import { useState, useRef, useCallback, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Upload, ZoomIn, ZoomOut, Maximize2, AlignCenter, SlidersHorizontal,
} from 'lucide-react'

/*
  Preview / demo screen — ported from the Figma Make export
  "Process Mining Canvas Design" (ZZKdwxgmeCNJFG64zGbADe).

  Runs entirely on simulated seed data (a PCB assembly line's operations),
  not on a real uploaded event log — event_logs/operations/traces schema
  isn't applied yet (see gestalt-kit/plans/sprint-plan-2026-07.md). This
  screen shows what the graph looks like; it does not read or write real
  Deviante data. Swap NODE_DEFS/EDGE_DEFS for a real API call once UC4/UC12
  land.
*/

// ─── Graph constants ────────────────────────────────────────────────────────

const NODE_W = 176
const NODE_H = 64
const CIRC_R = 26

// ─── Seed data (simulated — manufacturing PCB assembly line) ───────────────

const NODE_DEFS = [
  { id: 'n1', label: 'Solicitação de Material', hx: 80, hy: 240, vx: 230, vy: 60, frequency: 100, displayMetric: '856 casos', isStart: true,
    metrics: { absoluteFreq: 856, caseFreq: 856, maxRepetitions: 1, endFreq: 0, totalDuration: '29d 8h', medianDuration: '48m', meanDuration: '49m', maxDuration: '4h 12m', minDuration: '3m', histogram: [.60, 1, .85, .55, .30, .14, .06, .03, .01, .01] } },
  { id: 'n2', label: 'Inspeção de Componentes', hx: 340, hy: 100, vx: 230, vy: 210, frequency: 96, displayMetric: '822 casos',
    metrics: { absoluteFreq: 822, caseFreq: 822, maxRepetitions: 2, endFreq: 0, totalDuration: '82d 14h', medianDuration: '2h 22m', meanDuration: '2h 24m', maxDuration: '9h 40m', minDuration: '18m', histogram: [.08, .30, .72, 1, .82, .50, .24, .10, .04, .01] } },
  { id: 'n3', label: 'Montagem de PCB', hx: 600, hy: 240, vx: 230, vy: 360, frequency: 90, displayMetric: '771 casos',
    metrics: { absoluteFreq: 771, caseFreq: 736, maxRepetitions: 3, endFreq: 0, totalDuration: '214d 6h', medianDuration: '6h 42m', meanDuration: '6h 40m', maxDuration: '28h 15m', minDuration: '1h 10m', histogram: [.05, .14, .38, .75, 1, .88, .56, .28, .10, .03] } },
  { id: 'n4', label: 'Soldagem por Onda', hx: 860, hy: 100, vx: 230, vy: 510, frequency: 86, displayMetric: '736 casos',
    metrics: { absoluteFreq: 736, caseFreq: 720, maxRepetitions: 2, endFreq: 0, totalDuration: '61d 8h', medianDuration: '1h 58m', meanDuration: '2h', maxDuration: '8h 30m', minDuration: '25m', histogram: [.18, .48, .82, 1, .78, .48, .22, .08, .03, .01] } },
  { id: 'n5', label: 'Controle de Qualidade', hx: 860, hy: 380, vx: 230, vy: 660, frequency: 84, displayMetric: '719 casos',
    metrics: { absoluteFreq: 719, caseFreq: 698, maxRepetitions: 2, endFreq: 0, totalDuration: '89d 18h', medianDuration: '2h 58m', meanDuration: '3h', maxDuration: '12h 20m', minDuration: '32m', histogram: [.10, .28, .65, 1, .90, .60, .30, .12, .04, .01] } },
  { id: 'n6', label: 'Retrabalho', hx: 1100, hy: 240, vx: 30, vy: 760, frequency: 16, displayMetric: '137 casos',
    metrics: { absoluteFreq: 137, caseFreq: 128, maxRepetitions: 3, endFreq: 0, totalDuration: '48d 10h', medianDuration: '8h 30m', meanDuration: '8h 28m', maxDuration: '32h', minDuration: '1h 20m', histogram: [.04, .12, .30, .65, 1, .88, .54, .24, .08, .02] } },
  { id: 'n7', label: 'Inspeção Final', hx: 1340, hy: 240, vx: 230, vy: 810, frequency: 76, displayMetric: '651 casos',
    metrics: { absoluteFreq: 651, caseFreq: 636, maxRepetitions: 1, endFreq: 0, totalDuration: '54d 4h', medianDuration: '2h', meanDuration: '2h', maxDuration: '7h 45m', minDuration: '20m', histogram: [.20, .55, .90, 1, .74, .44, .20, .08, .03, .01] } },
  { id: 'n8', label: 'Embalagem', hx: 1590, hy: 240, vx: 230, vy: 960, frequency: 82, displayMetric: '702 casos', isEnd: true,
    metrics: { absoluteFreq: 702, caseFreq: 702, maxRepetitions: 1, endFreq: 702, totalDuration: '17d 12h', medianDuration: '36m', meanDuration: '36m', maxDuration: '2h 10m', minDuration: '8m', histogram: [.50, 1, .90, .62, .36, .18, .08, .03, .01, .01] } },
]

const EDGE_DEFS = [
  { id: 'e1', source: 'n1', target: 'n2', frequency: 0.96, label: '856 · 49m' },
  { id: 'e2', source: 'n2', target: 'n3', frequency: 0.90, label: '771 · 2h 22m' },
  { id: 'e3', source: 'n3', target: 'n4', frequency: 0.86, label: '736 · 6h 42m' },
  { id: 'e4', source: 'n4', target: 'n5', frequency: 0.85, label: '728 · 1h 58m' },
  { id: 'e5', source: 'n5', target: 'n7', frequency: 0.72, label: '616 · 2h 58m' },
  { id: 'e6', source: 'n5', target: 'n6', frequency: 0.16, label: '137 · 3h 10m' },
  { id: 'e7', source: 'n7', target: 'n8', frequency: 0.86, label: '736 · 2h' },
  { id: 'e8', source: 'n6', target: 'n3', frequency: 0.11, label: '94 · 3h 20m', dashed: true, offsetV: -290 },
  { id: 'e9', source: 'n6', target: 'n4', frequency: 0.07, label: '60 · 2h', dashed: true, offsetV: -170 },
  { id: 'e10', source: 'n3', target: 'n6', frequency: 0.05, label: '43 · 45m', dashed: true },
  { id: 'e11', source: 'n4', target: 'n7', frequency: 0.03, label: '26 · 4h 10m', dashed: true, offsetV: 290 },
]

// ─── Graph helpers ──────────────────────────────────────────────────────────

function norm(v) { const l = Math.hypot(v.x, v.y); return l < 1e-9 ? { x: 0, y: 1 } : { x: v.x / l, y: v.y / l } }
function perp2(t) { return { x: -t.y, y: t.x } }
function cubicAt(p0, p1, p2, p3, t) { const m = 1 - t; return { x: m * m * m * p0.x + 3 * m * m * t * p1.x + 3 * m * t * t * p2.x + t * t * t * p3.x, y: m * m * m * p0.y + 3 * m * m * t * p1.y + 3 * m * t * t * p2.y + t * t * t * p3.y } }
function cubicTang(p0, p1, p2, p3, t) { const m = 1 - t; return norm({ x: 3 * (m * m * (p1.x - p0.x) + 2 * m * t * (p2.x - p1.x) + t * t * (p3.x - p2.x)), y: 3 * (m * m * (p1.y - p0.y) + 2 * m * t * (p2.y - p1.y) + t * t * (p3.y - p2.y)) }) }
function quadAt(p0, p1, p2, t) { const m = 1 - t; return { x: m * m * p0.x + 2 * m * t * p1.x + t * t * p2.x, y: m * m * p0.y + 2 * m * t * p1.y + t * t * p2.y } }
function quadTang(p0, p1, p2, t) { return norm({ x: 2 * ((1 - t) * (p1.x - p0.x) + t * (p2.x - p1.x)), y: 2 * ((1 - t) * (p1.y - p0.y) + t * (p2.y - p1.y)) }) }

const GRAD_LIGHT = '#c8e2f5'
const GRAD_MID = '#4d8fc0'
const GRAD_DEEP = '#2870a8'
const DASH_COLOR = '#5a8fb8'

function freqOpacity(f) { return 0.42 + f * 0.53 }
function freqHalfW(f) { return 1.5 + f * 9.0 }

function buildArrowPath(sample, tang, baseHW, N = 32) {
  const START_HW = 0.4
  const HEAD_W_RATIO = 1.80
  const TIP_ASPECT = 1.60
  const headHW = baseHW * HEAD_W_RATIO
  const headLength = headHW * TIP_ASPECT
  const S = N * 2
  const pts = Array.from({ length: S + 1 }, (_, i) => sample(i / S))
  const cum = [0]
  for (let i = 1; i <= S; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const total = cum[S]
  const neckDist = Math.max(0, total - headLength)
  let ni = S
  for (let i = 1; i <= S; i++) { if (cum[i] >= neckDist) { ni = i; break } }
  const NECK = ni / S
  const right = [], left = []
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * NECK
    const p = sample(t), n = perp2(tang(t))
    const hw = START_HW + (baseHW - START_HW) * (i / N)
    right.push({ x: p.x + n.x * hw, y: p.y + n.y * hw })
    left.push({ x: p.x - n.x * hw, y: p.y - n.y * hw })
  }
  const pN = sample(NECK), nN = perp2(tang(NECK))
  const aR = { x: pN.x + nN.x * headHW, y: pN.y + nN.y * headHW }
  const aL = { x: pN.x - nN.x * headHW, y: pN.y - nN.y * headHW }
  const tip = sample(1)
  const f = p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  return [
    `M ${f(right[0])}`,
    ...right.slice(1).map(p => `L ${f(p)}`),
    `L ${f(aR)}`, `L ${f(tip)}`, `L ${f(aL)}`,
    ...left.slice().reverse().map(p => `L ${f(p)}`),
    'Z',
  ].join(' ')
}

function srcPoint(n, layout) {
  if (n.isStart) return layout === 'horizontal' ? { x: n.x + CIRC_R * 2 - 4, y: n.y + CIRC_R } : { x: n.x + CIRC_R, y: n.y + CIRC_R * 2 - 4 }
  return layout === 'horizontal' ? { x: n.x + NODE_W, y: n.y + NODE_H / 2 } : { x: n.x + NODE_W / 2, y: n.y + NODE_H }
}
function tgtPoint(n, layout) {
  if (n.isEnd) return layout === 'horizontal' ? { x: n.x + 4, y: n.y + CIRC_R } : { x: n.x + CIRC_R, y: n.y + 4 }
  return layout === 'horizontal' ? { x: n.x, y: n.y + NODE_H / 2 } : { x: n.x + NODE_W / 2, y: n.y }
}

function computeEdgeCPs(src, tgt, layout, offset = 0) {
  const s = srcPoint(src, layout), e = tgtPoint(tgt, layout)
  if (layout === 'horizontal') {
    const dx = Math.abs(e.x - s.x) * 0.46, p1 = { x: s.x + dx, y: s.y }, p2 = { x: e.x - dx, y: e.y }
    return { kind: 'cubic', p0: s, p1, p2, p3: e, midX: (s.x + e.x) / 2, midY: (s.y + e.y) / 2 }
  }
  if (offset !== 0) {
    const p1 = { x: (s.x + e.x) / 2 + offset, y: (s.y + e.y) / 2 }
    return { kind: 'quad', p0: s, p1, p2: e, midX: (s.x + 2 * p1.x + e.x) / 4, midY: (s.y + 2 * p1.y + e.y) / 4 }
  }
  const dy = Math.abs(e.y - s.y) * 0.48, p1 = { x: s.x, y: s.y + dy }, p2 = { x: e.x, y: e.y - dy }
  return { kind: 'cubic', p0: s, p1, p2, p3: e, midX: (s.x + e.x) / 2, midY: (s.y + e.y) / 2 }
}

function edgeArrowPath(cps, halfW) {
  if (cps.kind === 'cubic') { const { p0, p1, p2, p3 } = cps; return buildArrowPath(t => cubicAt(p0, p1, p2, p3, t), t => cubicTang(p0, p1, p2, p3, t), halfW) }
  const { p0, p1, p2 } = cps; return buildArrowPath(t => quadAt(p0, p1, p2, t), t => quadTang(p0, p1, p2, t), halfW)
}

function nodeById(list, id) { return list.find(n => n.id === id) }
function nodeHitTest(n, cx, cy) {
  if (n.isStart || n.isEnd) return Math.hypot(cx - (n.x + CIRC_R), cy - (n.y + CIRC_R)) <= CIRC_R + 6
  return cx >= n.x && cx <= n.x + NODE_W && cy >= n.y && cy <= n.y + NODE_H
}
function getInitialView(l) {
  return l === 'horizontal' ? { pan: { x: 44, y: 120 }, zoom: 0.58 } : { pan: { x: 140, y: 36 }, zoom: 0.70 }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
        <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))}
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
      {data.map((v, i) => <rect key={i} x={i * (bW + gap)} y={maxH - Math.max(2, v * maxH)} width={bW} height={Math.max(2, v * maxH)} rx={2} fill={`rgba(153,27,27,${0.25 + v * 0.75})`} />)}
    </svg>
  )
}

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
        <button onClick={onClose} className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">×</button>
      </div>
      <div className="flex border-b border-border">
        {['freq', 'perf'].map(t => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 py-2.5 text-xs font-medium transition-colors relative"
            style={{ color: tab === t ? '#e2e8f0' : '#64748b', fontFamily: "'JetBrains Mono',monospace" }}>
            {t === 'freq' ? 'Frequência' : 'Desempenho'}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-800" />}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'freq' ? (<>
          <StatRow label="Frequência absoluta" value={m.absoluteFreq.toLocaleString('pt-BR')} />
          <StatRow label="Frequência por caso" value={m.caseFreq.toLocaleString('pt-BR')} />
          <StatRow label="Máx. repetições" value={`${m.maxRepetitions}×`} />
          <StatRow label="Frequência final" value={m.endFreq.toLocaleString('pt-BR')} />
        </>) : (<>
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
        </>)}
      </div>
    </div>
  )
}

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProcessMiningPreviewPage() {
  const { processId } = useParams()

  const [layout, setLayout] = useState('vertical')
  const [pan, setPan] = useState(getInitialView('vertical').pan)
  const [zoom, setZoom] = useState(getInitialView('vertical').zoom)
  const [selectedId, setSelectedId] = useState('n5')
  const [actSlider, setActSlider] = useState(80)
  const [pathSlider, setPathSlider] = useState(52)
  const [cursorGrab, setCursorGrab] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileFilters, setMobileFilters] = useState(false)

  const isDragging = useRef(false)
  const onNode = useRef(false)
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const touchOrigin = useRef({ tx: 0, ty: 0, px: 0, py: 0 })
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  const nodes = NODE_DEFS.map(n => ({ ...n, x: layout === 'horizontal' ? n.hx : n.vx, y: layout === 'horizontal' ? n.hy : n.vy }))
  const actThr = (1 - actSlider / 100) * 100
  const pathThr = (1 - pathSlider / 100)
  const visNodes = nodes.filter(n => n.frequency >= actThr)
  const visIds = new Set(visNodes.map(n => n.id))
  const visEdges = EDGE_DEFS.filter(e => e.frequency >= pathThr && visIds.has(e.source) && visIds.has(e.target))
  const selectedNode = selectedId ? nodes.find(n => n.id === selectedId) ?? null : null

  useEffect(() => {
    const mq = window.matchMedia('(max-width:1023px)')
    const upd = () => setIsMobile(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [])

  function switchLayout() {
    const next = layout === 'horizontal' ? 'vertical' : 'horizontal'
    const v = getInitialView(next)
    setLayout(next); setPan(v.pan); setZoom(v.zoom)
  }

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return
    const f = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => {
      const nz = Math.min(3, Math.max(0.2, z * f))
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      setPan(p => ({ x: mx - (mx - p.x) * (nz / z), y: my - (my - p.y) * (nz / z) }))
      return nz
    })
  }, [])
  useEffect(() => {
    const el = containerRef.current; if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  function toCanvas(vx, vy) {
    const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return { x: 0, y: 0 }
    return { x: (vx - rect.left - pan.x) / zoom, y: (vy - rect.top - pan.y) / zoom }
  }
  function getNodeAt(vx, vy) { const { x, y } = toCanvas(vx, vy); return visNodes.find(n => nodeHitTest(n, x, y)) }
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
    if (onNode.current) { const node = getNodeAt(e.clientX, e.clientY); if (node) setSelectedId(prev => prev === node.id ? null : node.id) }
    isDragging.current = false; onNode.current = false; setCursorGrab(false)
  }
  function onTouchStart(e) {
    if (e.touches.length !== 1) return
    const t = e.touches[0]; onNode.current = !!getNodeAt(t.clientX, t.clientY)
    if (!onNode.current) touchOrigin.current = { tx: t.clientX, ty: t.clientY, px: pan.x, py: pan.y }
  }
  function onTouchMove(e) {
    if (e.touches.length !== 1 || onNode.current) return
    const t = e.touches[0]; setPan({ x: touchOrigin.current.px + (t.clientX - touchOrigin.current.tx), y: touchOrigin.current.py + (t.clientY - touchOrigin.current.ty) })
  }
  function onTouchEnd(e) {
    if (onNode.current && e.changedTouches.length === 1) { const t = e.changedTouches[0]; const node = getNodeAt(t.clientX, t.clientY); if (node) setSelectedId(prev => prev === node.id ? null : node.id) }
    onNode.current = false
  }
  function fitView() {
    if (!visNodes.length) return
    const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return
    const xs = visNodes.map(n => n.x), ys = visNodes.map(n => n.y), pad = 60
    const nz = Math.min((rect.width - pad * 2) / (Math.max(...xs) + NODE_W - Math.min(...xs)), (rect.height - pad * 2) / (Math.max(...ys) + NODE_H - Math.min(...ys)), 1.6)
    setPan({ x: pad - Math.min(...xs) * nz, y: pad - Math.min(...ys) * nz }); setZoom(nz)
  }

  return (
    <div className="flex flex-col w-full" style={{ height: '100vh', fontFamily: "'Inter',sans-serif", background: '#0d1017' }}>

      <header className="shrink-0 flex items-center gap-4 px-5 border-b border-border" style={{ height: '52px', background: '#111520' }}>
        <Link to={`/processes/${processId ?? ''}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} />
          <span className="text-xs font-medium">Processo</span>
        </Link>

        <div className="w-px h-5 bg-border" />

        <div className="flex flex-col justify-center min-w-0">
          <span className="text-sm font-semibold text-foreground" style={{ letterSpacing: '-0.01em' }}>Grafo do Processo</span>
          <span className="text-[11px] leading-none mt-0.5" style={{ color: '#f59e0b' }}>Prévia — dados simulados, não vinculados a um log real</span>
        </div>

        {!isMobile && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded ml-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>856 casos (simulado)</span>
          </div>
        )}

        <div className="flex-1" />

        {!isMobile && (
          <button onClick={switchLayout}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors border border-border text-muted-foreground hover:text-foreground"
            style={{ fontFamily: "'JetBrains Mono',monospace" }}>
            <AlignCenter size={13} style={{ transform: layout === 'horizontal' ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
            {layout === 'horizontal' ? 'Vertical' : 'Horizontal'}
          </button>
        )}

        <button title="Carregar log de eventos (em breve)" disabled
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border border-border text-muted-foreground opacity-50 cursor-not-allowed">
          <Upload size={12} /><span className="hidden sm:inline">Carregar log</span>
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <div ref={containerRef} className="relative flex-1 min-w-0 overflow-hidden" style={{ background: '#090d14' }}>
          <svg ref={svgRef} className="w-full h-full"
            style={{ cursor: cursorGrab ? 'grabbing' : 'grab', touchAction: 'none' }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
            onMouseLeave={() => { isDragging.current = false; setCursorGrab(false) }}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            <SvgDefs />
            <rect width="100%" height="100%" fill="url(#dots)" />
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {visEdges.map(edge => {
                const src = nodeById(nodes, edge.source), tgt = nodeById(nodes, edge.target)
                if (!src || !tgt) return null
                const offset = layout === 'horizontal' ? (edge.offsetH ?? 0) : (edge.offsetV ?? 0)
                const cps = computeEdgeCPs(src, tgt, layout, offset)
                const { midX, midY } = cps
                const opacity = freqOpacity(edge.frequency)
                const gSrc = cps.kind === 'cubic' ? cps.p0 : cps.p0
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
              {visNodes.map(node => (
                <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                  {node.isStart ? <StartNode node={node} isSelected={selectedId === node.id} layout={layout} /> :
                    node.isEnd ? <EndNode node={node} isSelected={selectedId === node.id} /> :
                      <ActivityNode node={node} isSelected={selectedId === node.id} />}
                </g>
              ))}
            </g>
          </svg>

          <div className="absolute bottom-5 left-5 flex flex-col rounded overflow-hidden border border-border" style={{ background: '#161c28' }}>
            {[
              { icon: <ZoomIn size={13} />, fn: () => setZoom(z => Math.min(3, z * 1.2)), title: 'Aumentar zoom' },
              { icon: <ZoomOut size={13} />, fn: () => setZoom(z => Math.max(0.2, z * 0.8)), title: 'Reduzir zoom' },
              { icon: <Maximize2 size={13} />, fn: fitView, title: 'Ajustar visualização' },
            ].map(({ icon, fn, title }, i) => (
              <button key={i} onClick={fn} title={title}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-b border-border last:border-0">
                {icon}
              </button>
            ))}
          </div>
          <div className="absolute bottom-5 left-14 px-2 py-1 rounded border border-border text-xs text-muted-foreground"
            style={{ background: '#161c28', fontFamily: "'JetBrains Mono',monospace" }}>
            {Math.round(zoom * 100)}%
          </div>

          {isMobile && (
            <div className="absolute top-4 right-4 z-20">
              <button onClick={() => setMobileFilters(v => !v)}
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

        {!isMobile && (
          <div className="shrink-0 flex flex-col border-l border-border" style={{ width: '284px', background: '#111520' }}>
            <div className="p-4 border-b border-border space-y-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Densidade do Grafo</p>
              <Slider label="Atividades" value={actSlider} onChange={setActSlider} />
              <Slider label="Caminhos" value={pathSlider} onChange={setPathSlider} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground"><span className="text-foreground font-medium">{visNodes.length}</span> de {NODE_DEFS.length} atividades</span>
                <span className="text-[11px] text-muted-foreground"><span className="text-foreground font-medium">{visEdges.length}</span> caminhos</span>
              </div>
            </div>
            <div className="px-4 py-3 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Frequência dos caminhos</p>
              <div className="flex items-end gap-1.5 mb-1">
                {[0.42, 0.55, 0.68, 0.80, 0.95].map((op, i) => (
                  <div key={i} className="flex-1 rounded-sm"
                    style={{ height: `${[3, 5, 8, 12, 18][i]}px`, background: `linear-gradient(to right, ${GRAD_LIGHT}, ${GRAD_DEEP})`, opacity: op }} />
                ))}
              </div>
              <div className="flex justify-between"><span className="text-[10px] text-muted-foreground">raro</span><span className="text-[10px] text-muted-foreground">frequente</span></div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <svg width="32" height="10">
                  <defs>
                    <linearGradient id="leg-dash" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={DASH_COLOR} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={DASH_COLOR} stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="5" x2="32" y2="5" stroke="url(#leg-dash)" strokeWidth="1.6" strokeDasharray="5 3" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] text-muted-foreground">loop / caminho raro</span>
              </div>
            </div>
            {selectedNode ? (
              <div className="flex-1 min-h-0 overflow-hidden">
                <NodeDetailPanel node={selectedNode} onClose={() => setSelectedId(null)} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="5" width="6" height="6" rx="1.5" stroke="#475569" strokeWidth="1.2" />
                    <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="#475569" strokeWidth="1.2" />
                    <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="#475569" strokeWidth="1.2" />
                    <line x1="7" y1="8" x2="9" y2="4" stroke="#475569" strokeWidth="1" />
                    <line x1="7" y1="8" x2="9" y2="12" stroke="#475569" strokeWidth="1" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Selecione uma atividade</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 opacity-60">Clique em um nó para inspecionar suas métricas.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {isMobile && (<>
          <div onClick={() => setSelectedId(null)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.55)', opacity: selectedNode ? 1 : 0, pointerEvents: selectedNode ? 'auto' : 'none', transition: 'opacity 0.3s ease' }} />
          <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, background: '#161c28', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px 20px 0 0', maxHeight: '78vh', display: 'flex', flexDirection: 'column', transform: selectedNode ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.38s cubic-bezier(0.32,0.72,0,1)', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}><div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} /></div>
            {selectedNode && <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><NodeDetailPanel node={selectedNode} onClose={() => setSelectedId(null)} /></div>}
          </div>
        </>)}
      </div>
    </div>
  )
}
