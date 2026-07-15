import { isDevQuestEnabled } from './roadmap-core.js'
import { useDevQuest } from './DevQuestContext.jsx'

export default function DevQuestStamp() {
  const { getRoadmapProgress, getActiveQuest, getActivePhase } = useDevQuest()

  if (!isDevQuestEnabled()) return null

  const { done, total, percent } = getRoadmapProgress()
  const activeQuest = getActiveQuest()
  const activePhase = getActivePhase()

  return (
    <footer className="dev-quest-stamp" aria-label="Dev quest progress">
      <span className="dev-quest-stamp__coin" aria-hidden="true">◎</span>
      <span className="dev-quest-stamp__stage">{activePhase?.codename ?? 'DEV'}</span>
      <span className="dev-quest-stamp__sep">·</span>
      <span className="dev-quest-stamp__quest">
        {activeQuest ? `${activeQuest.id} ${activeQuest.label}` : 'ALL CLEAR'}
      </span>
      <span className="dev-quest-stamp__xp">{done}/{total} · {percent}%</span>
    </footer>
  )
}
