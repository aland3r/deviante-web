/*
  Graph geometry + seed data for the process-mining canvas.

  Ported verbatim (TS → JS) from the Figma Make export "Process Mining
  Canvas Design" (ZZKdwxgmeCNJFG64zGbADe), Version 20. The export itself is
  transient — staged under `figma-make/` and deleted once implemented (see
  figma-make/README.md); this comment is the record of which version this
  came from. Figma is the style authority: re-port from a newer export
  rather than editing the geometry by hand.

  NODE_DEFS / EDGE_DEFS / TRACE_VARIANTS are SIMULATED — a PCB assembly
  line, not a real uploaded event log. There is no Kotlin route that
  derives a graph from an event log yet (UC4/UC5, sprint plan 23–24/07).
  Swap these three constants for an API call when that route lands; the
  rest of this module is pure geometry and does not change.
*/

// ─── Graph constants ────────────────────────────────────────────────────────

export const NODE_W = 176
export const NODE_H = 64
export const CIRC_R = 26

// Gradient palette — light icy blue at source, deeper blue at the arrowhead.
export const GRAD_LIGHT = '#c8e2f5'
export const GRAD_MID = '#4d8fc0'
export const GRAD_DEEP = '#2870a8'
export const DASH_COLOR = '#5a8fb8'

// ─── Seed data (simulated — manufacturing PCB assembly line) ────────────────

