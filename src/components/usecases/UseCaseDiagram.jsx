import { useState } from 'react'
import { C } from '../arc42/chrome'

// UML use case diagram, drawn as SVG in code. The relations are the thesis'
// (owner 14/10); the layout is redrawn for legibility: the actor's use cases
// in one column, the use cases they include or extend to the right, so every
// dashed arrow runs short and nothing crosses. Labels come from
// portfolio.use_cases; hovering a use case highlights its links.

const RX = 112
const RY = 46
const ACTOR = { x: 92, y: 400 }
const ACTOR_ANCHOR = [150, 400]

const LAYOUT = {
  'DV-UC1': [440, 90],
  'DV-UC2': [440, 245],
  'DV-UC6': [440, 400],
  'DV-UC7': [440, 555],
  'DV-UC8': [440, 710],
  'DV-UC3': [830, 245],
  'DV-UC5': [830, 400],
  'DV-UC9': [830, 710],
  'DV-UC4': [1180, 245],
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

const KIND = {
  include: { color: '#5fb3a3', label: '«include»' },
  extend: { color: '#d1a15c', label: '«extend»' },
}
const ASSOC = 'rgba(200,223,240,0.45)'
const FILL = '#152230'
const FILL_ON = '#1d3044'

// Point on the ellipse border centred at `c`, in the direction of `toward`.
function border(c, toward, gap = 0) {
  const dx = toward[0] - c[0]
  const dy = toward[1] - c[1]
  const t = 1 / Math.sqrt((dx * dx) / (RX * RX) + (dy * dy) / (RY * RY))
  return [c[0] + dx * t * (1 + gap), c[1] + dy * t * (1 + gap)]
}

// Title in at most two lines of ~20 characters.
function titleLines(title) {
  const lines = []
  for (const w of title.split(' ')) {
    const last = lines[lines.length - 1]
    if (last && `${last} ${w}`.length <= 20) lines[lines.length - 1] = `${last} ${w}`
    else lines.push(w)
  }
  return lines
}

export default function UseCaseDiagram({ useCases, activeId, onSelect }) {
  const [hoverId, setHoverId] = useState(null)
  const placed = useCases.filter((u) => LAYOUT[u.id])
  const actor = placed[0]?.actor || 'Gestor de Manutenção'
  const focus = hoverId ?? activeId
  const lit = (...ids) => focus == null || ids.includes(focus)
  const neighbours = new Set(
    focus == null ? [] : [
      focus,
      ...RELATIONS.filter(([f, t]) => f === focus || t === focus).flat(),
      ...(ASSOCIATIONS.includes(focus) ? ['actor'] : []),
    ],
  )
  const dim = (id) => focus != null && !neighbours.has(id)

  return (
    <svg viewBox="0 0 1320 860" role="img" aria-label="Diagrama de casos de uso do Deviante" style={{ display: 'block', width: '100%', height: 'auto', fontFamily: C.sans }}>
      <defs>
        {Object.entries(KIND).map(([k, v]) => (
          <marker key={k} id={`uc-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M1 1 L9 5 L1 9" fill="none" stroke={v.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        ))}
      </defs>

      {/* system boundary */}
      <rect x="250" y="20" width="1054" height="760" rx="14" fill="rgba(77,143,192,0.035)" stroke="rgba(77,143,192,0.35)" strokeWidth="1.5" />
      <text x="1284" y="48" textAnchor="end" fill={C.blue} fontSize="13" fontWeight="700" letterSpacing="1.5" fontFamily={C.mono}>DEVIANTE</text>

      {/* actor */}
      <g opacity={dim('actor') ? 0.35 : 1} style={{ transition: 'opacity 0.15s' }}>
        <circle cx={ACTOR.x} cy={ACTOR.y - 46} r="22" fill="#5b6b7d" />
        <path d={`M${ACTOR.x - 36} ${ACTOR.y + 30} v-14 a22 22 0 0 1 22 -22 h28 a22 22 0 0 1 22 22 v14 z`} fill="#5b6b7d" />
        {actor.split(' de ').map((part, i, all) => (
          <text key={i} x={ACTOR.x} y={ACTOR.y + 58 + i * 20} textAnchor="middle" fill={C.strong} fontSize="15" fontWeight="600">
            {i < all.length - 1 ? `${part} de` : part}
          </text>
        ))}
      </g>

      {/* associations */}
      {ASSOCIATIONS.filter((id) => LAYOUT[id]).map((id) => {
        const [x, y] = border(LAYOUT[id], ACTOR_ANCHOR)
        return <line key={id} x1={ACTOR_ANCHOR[0]} y1={ACTOR_ANCHOR[1]} x2={x} y2={y} stroke={ASSOC} strokeWidth={focus === id ? 2.4 : 1.6} opacity={lit(id) ? 1 : 0.25} style={{ transition: 'opacity 0.15s' }} />
      })}

      {/* include / extend */}
      {RELATIONS.map(([from, to, kind]) => {
        const a = border(LAYOUT[from], LAYOUT[to], 0.03)
        const b = border(LAYOUT[to], LAYOUT[from], 0.06)
        const mx = (a[0] + b[0]) / 2
        const my = (a[1] + b[1]) / 2
        const { color, label } = KIND[kind]
        const w = label.length * 7.4 + 18
        const on = lit(from, to)
        return (
          <g key={`${from}-${to}`} opacity={on ? 1 : 0.2} style={{ transition: 'opacity 0.15s' }}>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={focus != null && on ? 2.2 : 1.6} strokeDasharray="7 5" markerEnd={`url(#uc-arrow-${kind})`} />
            {Math.abs(b[0] - a[0]) < 4 ? (
              <text x={mx + 12} y={my + 4.5} fill={color} fontSize="12" fontWeight="600">{label}</text>
            ) : (
              <>
                <rect x={mx - w / 2} y={my - 11} width={w} height="22" rx="11" fill={C.page} stroke={color} strokeOpacity="0.5" />
                <text x={mx} y={my + 4.5} textAnchor="middle" fill={color} fontSize="12" fontWeight="600">{label}</text>
              </>
            )}
          </g>
        )
      })}

      {/* use cases */}
      {placed.map((u) => {
        const [x, y] = LAYOUT[u.id]
        const lines = titleLines(u.title)
        const active = u.id === activeId
        const hover = u.id === hoverId
        const top = y - ((lines.length - 1) * 19) / 2 + 2
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
            opacity={dim(u.id) ? 0.35 : 1}
            style={{ cursor: 'pointer', outline: 'none', transition: 'opacity 0.15s' }}
          >
            <ellipse cx={x} cy={y} rx={RX} ry={RY} fill={active || hover ? FILL_ON : FILL} stroke={active ? C.red : hover ? C.blue : 'rgba(77,143,192,0.45)'} strokeWidth={active ? 2.2 : 1.5} />
            <text x={x} y={top - 14} textAnchor="middle" fill={C.red} fontSize="11" fontWeight="700" fontFamily={C.mono} style={{ pointerEvents: 'none' }}>
              {u.id.replace(/^DV-/, '')}
            </text>
            {lines.map((t, i) => (
              <text key={i} x={x} y={top + 6 + i * 19} textAnchor="middle" fill={C.strong} fontSize="15" fontWeight="500" style={{ pointerEvents: 'none' }}>
                {t}
              </text>
            ))}
          </g>
        )
      })}

      {/* legend */}
      <g transform="translate(250 822)" fontSize="13" fill={C.body}>
        <line x1="0" y1="0" x2="34" y2="0" stroke={ASSOC} strokeWidth="1.6" />
        <text x="44" y="4.5">associação</text>
        {Object.entries(KIND).map(([k, v], i) => (
          <g key={k} transform={`translate(${150 + i * 150} 0)`}>
            <line x1="0" y1="0" x2="34" y2="0" stroke={v.color} strokeWidth="1.6" strokeDasharray="7 5" markerEnd={`url(#uc-arrow-${k})`} />
            <text x="44" y="4.5" fill={v.color}>{v.label}</text>
          </g>
        ))}
        <text x="1054" y="4.5" textAnchor="end" fill={C.faint} fontSize="12">passe o mouse para ver as ligações · clique para abrir</text>
      </g>
    </svg>
  )
}
