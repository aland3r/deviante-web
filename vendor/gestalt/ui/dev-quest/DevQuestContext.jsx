import { createContext, useContext, useMemo } from 'react'
import { createRoadmapHelpers } from './roadmap-core.js'

const DevQuestContext = createContext(null)

export function DevQuestProvider({
  productName,
  roadmapDoc,
  roadmapFile = 'src/lib/roadmap.js',
  phases,
  loadingLines,
  children,
}) {
  const value = useMemo(() => ({
    productName,
    roadmapDoc,
    roadmapFile,
    phases,
    loadingLines,
    ...createRoadmapHelpers(phases),
  }), [productName, roadmapDoc, roadmapFile, phases, loadingLines])

  return (
    <DevQuestContext.Provider value={value}>
      {children}
    </DevQuestContext.Provider>
  )
}

export function useDevQuest() {
  const context = useContext(DevQuestContext)
  if (!context) {
    throw new Error('useDevQuest must be used within DevQuestProvider')
  }
  return context
}