export const NODE_DEFS = [
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

export const EDGE_DEFS = [
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

/** Total simulated cases in the seed log — shown in the header badge. */
export const TOTAL_CASES = 856

// ─── Trace variants (fed to the cases/layers panel) ─────────────────────────

export const TRACE_VARIANTS = [
  {
    id: 'v1', label: 'Variante A — caminho padrão',
    nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n7', 'n8'],
    caseCount: 616, deviation: false,
    cases: [
      { id: 'CASE-0001', duration: '7h 14m', startedAt: '2025-07-18 08:02', status: 'completed' },
      { id: 'CASE-0004', duration: '6h 58m', startedAt: '2025-07-18 09:30', status: 'completed' },
      { id: 'CASE-0007', duration: '8h 02m', startedAt: '2025-07-18 11:15', status: 'completed' },
      { id: 'CASE-0011', duration: '7h 31m', startedAt: '2025-07-19 07:48', status: 'completed' },
      { id: 'CASE-0014', duration: '6h 44m', startedAt: '2025-07-19 10:00', status: 'running' },
      { id: 'CASE-0018', duration: '7h 56m', startedAt: '2025-07-19 13:22', status: 'completed' },
    ],
  },
  {
    id: 'v2', label: 'Variante B — loop de retrabalho',
    nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n3', 'n4', 'n5', 'n7', 'n8'],
    caseCount: 94, deviation: true,
    cases: [
      { id: 'CASE-0003', duration: '15h 48m', startedAt: '2025-07-18 08:45', status: 'deviated' },
      { id: 'CASE-0009', duration: '16h 12m', startedAt: '2025-07-18 14:00', status: 'completed' },
      { id: 'CASE-0021', duration: '14h 33m', startedAt: '2025-07-19 09:10', status: 'deviated' },
      { id: 'CASE-0027', duration: '17h 05m', startedAt: '2025-07-20 08:00', status: 'completed' },
    ],
  },
  {
    id: 'v3', label: 'Variante C — saída direta p/ inspeção',
    nodeIds: ['n1', 'n2', 'n3', 'n4', 'n7', 'n8'],
    caseCount: 26, deviation: true,
    cases: [
      { id: 'CASE-0006', duration: '9h 30m', startedAt: '2025-07-18 10:15', status: 'deviated' },
      { id: 'CASE-0019', duration: '10h 02m', startedAt: '2025-07-19 11:40', status: 'completed' },
      { id: 'CASE-0033', duration: '8h 54m', startedAt: '2025-07-20 09:05', status: 'deviated' },
    ],
  },
  {
    id: 'v4', label: 'Variante D — retrabalho antecipado',
    nodeIds: ['n1', 'n2', 'n3', 'n6', 'n4', 'n5', 'n7', 'n8'],
    caseCount: 43, deviation: true,
    cases: [
      { id: 'CASE-0012', duration: '13h 22m', startedAt: '2025-07-18 07:30', status: 'deviated' },
      { id: 'CASE-0025', duration: '12h 48m', startedAt: '2025-07-19 08:55', status: 'completed' },
      { id: 'CASE-0038', duration: '14h 11m', startedAt: '2025-07-20 10:30', status: 'running' },
    ],
  },
]

export const STATUS_DOT = {
  completed: '#22c55e',
  deviated: '#f97316',
  running: '#3b82f6',
}

export const STATUS_LABEL = {
  completed: 'Concluído',
  deviated: 'Desvio',
  running: 'Em execução',
}

// ─── Bezier helpers ─────────────────────────────────────────────────────────

function norm(v) { const l = Math.hypot(v.x, v.y); return l < 1e-9 ? { x: 0, y: 1 } : { x: v.x / l, y: v.y / l } }
function perp2(t) { return { x: -t.y, y: t.x } }

function cubicAt(p0, p1, p2, p3, t) {
  const m = 1 - t
  return { x: m * m * m * p0.x + 3 * m * m * t * p1.x + 3 * m * t * t * p2.x + t * t * t * p3.x, y: m * m * m * p0.y + 3 * m * m * t * p1.y + 3 * m * t * t * p2.y + t * t * t * p3.y }
}
function cubicTang(p0, p1, p2, p3, t) {
  const m = 1 - t
  return norm({ x: 3 * (m * m * (p1.x - p0.x) + 2 * m * t * (p2.x - p1.x) + t * t * (p3.x - p2.x)), y: 3 * (m * m * (p1.y - p0.y) + 2 * m * t * (p2.y - p1.y) + t * t * (p3.y - p2.y)) })
}
function quadAt(p0, p1, p2, t) {
  const m = 1 - t
  return { x: m * m * p0.x + 2 * m * t * p1.x + t * t * p2.x, y: m * m * p0.y + 2 * m * t * p1.y + t * t * p2.y }
}
function quadTang(p0, p1, p2, t) {
  return norm({ x: 2 * ((1 - t) * (p1.x - p0.x) + t * (p2.x - p1.x)), y: 2 * ((1 - t) * (p1.y - p0.y) + t * (p2.y - p1.y)) })
}

/** 0.42 (very rare) → 0.95 (very frequent). Doubles up with thickness. */
export function freqOpacity(f) { return 0.42 + f * 0.53 }

/** Half-width of the edge body at the neck: 1.5px (f=0) → 10.5px (f=1). */
export function freqHalfW(f) { return 1.5 + f * 9.0 }

function buildArrowPath(sample, tang, baseHW, N = 32) {
  // Arrowhead dimensions scale with baseHW so the tip angle stays ~30°.
  const START_HW = 0.4
  const HEAD_W_RATIO = 1.80
  const TIP_ASPECT = 1.60

  const headHW = baseHW * HEAD_W_RATIO
  const headLength = headHW * TIP_ASPECT

  // Walk the arc to find the t where the arrowhead begins.
  const S = N * 2
  const pts = Array.from({ length: S + 1 }, (_, i) => sample(i / S))
  const cum = [0]
  for (let i = 1; i <= S; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const total = cum[S]
  const neckDist = Math.max(0, total - headLength)
  let ni = S
  for (let i = 1; i <= S; i++) { if (cum[i] >= neckDist) { ni = i; break } }
  const NECK = ni / S

  // Body polygon: nearly a point at source → full baseHW at neck.
  const right = [], left = []
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * NECK
    const p = sample(t), n = perp2(tang(t))
    const hw = START_HW + (baseHW - START_HW) * (i / N)
    right.push({ x: p.x + n.x * hw, y: p.y + n.y * hw })
    left.push({ x: p.x - n.x * hw, y: p.y - n.y * hw })
  }

  // Arrowhead: flare from neck to tip.
  const pN = sample(NECK), nN = perp2(tang(NECK))
  const aR = { x: pN.x + nN.x * headHW, y: pN.y + nN.y * headHW }
  const aL = { x: pN.x - nN.x * headHW, y: pN.y - nN.y * headHW }
  const tip = sample(1)

  const f = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  return [
    `M ${f(right[0])}`,
    ...right.slice(1).map((p) => `L ${f(p)}`),
    `L ${f(aR)}`, `L ${f(tip)}`, `L ${f(aL)}`,
    ...left.slice().reverse().map((p) => `L ${f(p)}`),
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

export function computeEdgeCPs(src, tgt, layout, offset = 0) {
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

export function edgeArrowPath(cps, halfW) {
  if (cps.kind === 'cubic') {
    const { p0, p1, p2, p3 } = cps
    return buildArrowPath((t) => cubicAt(p0, p1, p2, p3, t), (t) => cubicTang(p0, p1, p2, p3, t), halfW)
  }
  const { p0, p1, p2 } = cps
  return buildArrowPath((t) => quadAt(p0, p1, p2, t), (t) => quadTang(p0, p1, p2, t), halfW)
}

export function nodeById(list, id) { return list.find((n) => n.id === id) }

export function nodeHitTest(n, cx, cy) {
  if (n.isStart || n.isEnd) return Math.hypot(cx - (n.x + CIRC_R), cy - (n.y + CIRC_R)) <= CIRC_R + 6
  return cx >= n.x && cx <= n.x + NODE_W && cy >= n.y && cy <= n.y + NODE_H
}

export function getInitialView(layout) {
  return layout === 'horizontal' ? { pan: { x: 44, y: 120 }, zoom: 0.58 } : { pan: { x: 140, y: 36 }, zoom: 0.70 }
}
