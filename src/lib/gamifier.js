import { useEffect, useState } from 'react'
import { fetchAllQuests, fetchGestaltVersion, fetchProductsMeta } from '@gestalt/auth'
import { createRoadmapHelpers } from '@gestalt/dev-quest'
import { buildGamifierProducts } from '@gestalt/gamifier'
import { ROADMAP_PHASES } from './roadmap'

function staticDevianteProduct() {
  const { done, total, percent } = createRoadmapHelpers(ROADMAP_PHASES).getRoadmapProgress()
  return [{ code: 'deviante', name: 'Deviante', phases: ROADMAP_PHASES, done, total, percent }]
}

/**
 * Live quest progress for the public Gamifier HUD — reads `portfolio.quests`
 * from Supabase (same table the portfolio's /cases page and BuildProgress
 * use), falling back to the static `roadmap.js` snapshot if Supabase isn't
 * configured or the fetch fails.
 */
export function useGamifierProducts() {
  const [products, setProducts] = useState(staticDevianteProduct)
  const [gestaltVersion, setGestaltVersion] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [questRows, productRows, versionRow] = await Promise.all([
          fetchAllQuests(),
          fetchProductsMeta(),
          fetchGestaltVersion(),
        ])
        if (cancelled) return

        if (questRows) {
          const devianteRows = questRows.filter((row) => row.product_code === 'deviante')
          if (devianteRows.length > 0) {
            setProducts(buildGamifierProducts(devianteRows, productRows ?? []))
          }
        }
        if (versionRow) setGestaltVersion(versionRow)
      } catch {
        // keep the static fallback already in state
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { products, gestaltVersion }
}
