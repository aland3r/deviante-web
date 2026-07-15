export const QUEST_STATUS = {
  DONE: 'done',
  ACTIVE: 'active',
  LOCKED: 'locked',
}

export function isDevQuestEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_QUEST_HUD !== 'false'
}

export function createRoadmapHelpers(phases) {
  function allQuests() {
    return phases.flatMap((phase) => phase.quests)
  }

  function getRoadmapProgress() {
    const quests = allQuests()
    const done = quests.filter((quest) => quest.status === 'done').length
    const total = quests.length
    return {
      done,
      total,
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
    }
  }

  function getActiveQuest() {
    return allQuests().find((quest) => quest.status === 'active') ?? null
  }

  function getActivePhase() {
    const activeQuest = getActiveQuest()
    if (!activeQuest) return phases[phases.length - 1]
    return phases.find((phase) => phase.quests.some((quest) => quest.id === activeQuest.id))
      ?? phases[0]
  }

  return {
    allQuests,
    getRoadmapProgress,
    getActiveQuest,
    getActivePhase,
  }
}
