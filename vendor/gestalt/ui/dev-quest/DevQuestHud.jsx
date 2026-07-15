import { useState } from 'react'
import { isDevQuestEnabled, QUEST_STATUS } from './roadmap-core.js'
import { useDevQuest } from './DevQuestContext.jsx'

const STATUS_ICON = {
  [QUEST_STATUS.DONE]: '★',
  [QUEST_STATUS.ACTIVE]: '▶',
  [QUEST_STATUS.LOCKED]: '·',
}

export default function DevQuestHud() {
  const [open, setOpen] = useState(false)
  const {
    productName,
    roadmapDoc,
    roadmapFile,
    phases,
    getRoadmapProgress,
  } = useDevQuest()

  if (!isDevQuestEnabled()) return null

  const { done, total, percent } = getRoadmapProgress()

  return (
    <div className={`dev-quest-hud${open ? ' dev-quest-hud--open' : ''}`}>
      <button
        type="button"
        className="dev-quest-hud__toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? 'Fechar quest log' : 'Abrir quest log de desenvolvimento'}
      >
        <span className="dev-quest-hud__toggle-label">QUEST LOG</span>
        <span className="dev-quest-hud__toggle-xp">{percent}%</span>
      </button>

      {open ? (
        <div className="dev-quest-hud__panel">
          <header className="dev-quest-hud__header">
            <div>
              <p className="dev-quest-hud__eyebrow">{productName.toUpperCase()} · ARCADE DEV MODE</p>
              <h3>Progressão do produto</h3>
            </div>
            <p className="dev-quest-hud__score">{done}/{total} quests</p>
          </header>

          <div className="dev-quest-hud__xp" aria-hidden="true">
            <span className="dev-quest-hud__xp-fill" style={{ width: `${percent}%` }} />
          </div>

          <div className="dev-quest-hud__phases">
            {phases.map((phase) => (
              <section key={phase.id} className="dev-quest-hud__phase">
                <h4>
                  <span>{phase.id}</span> {phase.codename}
                  <small>{phase.title}</small>
                </h4>
                <ul>
                  {phase.quests.map((quest) => (
                    <li
                      key={quest.id}
                      className={`dev-quest-hud__quest dev-quest-hud__quest--${quest.status}`}
                    >
                      <span className="dev-quest-hud__icon" aria-hidden="true">
                        {STATUS_ICON[quest.status]}
                      </span>
                      <span className="dev-quest-hud__quest-id">{quest.id}</span>
                      {quest.uc ? (
                        <span className="dev-quest-hud__uc">{quest.uc}</span>
                      ) : null}
                      <span className="dev-quest-hud__label">{quest.label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <p className="dev-quest-hud__hint">
            Quest log: edite <code>{roadmapFile}</code>
            {roadmapDoc ? <> · doc: <code>{roadmapDoc}</code></> : null}
          </p>
        </div>
      ) : null}
    </div>
  )
}
