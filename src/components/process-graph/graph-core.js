/*
  Graph geometry for the process-mining canvas.

  Derived (TS → JS) from the Figma Make export "Process Mining Canvas
  Design" (ZZKdwxgmeCNJFG64zGbADe). The export itself is transient — staged
  under `figma-make/` and deleted once implemented; this comment records the
  visual source. The edge geometry is adapted here for data legibility:
  frequency controls emphasis, while node distance does not distort the
  arrowhead.

  This module is pure geometry and has no data. The nodes, edges and
  variants the canvas draws come from the API (`ProcessGraphTab` →
  `/api/processes/:id/graph` and `/traces`); the export's simulated PCB
  assembly line was removed once those routes landed. Placement of the
  ranked nodes lives in `graph-layout.js`.
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

// ─── Case status vocabulary (traces panel) ──────────────────────────────────

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
function clampFrequency(f) {
  return Math.min(1, Math.max(0, Number(f) || 0))
}

/** 0.42 (very rare) → 0.95 (very frequent). Doubles up with thickness. */
export function freqOpacity(f) { return 0.42 + clampFrequency(f) * 0.53 }

/**
 * Half-width of the flow ribbon: 1.5px (f=0) → 8px (f=1).
 * Square-root scaling keeps medium-volume paths legible without letting the
 * busiest path dominate the graph.
 */
export function freqHalfW(f) { return 1.5 + Math.sqrt(clampFrequency(f)) * 6.5 }

function buildArrowPath(sample, tang, baseHW, N = 32) {
  // The body is a cone: a pointed source grows continuously until the
  // arrowhead. Frequency changes thickness, while node distance alone defines
  // the total connection length. The head scales with that same thickness.
  const HEAD_LENGTH = 8 + baseHW * 1.6
  const headHW = baseHW * 1.55

  // Walk the arc to find the point where the fixed-length arrowhead begins.
  const S = N * 2
  const pts = Array.from({ length: S + 1 }, (_, i) => sample(i / S))
  const cum = [0]
  for (let i = 1; i <= S; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const total = cum[S]
  const headLength = Math.min(HEAD_LENGTH, total * 0.38)
  const neckDist = Math.max(0, total - headLength)
  let NECK = 1
  for (let i = 1; i <= S; i++) {
    if (cum[i] < neckDist) continue
    const segmentLength = cum[i] - cum[i - 1]
    const segmentRatio = segmentLength > 0 ? (neckDist - cum[i - 1]) / segmentLength : 0
    NECK = (i - 1 + segmentRatio) / S
    break
  }

  // Soft tail: start with a blunt stump instead of a needle tip, then
  // grow to full body width at the neck.
  const TAIL_MIN = 0.38
  const right = [], left = []
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * NECK
    const p = sample(t), n = perp2(tang(t))
    const coneProgress = NECK > 0 ? t / NECK : 1
    const halfWidth = baseHW * (TAIL_MIN + (1 - TAIL_MIN) * coneProgress)
    right.push({ x: p.x + n.x * halfWidth, y: p.y + n.y * halfWidth })
    left.push({ x: p.x - n.x * halfWidth, y: p.y - n.y * halfWidth })
  }

  // Arrowhead: milder flare (less dagger-like) from neck to tip.
  const pN = sample(NECK), nN = perp2(tang(NECK))
  const softHeadHW = headHW * 0.82
  const aR = { x: pN.x + nN.x * softHeadHW, y: pN.y + nN.y * softHeadHW }
  const aL = { x: pN.x - nN.x * softHeadHW, y: pN.y - nN.y * softHeadHW }
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

/**
 * A routed edge arrives as a polyline (`graph-layout` waypoints). Turn it into
 * a smooth Catmull-Rom spline expressed as cubic Bézier segments, so the same
 * cone/arrowhead drawing and the dashed path both follow the routed gutters
 * instead of cutting a straight line through the node columns.
 */
export function makeSampler(points) {
  const pts = []
  for (const p of points) {
    const last = pts[pts.length - 1]
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.5) pts.push(p)
  }
  if (pts.length < 2) {
    const only = pts[0] ?? { x: 0, y: 0 }
    return { segs: [], sample: () => only, tang: () => ({ x: 0, y: 1 }) }
  }
  const segs = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? pts[i + 1]
    segs.push({
      p0: p1,
      p1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      p2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p3: p2,
    })
  }
  const k = segs.length
  const at = (t) => {
    const scaled = Math.min(0.999999, Math.max(0, t)) * k
    const i = Math.min(k - 1, Math.floor(scaled))
    return { seg: segs[i], local: scaled - i }
  }
  return {
    segs,
    sample: (t) => { const { seg, local } = at(t); return cubicAt(seg.p0, seg.p1, seg.p2, seg.p3, local) },
    tang: (t) => { const { seg, local } = at(t); return cubicTang(seg.p0, seg.p1, seg.p2, seg.p3, local) },
  }
}

/** SVG path string for a sampler's Bézier segments (dashed loop/edge lines). */
export function segsToPath(segs) {
  if (segs.length === 0) return ''
  const f = (p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  let d = `M ${f(segs[0].p0)}`
  for (const s of segs) d += ` C ${f(s.p1)}, ${f(s.p2)}, ${f(s.p3)}`
  return d
}

/** Cone-with-arrowhead ribbon along a sampler, for solid frequency edges. */
export function ribbonFromSampler(sampler, halfW) {
  return buildArrowPath(sampler.sample, sampler.tang, halfW)
}

export function nodeById(list, id) { return list.find((n) => n.id === id) }

export function nodeHitTest(n, cx, cy) {
  if (n.isStart || n.isEnd) return Math.hypot(cx - (n.x + CIRC_R), cy - (n.y + CIRC_R)) <= CIRC_R + 6
  return cx >= n.x && cx <= n.x + NODE_W && cy >= n.y && cy <= n.y + NODE_H
}

export function getInitialView() {
  return { pan: { x: 140, y: 36 }, zoom: 0.70 }
}
