import { useEffect, useState } from 'react'
import { useDevQuest } from './DevQuestContext.jsx'

export default function ArcadeLoadingScreen({ label = 'LOADING' }) {
  const [lineIndex, setLineIndex] = useState(0)
  const [dots, setDots] = useState('')
  const {
    productName,
    loadingLines,
    getActiveQuest,
    getActivePhase,
  } = useDevQuest()

  const activeQuest = getActiveQuest()
  const activePhase = getActivePhase()
  const lines = loadingLines.length > 0 ? loadingLines : ['PLEASE WAIT...']

  useEffect(() => {
    const lineTimer = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % lines.length)
    }, 900)

    const dotTimer = window.setInterval(() => {
      setDots((current) => (current.length >= 3 ? '' : `${current}.`))
    }, 320)

    return () => {
      window.clearInterval(lineTimer)
      window.clearInterval(dotTimer)
    }
  }, [lines.length])

  return (
    <div className="dev-quest-loading-screen arcade-loading">
      <div className="arcade-loading__panel">
        <p className="arcade-loading__tag">{productName.toUpperCase()} · DEV BUILD</p>
        <h2 className="arcade-loading__title">{label}{dots}</h2>
        <p className="arcade-loading__line">{lines[lineIndex]}</p>

        {activeQuest ? (
          <div className="arcade-loading__quest">
            <span className="arcade-loading__quest-id">{activeQuest.id}</span>
            <span>{activeQuest.label}</span>
          </div>
        ) : null}

        <div className="arcade-loading__bar" aria-hidden="true">
          <span className="arcade-loading__bar-fill" />
        </div>

        <p className="arcade-loading__stage">
          STAGE {activePhase?.id ?? 'P0'} · {activePhase?.codename ?? 'INSERT COIN'}
        </p>
      </div>
    </div>
  )
}
