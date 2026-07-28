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
function quadAt(p0, p1, p2, t) {
  const m = 1 - t
  return { x: m * m * p0.x + 2 * m * t * p1.x + t * t * p2.x, y: m * m * p0.y + 2 * m * t * p1.y + t * t * p2.y }
}
function quadTang(p0, p1, p2, t) {
  return norm({ x: 2 * ((1 - t) * (p1.x - p0.x) + t * (p2.x - p1.x)), y: 2 * ((1 - t) * (p1.y - p0.y) + t * (p2.y - p1.y)) })
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

  // Pointed tail to maximum neck width across the full body.
  const right = [], left = []
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * NECK
    const p = sample(t), n = perp2(tang(t))
    const coneProgress = NECK > 0 ? t / NECK : 1
    const halfWidth = baseHW * coneProgress
    right.push({ x: p.x + n.x * halfWidth, y: p.y + n.y * halfWidth })
    left.push({ x: p.x - n.x * halfWidth, y: p.y - n.y * halfWidth })
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

export function computeEdgeCPs(src, tgt, layout, offset = 0, exitSide) {
  if (layout === 'vertical' && exitSide && exitSide !== 'bottom') {
    const s = exitSide === 'right'
      ? { x: src.x + NODE_W, y: src.y + NODE_H / 2 }
      : { x: src.x, y: src.y + NODE_H / 2 }
    const e = tgtPoint(tgt, layout)
    const dx = Math.abs(e.x - s.x) * 0.55
    const dy = Math.abs(e.y - s.y) * 0.5
    const p1 = { x: s.x + (exitSide === 'right' ? dx : -dx), y: s.y }
    const p2 = { x: e.x, y: e.y - dy }
    return { kind: 'cubic', p0: s, p1, p2, p3: e, midX: (s.x + e.x) / 2, midY: (s.y + e.y) / 2 }
  }
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
