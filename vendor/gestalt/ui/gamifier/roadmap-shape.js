import { createRoadmapHelpers } from '../dev-quest/roadmap-core.js'

const PRODUCT_ORDER = ['io', 'deviante', 'milebrick', 'harpia']

function orderOf(code) {
  const index = PRODUCT_ORDER.indexOf(code)
  return index === -1 ? PRODUCT_ORDER.length : index
}

function groupPhases(questRows) {
  const phasesById = new Map()

  for (const row of questRows) {
    if (!phasesById.has(row.phase_id)) {
      phasesById.set(row.phase_id, {
        id: row.phase_id,
        codename: row.phase_codename,
        label: row.phase_label,
        sortOrder: row.phase_sort_order,
        quests: [],
      })
    }
    phasesById.get(row.phase_id).quests.push({
      id: row.quest_id,
      uc: row.uc_number,
      label: row.label,
      status: row.status,
    })
  }

  return [...phasesById.values()].sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * Shapes flat `portfolio.quests` rows (+ `portfolio.products` meta) into the
 * `products` prop GamifierHud expects: one entry per product, each with its
 * own phases + aggregate progress.
 */
export function buildGamifierProducts(questRows = [], productRows = []) {
  const metaByCode = new Map(productRows.map((row) => [row.code, row]))
  const rowsByProduct = new Map()

  for (const row of questRows) {
    if (!rowsByProduct.has(row.product_code)) rowsByProduct.set(row.product_code, [])
    rowsByProduct.get(row.product_code).push(row)
  }

  return [...rowsByProduct.keys()]
    .sort((a, b) => orderOf(a) - orderOf(b))
    .map((code) => {
      const phases = groupPhases(rowsByProduct.get(code))
      const { done, total, percent } = createRoadmapHelpers(phases).getRoadmapProgress()
      return {
        code,
        name: metaByCode.get(code)?.name ?? code,
        phases,
        done,
        total,
        percent,
      }
    })
}
