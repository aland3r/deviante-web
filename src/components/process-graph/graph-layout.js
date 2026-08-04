/*
  Turns the API's process graph (`GET /api/processes/:id/graph`) into
  something the canvas can draw: ranked nodes, positioned, with edges as
  waypoints.

  Why the positions are computed here and not stored: the Figma export ships
  hand-placed coordinates because it draws one fixed example. A real log has
  as many shapes as it has logs — the layout has to follow the data. The
  geometry constants and curve math still come from `graph-core.js`, so the
  drawing stays consistent with the export; only the placement is ours.

  A real shop-floor log is one dominant flow with a scatter of rare side
  activities, so this is a trunk-and-float layout, not a full Sugiyama grid:

    1. rank   — longest path over an acyclic skeleton (`rankNodes`), used only
                to orient "forward" and to find the trunk.
    2. trunk  — the heaviest source→end path is a straight line of short, thick
                segments: THE process.
    3. float  — every other (secondary) operation hangs to the side of the
                trunk, parked at the height between the trunk nodes it connects,
                packed into lanes so cards never overlap.
    4. route  — trunk→trunk steps go straight along the flow; anything that
                leaves the trunk (a side activity, a skip, a loop) leaves from
                the *side* face of the card and takes the short way across.

  Frequency only ever sets a ribbon's thickness — never a node's position.
*/

import { NODE_W, NODE_H, CIRC_R } from './graph-core'

export const START_ID = '__start__'
export const END_ID = '__end__'

const RANK_GAP = 96 // gap between successive trunk steps
const PITCH = NODE_H + RANK_GAP // one trunk step, along the flow axis
const SIDE_GAP = 40 // trunk edge → first side lane
const LANE_GAP = 28 // between side lanes
const BOW = 34 // how far a same-column skip/loop bows out
const STUB = 26 // curve stub off a card face
const MARGIN = 40

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
 *          coordinates — those come from `layoutGraph` (vertical trunk-and-float).
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
      activityId: node.activityId,
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

// ─── Trunk-and-float placement ──────────────────────────────────────────────

const halfCross = (node) => (node.isStart || node.isEnd ? CIRC_R : NODE_W / 2)
const halfAlong = (node) => (node.isStart || node.isEnd ? CIRC_R : NODE_H / 2)

/** Node ids on the heaviest source→end path, in flow order — the trunk. */
function spinePath(nodes, edges) {
  const rank = new Map(nodes.map((n) => [n.id, n.rank ?? 0]))
  const best = new Map(nodes.map((n) => [n.id, { w: 0, prev: null }]))
  const forward = edges
    .filter((e) => best.has(e.source) && best.has(e.target) && rank.get(e.target) > rank.get(e.source))
    .sort((a, b) => rank.get(a.source) - rank.get(b.source))
  for (const e of forward) {
    const s = best.get(e.source)
    const t = best.get(e.target)
    const w = s.w + (e.frequency ?? 0.001)
    if (w > t.w) { t.w = w; t.prev = e.source }
  }
  let endId = null
  let endW = -Infinity
  for (const n of nodes) { const b = best.get(n.id); if (b.w > endW) { endW = b.w; endId = n.id } }
  const order = []
  for (let id = endId; id; id = best.get(id).prev) order.push(id)
  return order.reverse()
}

/**
 * Full trunk-and-float layout (vertical flow: start → end top-to-bottom).
 *
 * @param {object} model  `buildGraphModel` output (nodes carry `rank`).
 * @returns {{nodes: Array, edges: Array}} real nodes with `x`/`y` (top-left)
 *          and `cx`/`cy` (centre), and edges carrying `points` — the polyline
 *          the canvas splines through.
 */
