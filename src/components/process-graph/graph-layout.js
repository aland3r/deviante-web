/*
  Turns the API's process graph (`GET /api/processes/:id/graph`) into
  something the canvas can draw: ranked, ordered, positioned nodes and edges
  routed as waypoints.

  Why the positions are computed here and not stored: the Figma export ships
  hand-placed coordinates because it draws one fixed example. A real log has
  as many shapes as it has logs — the layout has to follow the data. The
  geometry constants and curve math still come from `graph-core.js`, so the
  drawing stays consistent with the export; only the placement is ours.

  This is a layered (Sugiyama) layout, the same family the process-mining
  tools people compare us to (Disco, dagre) use, so a real directly-follows
  graph stays legible instead of collapsing into a tangle down the middle:

    1. rank      — longest path over an acyclic skeleton (`rankNodes`);
    2. route     — break every multi-rank edge into one-rank segments through
                   dummy nodes, so a long edge threads a slim gutter between
                   node columns instead of cutting straight through them;
    3. order     — barycenter sweeps that pull each node next to its
                   neighbours, which is what actually removes crossings;
    4. place     — isotonic (PAVA) coordinate assignment that straightens the
                   busiest path into a spine while keeping columns apart.
*/

import { NODE_W, NODE_H, CIRC_R } from './graph-core'

export const START_ID = '__start__'
export const END_ID = '__end__'

// Rank axis: gap between successive layers (down for vertical, right for
// horizontal). Cross axis: separation between siblings sharing a rank.
const RANK_GAP = 96
const REAL_GAP = 46 // between two activity/round columns
const DUMMY_GAP = 24 // gutter a routed edge threads through
const DUMMY_W = 26

const ORDER_SWEEPS = 8
const PLACE_SWEEPS = 12

