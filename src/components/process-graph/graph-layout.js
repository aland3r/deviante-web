/*
  Turns the API's process graph (`GET /api/processes/:id/graph`) into
  something the canvas can draw: ranked, positioned nodes and edges tagged
  as forward or back edges.

  Why the positions are computed here and not stored: the Figma export ships
  hand-placed coordinates because it draws one fixed example. A real log has
  as many shapes as it has logs — the layout has to follow the data. The
  geometry constants and curve math still come from `graph-core.js`, so the
  drawing stays pixel-identical to the export; only the placement is ours.
*/

import { NODE_W, NODE_H, CIRC_R } from './graph-core'

export const START_ID = '__start__'
export const END_ID = '__end__'

// Gaps between ranks and between siblings within a rank.
const RANK_GAP = 86
const SIBLING_GAP = 60

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
 * @returns {{nodes: Array, edges: Array, ranks: Map}} draw-ready model,
 *          without coordinates — those depend on the layout direction.
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

  const edges = forward.map((edge) => {
    const back = !skeleton.has(edge.id)
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      frequency: edge.frequency,
      caseCount: edge.caseCount,
      label: formatCount(edge.caseCount),
      dashed: back,
    }
  })

  return { nodes: nodes.map((n) => ({ ...n, rank: ranks.get(n.id) ?? 0 })), edges }
}

/**
 * Places ranked nodes for one direction. Siblings in a rank are ordered by
 * frequency so the busiest path reads down the middle of the canvas.
 */
export function positionNodes(nodes, layout) {
  const byRank = new Map()
  nodes.forEach((node) => {
    const list = byRank.get(node.rank) ?? []
    list.push(node)
    byRank.set(node.rank, list)
  })

  const widest = Math.max(1, ...[...byRank.values()].map((list) => list.length))
  const laneSpan = NODE_W + SIBLING_GAP
  const centerLane = ((widest - 1) * laneSpan) / 2

  const placed = []
  for (const [rank, list] of byRank) {
    const ordered = [...list].sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))
    const offset = ((ordered.length - 1) * laneSpan) / 2

    ordered.forEach((node, index) => {
      const lane = centerLane + index * laneSpan - offset
      // Circles are 2·CIRC_R wide, activity cards NODE_W — nudge the circles
      // so both sit on the same centre line.
      const inset = node.isStart || node.isEnd ? NODE_W / 2 - CIRC_R : 0
      const alongInset = node.isStart || node.isEnd ? NODE_H / 2 - CIRC_R : 0

      placed.push({
        ...node,
        x: layout === 'horizontal' ? rank * (NODE_W + RANK_GAP + 24) + alongInset : lane + inset,
        y: layout === 'horizontal' ? lane + inset : rank * (NODE_H + RANK_GAP) + alongInset,
      })
    })
  }
  return placed
}

/**
 * Fans out overlapping back edges so two loops between the same ranks don't
 * draw on top of each other — the export does this by hand with `offsetV`.
 */
export function withEdgeOffsets(edges, nodes, layout) {
  if (layout === 'horizontal') return edges
  const positions = new Map(nodes.map((n) => [n.id, n]))
  let index = 0

  return edges.map((edge) => {
    if (!edge.dashed) return edge
    const src = positions.get(edge.source)
    const tgt = positions.get(edge.target)
    if (!src || !tgt) return edge

    const span = Math.abs((tgt.y ?? 0) - (src.y ?? 0)) || NODE_H
    const side = index % 2 === 0 ? -1 : 1
    index += 1
    return { ...edge, offsetV: side * (span * 0.55 + NODE_W * 0.75) }
  })
}