export function layoutGraph(model) {
  const realNodes = model.nodes ?? []
  if (realNodes.length === 0) return { nodes: [], edges: [] }

  const byId = new Map(realNodes.map((n) => [n.id, n]))
  const modelEdges = (model.edges ?? []).filter((e) => byId.has(e.source) && byId.has(e.target))

  // Axis helpers: "cross" = sibling axis (x), "rank" = flow axis (y).
  const pt = (cross, rank) => ({ x: cross, y: rank })
  const crossOf = (c) => c.cx
  const rankOf = (c) => c.cy

  // 1. Trunk — the heaviest path, one straight line, evenly spaced.
  const spine = spinePath(realNodes, modelEdges)
  const trunkIndex = new Map(spine.map((id, i) => [id, i]))
  const isTrunk = (id) => trunkIndex.has(id)

  // Neighbours (any direction), used to float the secondaries.
  const preds = new Map(realNodes.map((n) => [n.id, []]))
  const succs = new Map(realNodes.map((n) => [n.id, []]))
  for (const e of modelEdges) {
    if (e.source === e.target) continue
    succs.get(e.source).push(e.target)
    preds.get(e.target).push(e.source)
  }

  // 2. Float — a rank-axis level for every node. Trunk keeps its index;
  //    a secondary settles at the height between the trunk nodes it connects
  //    to. A few passes let a secondary that only touches other secondaries
  //    catch up.
  const level = new Map(spine.map((id, i) => [id, i]))
  const secondary = realNodes.map((n) => n.id).filter((id) => !isTrunk(id))
  const middle = spine.length ? (spine.length - 1) / 2 : 0
  for (let pass = 0; pass < 4; pass++) {
    for (const id of secondary) {
      const up = preds.get(id).map((p) => level.get(p)).filter((v) => v != null)
      const down = succs.get(id).map((s) => level.get(s)).filter((v) => v != null)
      if (up.length && down.length) level.set(id, (Math.max(...up) + Math.min(...down)) / 2)
      else if (up.length) level.set(id, Math.max(...up) + 0.5)
      else if (down.length) level.set(id, Math.min(...down) - 0.5)
      else level.set(id, middle)
    }
  }

  // Secondaries that land at the same height would otherwise fan out sideways
  // into deep lanes. Spread each such group vertically across its gap and split
  // it across both sides (busiest first), so the graph stays narrow.
  const groups = new Map()
  for (const id of secondary) {
    const key = Math.round(level.get(id) * 2) / 2
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(id)
  }
  const side = new Map()
  for (const [key, ids] of groups) {
    ids.sort((a, b) => (byId.get(b).frequency ?? 0) - (byId.get(a).frequency ?? 0))
    const m = ids.length
    ids.forEach((id, k) => {
      level.set(id, key + (m > 1 ? (k - (m - 1) / 2) * (0.8 / m) : 0))
      side.set(id, k % 2 === 0 ? 1 : -1)
    })
  }

  // Cross-axis — trunk at 0, secondaries packed into side lanes on their side.
  const cross = new Map(spine.map((id) => [id, 0]))
  const lanes = { right: [], left: [] }
  const halfLevel = (NODE_H / 2 + 6) / PITCH
  for (const id of [...secondary].sort((a, b) => level.get(a) - level.get(b))) {
    const lo = level.get(id) - halfLevel
    const hi = level.get(id) + halfLevel
    const dir = side.get(id) ?? 1
    const laneList = dir > 0 ? lanes.right : lanes.left
    let lane = laneList.findIndex((iv) => iv.every(([a, b]) => hi < a || lo > b))
    if (lane < 0) { lane = laneList.length; laneList.push([]) }
    laneList[lane].push([lo, hi])
    cross.set(id, dir * (NODE_W + SIDE_GAP + lane * (NODE_W + LANE_GAP)))
  }

  // Screen centres, then normalise the cross axis to a left margin.
  const rankPos = (lv) => MARGIN + NODE_H / 2 + lv * PITCH
  const rawCentre = (id) => {
    const cr = cross.get(id) ?? 0
    const rk = rankPos(level.get(id) ?? 0)
    return { cx: cr, cy: rk }
  }
  let minCross = Infinity
  for (const n of realNodes) minCross = Math.min(minCross, crossOf(rawCentre(n.id)) - halfCross(n))
  const shift = Number.isFinite(minCross) ? MARGIN - minCross : 0
  const centre = (id) => {
    const c = rawCentre(id)
    return { cx: c.cx + shift, cy: c.cy }
  }

  const nodes = realNodes.map((node) => {
    const c = centre(node.id)
    const hc = halfCross(node)
    const ha = halfAlong(node)
    return {
      ...node,
      cx: c.cx,
      cy: c.cy,
      x: c.cx - hc,
      y: c.cy - ha,
    }
  })

  // 3. Route — a point on a card's side face (left/right) or
  //    top/bottom face, plus the edge waypoints.
  const crossFace = (id, sign) => {
    const c = centre(id)
    return pt(crossOf(c) + sign * halfCross(byId.get(id)), rankOf(c))
  }
  const rankFace = (id, sign) => {
    const c = centre(id)
    return pt(crossOf(c), rankOf(c) + sign * halfAlong(byId.get(id)))
  }

  const routeEdge = (edge) => {
    const u = edge.source
    const v = edge.target
    if (u === v) return selfLoopPoints(byId.get(u), centre, pt, crossOf, rankOf)

    const cu = centre(u)
    const cv = centre(v)
    const rankU = rankOf(cu)
    const rankV = rankOf(cv)
    const crossU = crossOf(cu)
    const crossV = crossOf(cv)

    const consecutiveTrunk = isTrunk(u) && isTrunk(v)
      && Math.abs(trunkIndex.get(u) - trunkIndex.get(v)) === 1

    // Main-flow step: straight along the flow axis, face to face.
    if (consecutiveTrunk && crossU === crossV) {
      const dir = Math.sign(rankV - rankU) || 1
      return [
        rankFace(u, dir),
        pt(crossU, rankU + dir * (halfAlong(byId.get(u)) + STUB)),
        pt(crossV, rankV - dir * (halfAlong(byId.get(v)) + STUB)),
        rankFace(v, -dir),
      ]
    }

    // One end is off to the side: leave from the facing side faces and take the
    // short way across.
    if (crossU !== crossV) {
      const su = Math.sign(crossV - crossU)
      return [
        crossFace(u, su),
        pt(crossU + su * STUB, rankU),
        pt(crossV - su * STUB, rankV),
        crossFace(v, -su),
      ]
    }

    // Same column but not a consecutive step (a skip or a backward loop): bow
    // out to one side just enough to clear whatever sits between them.
    const dir = Math.sign(rankV - rankU) || 1
    const side = dir > 0 ? 1 : -1
    const bulge = crossU + side * (halfCross(byId.get(u)) + BOW)
    return [
      crossFace(u, side),
      pt(bulge, rankU + dir * STUB),
      pt(bulge, rankV - dir * STUB),
      crossFace(v, side),
    ]
  }

  const edges = modelEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    frequency: edge.frequency,
    caseCount: edge.caseCount,
    label: edge.label,
    dashed: edge.dashed,
    points: routeEdge(edge),
  }))

  return { nodes, edges }
}

/** A small side loop for an activity that directly follows itself. */
function selfLoopPoints(node, centre, pt, crossOf, rankOf) {
  const c = centre(node.id)
  const cr = crossOf(c)
  const rk = rankOf(c)
  const hc = halfCross(node)
  const ha = halfAlong(node)
  return [
    pt(cr + hc, rk - ha * 0.5),
    pt(cr + hc + BOW, rk - ha * 0.5),
    pt(cr + hc + BOW, rk + ha * 0.5),
    pt(cr + hc, rk + ha * 0.5),
  ]
}
