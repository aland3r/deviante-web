import { useState } from 'react'
import { C } from '../arc42/chrome'

// UML use case diagram, drawn as SVG in code so it keeps the thesis layout
// (owner 14/10): Mermaid's usecase-beta only routes edges at right angles.
// Positions and relations live here; labels come from portfolio.use_cases.

const RX = 109
const RY = 65
const ACTOR_ANCHOR = [270, 550]

const LAYOUT = {
  'DV-UC1': [547, 103],
  'DV-UC2': [590, 305],
  'DV-UC3': [1048, 103],
  'DV-UC4': [1190, 327],
  'DV-UC5': [1266, 526],
  'DV-UC6': [928, 425],
  'DV-UC7': [708, 618],
  'DV-UC8': [830, 797],
  'DV-UC9': [1233, 750],
}

const ASSOCIATIONS = ['DV-UC1', 'DV-UC2', 'DV-UC6', 'DV-UC7', 'DV-UC8']

// [from, to, kind]: the dashed arrow points from `from` to `to`, as in the thesis.
const RELATIONS = [
  ['DV-UC2', 'DV-UC3', 'extend'],
  ['DV-UC2', 'DV-UC6', 'extend'],
  ['DV-UC3', 'DV-UC4', 'include'],
  ['DV-UC6', 'DV-UC3', 'include'],
  ['DV-UC6', 'DV-UC5', 'include'],
  ['DV-UC6', 'DV-UC7', 'extend'],
  ['DV-UC9', 'DV-UC6', 'extend'],
  ['DV-UC8', 'DV-UC9', 'extend'],
]

const TEAL = '#9fcfc2'
const FILL = '#d6f1ea'
const FILL_ON = '#ffffff'
const TEXT = '#1f2937'
const LABEL = '#a8b8c8'

// Point on the ellipse border centred at `c`, in the direction of `toward`.
function border(c, toward, gap = 0) {
  const dx = toward[0] - c[0]
  const dy = toward[1] - c[1]
  const t = 1 / Math.sqrt((dx * dx) / (RX * RX) + (dy * dy) / (RY * RY))
  return [c[0] + dx * t * (1 + gap), c[1] + dy * t * (1 + gap)]
}

// "Configurar parâmetros de análise" → ["5: configurar", "parâmetros de", "análise"]
function labelLines(num, title) {
  const words = `${num}: ${title.charAt(0).toLowerCase()}${title.slice(1)}`.split(' ')
  const lines = []
  for (const w of words) {
    const last = lines[lines.length - 1]
    if (last && `${last} ${w}`.length <= 17) lines[lines.length - 1] = `${last} ${w}`
    else lines.push(w)
  }
  return lines
}

export default function UseCaseDiagram({ useCases, activeId, onSelect }) {
  const [hoverId, setHoverId] = useState(null)
  const placed = useCases.filter((u) => LAYOUT[u.id])
  const actor = placed[0]?.actor || 'Gestor de Manutenção'
  const focus = hoverId ?? activeId
  const touches = (...ids) => focus != null && ids.includes(focus)

  return (
    <svg viewBox="80 0 1360 900" role="img" aria-label="Diagrama de casos de uso do Deviante" style={{ display: 'block', width: '100%', height: 'auto', fontFamily: C.sans }}>
      <defs>
        <marker id="uc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto">
          <path d="M1 1 L9 5 L1 9" fill="none" stroke={TEAL} strokeWidth="1.6" />
        </marker>
      </defs>

      <rect x="362" y="17" width="1046" height="865" rx="4" fill="none" stroke={C.blue} strokeOpacity="0.55" strokeWidth="2" />

      <circle cx="168" cy="512" r="37" fill="#5b6b7d" stroke="#2b3542" strokeWidth="2" />
      <path d="M93 626 v-26 a30 30 0 0 1 30 -30 h90 a30 30 0 0 1 30 30 v26 z" fill="#5b6b7d" stroke="#2b3542" strokeWidth="2" />
      {actor.split(' de ').map((part, i, all) => (
        <text key={i} x="168" y={668 + i * 32} textAnchor="middle" fill={LABEL} fontSize="19" fontWeight="600">
          {i < all.length - 1 ? `${part} de` : part}
        </text>
      ))}

      {ASSOCIATIONS.filter((id) => LAYOUT[id]).map((id) => {
        const [x, y] = border(LAYOUT[id], ACTOR_ANCHOR)
        return <line key={id} x1={ACTOR_ANCHOR[0]} y1={ACTOR_ANCHOR[1]} x2={x} y2={y} stroke={TEAL} strokeWidth={touches(id) ? 3 : 2} />
      })}

      {RELATIONS.map(([from, to, kind]) => {
        const a = border(LAYOUT[from], LAYOUT[to], 0.02)
        const b = border(LAYOUT[to], LAYOUT[from], 0.04)
        const mx = (a[0] + b[0]) / 2
        const my = (a[1] + b[1]) / 2
        const w = kind.length * 8.6 + 26
        const on = touches(from, to)
        return (
          <g key={`${from}-${to}`}>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={TEAL} strokeWidth={on ? 3 : 2} strokeDasharray="10 7" markerEnd="url(#uc-arrow)" />
            <rect x={mx - w / 2} y={my - 11} width={w} height="22" fill={C.page} />
            <text x={mx} y={my + 5} textAnchor="middle" fill={on ? C.strong : LABEL} fontSize="14" fontWeight="600">
              {`<<${kind}>>`}
            </text>
          </g>
        )
      })}

      {placed.map((u) => {
        const [x, y] = LAYOUT[u.id]
        const lines = labelLines(u.id.replace(/^DV-UC/, ''), u.title)
        const on = u.id === activeId || u.id === hoverId
        return (
          <g
            key={u.id}
            role="button"
            tabIndex={0}
            aria-label={`Abrir ${u.id} ${u.title}`}
            onClick={() => onSelect(u.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(u.id) } }}
            onMouseEnter={() => setHoverId(u.id)}
            onMouseLeave={() => setHoverId(null)}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            <ellipse cx={x} cy={y} rx={RX} ry={RY} fill={on ? FILL_ON : FILL} stroke={u.id === activeId ? C.red : TEAL} strokeWidth={u.id === activeId ? 3 : 2} style={{ transition: 'fill 0.15s' }} />
            {lines.map((t, i) => (
              <text key={i} x={x} y={y + 6 + (i - (lines.length - 1) / 2) * 29} textAnchor="middle" fill={TEXT} fontSize="19" style={{ pointerEvents: 'none' }}>
                {t}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}