/** `9432` → `2h 37m`, `44` → `44s` — the export's metric style. */
export function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '—'
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const minutes = Math.floor(s / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  if (hours < 24) return restMinutes ? `${hours}h ${restMinutes}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours ? `${days}d ${restHours}h` : `${days}d`
}

export function formatCount(value) {
  return Number(value ?? 0).toLocaleString('pt-BR')
}

/**
 * Ranks nodes over the graph's acyclic skeleton.
 *
 * A directly-follows graph of a real log is full of cycles — on the shop-floor
 * log, `Retirada do Produto` and `Alimentacao de Máquina` follow each other in
 * both directions. Ranking straight over that has no answer, so the skeleton is
 * built greedily: strongest edges first, an edge joins only if it does not close
 * a cycle. What is left out is exactly what the export draws dashed — the loops
 * and the rare shortcuts — and the main flow keeps its order.
 */
function rankNodes(nodeIds, edges) {
  const successors = new Map(nodeIds.map((id) => [id, []]))
  const skeleton = new Set()

  const reaches = (from, to) => {
    if (from === to) return true
    const seen = new Set([from])
    const stack = [from]
    while (stack.length) {
      for (const next of successors.get(stack.pop()) ?? []) {
        if (next === to) return true
        if (seen.has(next)) continue
        seen.add(next)
        stack.push(next)
      }
    }
    return false
  }

  const candidates = [...edges].sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))
  for (const edge of candidates) {
    if (!successors.has(edge.source) || !successors.has(edge.target)) continue
    if (edge.source === edge.target) continue
    if (reaches(edge.target, edge.source)) continue // would close a cycle
    successors.get(edge.source).push(edge.target)
    skeleton.add(edge.id)
  }

  // Longest path over the skeleton, in topological order (Kahn).
  const indegree = new Map(nodeIds.map((id) => [id, 0]))
  successors.forEach((targets) => targets.forEach((t) => indegree.set(t, indegree.get(t) + 1)))

  const ranks = new Map(nodeIds.map((id) => [id, 0]))
  const queue = nodeIds.filter((id) => indegree.get(id) === 0)
  while (queue.length) {
    const id = queue.shift()
    for (const next of successors.get(id) ?? []) {
      ranks.set(next, Math.max(ranks.get(next), ranks.get(id) + 1))
      indegree.set(next, indegree.get(next) - 1)
      if (indegree.get(next) === 0) queue.push(next)
    }
  }

  ranks.set(START_ID, 0)
  const maxRank = Math.max(...nodeIds.filter((id) => id !== END_ID).map((id) => ranks.get(id) ?? 0), 0)
  if (ranks.has(END_ID)) ranks.set(END_ID, maxRank + 1)
  return { ranks, skeleton }
}

/**
 * @param {object} graph  the `/graph` response
 * @returns {{nodes: Array, edges: Array}} draw-ready model, ranked but without
 *          coordinates — those depend on the layout direction (`layoutGraph`).
 */
export function buildGraphModel(graph) {
  const apiNodes = graph?.nodes ?? []
  const apiEdges = graph?.edges ?? []
  if (apiNodes.length === 0) return { nodes: [], edges: [] }

  const hasStart = apiEdges.some((e) => e.source === START_ID)
  const hasEnd = apiEdges.some((e) => e.target === END_ID)

  const nodes = [
    ...(hasStart ? [{ id: START_ID, label: 'Início', isStart: true, frequency: 100 }] : []),
    ...apiNodes.map((node) => ({
      id: node.id,
      label: node.label,
      rawLabel: node.rawLabel,
      mappingStatus: node.mappingStatus,
      frequency: node.frequency,
      displayMetric: `${formatCount(node.caseFreq)} casos`,
      metrics: {
        absoluteFreq: node.absoluteFreq,
        caseFreq: node.caseFreq,
        maxRepetitions: node.maxRepetitions,
        endFreq: node.endFreq,
        startFreq: node.startFreq,
        totalDuration: formatDuration(node.totalDurationSeconds),
        medianDuration: formatDuration(node.medianDurationSeconds),
        meanDuration: formatDuration(node.meanDurationSeconds),
        maxDuration: formatDuration(node.maxDurationSeconds),
        minDuration: formatDuration(node.minDurationSeconds),
        histogram: node.histogram ?? [],
      },
    })),
    ...(hasEnd ? [{ id: END_ID, label: 'Fim', isEnd: true, frequency: 100 }] : []),
  ]

  const known = new Set(nodes.map((n) => n.id))
  const forward = apiEdges.filter((e) => known.has(e.source) && known.has(e.target))
  const { ranks, skeleton } = rankNodes(nodes.map((n) => n.id), forward)

  const edges = forward.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    frequency: edge.frequency,
    caseCount: edge.caseCount,
    label: formatCount(edge.caseCount),
    dashed: !skeleton.has(edge.id),
  }))

  return { nodes: nodes.map((n) => ({ ...n, rank: ranks.get(n.id) ?? 0 })), edges }
}

// ─── Layered placement ──────────────────────────────────────────────────────

const memberWidth = (node) => (node.isStart || node.isEnd ? CIRC_R * 2 : NODE_W)
const halfCross = (node) => (node.isStart || node.isEnd ? CIRC_R : NODE_W / 2)
const halfAlong = (node) => (node.isStart || node.isEnd ? CIRC_R : NODE_H / 2)

/** Minimum distance between the centres of two rank-mates. */
function separation(a, b) {
  const pad = a.isDummy || b.isDummy ? DUMMY_GAP : REAL_GAP
  return (a.w + b.w) / 2 + pad
}

/**
 * L2 isotonic regression (pool-adjacent-violators): the closest
 * non-decreasing sequence to `values`. Used to snap a rank's nodes onto their
 * neighbours' average position while never letting the order flip.
 */
function isotonic(values) {
  const level = []
  const weight = []
  const count = []
  for (const raw of values) {
    let v = raw
    let w = 1
    let c = 1
    while (level.length && level[level.length - 1] > v) {
      const pv = level.pop()
      const pw = weight.pop()
      const pc = count.pop()
      v = (v * w + pv * pw) / (w + pw)
      w += pw
      c += pc
    }
    level.push(v)
    weight.push(w)
    count.push(c)
  }
  const out = []
  level.forEach((v, i) => { for (let j = 0; j < count[i]; j++) out.push(v) })
  return out
}

/** Places one rank's ordered members onto `targets`, keeping order + spacing. */
function placeRank(rank, targets) {
  const n = rank.length
  if (n === 0) return
  const offset = new Array(n).fill(0)
  for (let i = 1; i < n; i++) offset[i] = offset[i - 1] + separation(rank[i - 1], rank[i])
  const shifted = isotonic(targets.map((t, i) => t - offset[i]))
  for (let i = 0; i < n; i++) rank[i].c = shifted[i] + offset[i]
}

/**
 * Ids on the heaviest source→target path over the forward (rank-increasing)
 * edges, weighted by directly-follows frequency — the graph's main flow. This
 * is the chain the spine straightens onto; everything off it becomes a side
 * arc.
 */
function heaviestPath(realNodes, routed, members) {
  const best = new Map(realNodes.map((n) => [n.id, { w: 0, prev: null }]))
  const forward = routed
    .filter((e) => members.get(e.target).layer > members.get(e.source).layer)
    .sort((a, b) => members.get(a.source).layer - members.get(b.source).layer)
  for (const e of forward) {
    const s = best.get(e.source)
    const t = best.get(e.target)
    if (!s || !t) continue
    const w = s.w + (e.frequency ?? 0.001)
    if (w > t.w) { t.w = w; t.prev = e.source }
  }
  let endId = null
  let endW = -Infinity
  for (const n of realNodes) { const b = best.get(n.id); if (b.w > endW) { endW = b.w; endId = n.id } }
  const path = new Set()
  for (let id = endId; id; id = best.get(id).prev) path.add(id)
  return path
}

/**
 * Full layered layout for one direction.
 *
 * @param {object} model   `buildGraphModel` output (nodes carry `rank`).
 * @param {'vertical'|'horizontal'} layout
 * @returns {{nodes: Array, edges: Array}} real nodes with `x`/`y` (top-left)
 *          and `cx`/`cy` (centre), and edges carrying `points` — the polyline
 *          the canvas splines through, already including entry/exit stubs.
 */
export function layoutGraph(model, layout) {
  const realNodes = model.nodes ?? []
  if (realNodes.length === 0) return { nodes: [], edges: [] }

  // Contiguous layer indices, so an empty rank never leaves a hole.
  const usedRanks = [...new Set(realNodes.map((n) => n.rank))].sort((a, b) => a - b)
  const layerOf = new Map(usedRanks.map((r, i) => [r, i]))
  const layerCount = usedRanks.length
  const layers = Array.from({ length: layerCount }, () => [])

  const members = new Map()
  const adj = new Map() // id → { up: [{id,w}], down: [{id,w}] }
  const addMember = (m) => { members.set(m.id, m); layers[m.layer].push(m); adj.set(m.id, { up: [], down: [] }) }

  for (const node of realNodes) {
    addMember({ id: node.id, isDummy: false, layer: layerOf.get(node.rank), w: memberWidth(node), node })
  }

  // Route: split every multi-rank edge into one-rank hops through dummies.
  const routed = []
  const selfLoops = []
  let dummySeq = 0
  const strongestFirst = [...model.edges].sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))
  for (const edge of strongestFirst) {
    if (edge.source === edge.target) { selfLoops.push(edge); continue }
    const from = members.get(edge.source)
    const to = members.get(edge.target)
    if (!from || !to) continue
    const chain = [edge.source]
    const step = Math.sign(to.layer - from.layer)
    if (step !== 0) {
      for (let l = from.layer + step; l !== to.layer; l += step) {
        const id = `__dummy_${edge.id}_${dummySeq++}`
        addMember({ id, isDummy: true, layer: l, w: DUMMY_W, edgeId: edge.id })
        chain.push(id)
      }
    }
    chain.push(edge.target)
    routed.push({ ...edge, chain })
  }

  const link = (aId, bId, weight) => {
    const a = members.get(aId)
    const b = members.get(bId)
    const [lo, hi] = a.layer <= b.layer ? [a, b] : [b, a]
    adj.get(lo.id).down.push({ id: hi.id, w: weight })
    adj.get(hi.id).up.push({ id: lo.id, w: weight })
  }
  for (const edge of routed) {
    const w = edge.frequency ?? 0.001
    for (let i = 0; i < edge.chain.length - 1; i++) link(edge.chain[i], edge.chain[i + 1], w)
  }

  // Order: seed by frequency, then barycenter sweeps to cut crossings.
  const seed = (m) => (m.isDummy ? 0.5 : (m.node.frequency ?? 0))
  for (const layer of layers) layer.sort((a, b) => seed(b) - seed(a))

  const indexMap = () => {
    const idx = new Map()
    for (const layer of layers) layer.forEach((m, i) => idx.set(m.id, i))
    return idx
  }
  // Ordering is unweighted: edge frequency must never pull an operation
  // sideways, only thicken its ribbon. Every neighbour counts the same.
  const barycenter = (m, idx, side) => {
    const neighbours = adj.get(m.id)[side]
    if (neighbours.length === 0) return null
    let sum = 0
    for (const { id } of neighbours) sum += idx.get(id)
    return sum / neighbours.length
  }
  for (let sweep = 0; sweep < ORDER_SWEEPS; sweep++) {
    const downward = sweep % 2 === 0
    const order = downward ? [...layers.keys()] : [...layers.keys()].reverse()
    const idx = indexMap()
    const side = downward ? 'up' : 'down'
    for (const l of order) {
      const scored = layers[l].map((m, i) => ({ m, key: barycenter(m, idx, side) ?? i }))
      scored.sort((a, b) => a.key - b.key)
      layers[l] = scored.map((s) => s.m)
      layers[l].forEach((m, i) => idx.set(m.id, i))
    }
  }

  // Place cross axis: pack each rank, then straighten toward neighbours.
  for (const layer of layers) {
    let c = 0
    layer.forEach((m, i) => {
      if (i > 0) c += separation(layer[i - 1], m)
      m.c = c
    })
  }
  for (let sweep = 0; sweep < PLACE_SWEEPS; sweep++) {
    const downward = sweep % 2 === 0
    const order = downward ? [...layers.keys()] : [...layers.keys()].reverse()
    for (const l of order) {
      const targets = layers[l].map((m) => {
        const { up, down } = adj.get(m.id)
        const side = downward ? up : down
        const use = side.length ? side : [...up, ...down]
        if (use.length === 0) return m.c
        let sum = 0
        for (const { id } of use) sum += members.get(id).c
        return sum / use.length
      })
      placeRank(layers[l], targets)
    }
  }

  // Straighten the dominant path into a single spine. The heaviest
  // source→target chain (by directly-follows frequency) is what the eye reads
  // as "the process"; pinning its nodes to one cross-coordinate makes the main
  // flow a straight vertical line of short, thick segments. Rank-mates yield
  // only as far as separation forces them, keeping the rest of the placement
  // intact. Frequency picks the spine but never sets any node's position.
  const spine = heaviestPath(realNodes, routed, members)
  if (spine.size) {
    const crosses = [...spine].map((id) => members.get(id).c).sort((a, b) => a - b)
    const column = crosses[Math.floor(crosses.length / 2)]
    for (const layer of layers) {
      const idx = layer.findIndex((m) => spine.has(m.id))
      if (idx < 0) continue
      layer[idx].c = column
      for (let i = idx - 1; i >= 0; i--) layer[i].c = Math.min(layer[i].c, layer[i + 1].c - separation(layer[i], layer[i + 1]))
      for (let i = idx + 1; i < layer.length; i++) layer[i].c = Math.max(layer[i].c, layer[i - 1].c + separation(layer[i - 1], layer[i]))
    }
  }

  // Normalise the cross axis so the drawing starts at a small margin.
  let minC = Infinity
  for (const m of members.values()) minC = Math.min(minC, m.c - m.w / 2)
  const shift = Number.isFinite(minC) ? 40 - minC : 0
  for (const m of members.values()) m.c += shift

  // Rank axis: centre of each layer.
  const pitch = layout === 'horizontal' ? NODE_W + RANK_GAP + 24 : NODE_H + RANK_GAP
  const rankCentre = (layer) => 40 + (layout === 'horizontal' ? NODE_W / 2 : NODE_H / 2) + layer * pitch
  const centreOf = (m) => (layout === 'horizontal'
    ? { cx: rankCentre(m.layer), cy: m.c }
    : { cx: m.c, cy: rankCentre(m.layer) })

  const nodes = realNodes.map((node) => {
    const m = members.get(node.id)
    const { cx, cy } = centreOf(m)
    const hw = halfCross(node)
    return { ...node, cx, cy, x: cx - (layout === 'horizontal' ? halfAlong(node) : hw), y: cy - (layout === 'horizontal' ? hw : halfAlong(node)) }
  })

  const stub = RANK_GAP * 0.42
  const edges = [
    ...routed.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      frequency: edge.frequency,
      caseCount: edge.caseCount,
      label: edge.label,
      dashed: edge.dashed,
      points: edgePoints(edge.chain, members, centreOf, layout, stub),
    })),
    ...selfLoops.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      frequency: edge.frequency,
      caseCount: edge.caseCount,
      label: edge.label,
      dashed: true,
      points: selfLoopPoints(members.get(edge.source), centreOf, layout),
    })),
  ]

  return { nodes, edges }
}

/** Waypoints for one routed edge: exit stub, dummy centres, entry stub. */
function edgePoints(chain, members, centreOf, layout, stub) {
  const from = members.get(chain[0])
  const to = members.get(chain[chain.length - 1])
  const dir = Math.sign(to.layer - from.layer) || 1
  const src = anchor(from, centreOf, layout, dir, true)
  const tgt = anchor(to, centreOf, layout, -dir, false)

  const pts = [src]
  pts.push(alongStub(src, layout, dir, stub))
  for (let i = 1; i < chain.length - 1; i++) {
    const { cx, cy } = centreOf(members.get(chain[i]))
    pts.push({ x: cx, y: cy })
  }
  pts.push(alongStub(tgt, layout, -dir, stub))
  pts.push(tgt)
  return pts
}

/** Where an edge meets a node, on the rank-axis face pointing at its partner. */
function anchor(member, centreOf, layout, dir, outgoing) {
  const { cx, cy } = centreOf(member)
  const node = member.node
  const half = node ? halfAlong(node) : member.w / 2
  if (layout === 'horizontal') return { x: cx + dir * (outgoing ? half : half), y: cy }
  return { x: cx, y: cy + dir * (outgoing ? half : half) }
}

function alongStub(point, layout, dir, stub) {
  return layout === 'horizontal'
    ? { x: point.x + dir * stub, y: point.y }
    : { x: point.x, y: point.y + dir * stub }
}

/** A small side loop for an activity that directly follows itself. */
function selfLoopPoints(member, centreOf, layout) {
  const { cx, cy } = centreOf(member)
  if (layout === 'horizontal') {
    const hy = NODE_H / 2
    return [
      { x: cx - NODE_W * 0.25, y: cy + hy },
      { x: cx - NODE_W * 0.25, y: cy + hy + 40 },
      { x: cx + NODE_W * 0.25, y: cy + hy + 40 },
      { x: cx + NODE_W * 0.25, y: cy + hy },
    ]
  }
  const hx = NODE_W / 2
  return [
    { x: cx + hx, y: cy - NODE_H * 0.28 },
    { x: cx + hx + 40, y: cy - NODE_H * 0.28 },
    { x: cx + hx + 40, y: cy + NODE_H * 0.28 },
    { x: cx + hx, y: cy + NODE_H * 0.28 },
  ]
}
