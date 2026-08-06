/*
  Schematic machine illustrations for the monitoring detail hero, the machine
  cards, and the dashboard monitoring thumbnails.

  Readability rebuild (05/08): the old version drew near-black bodies on a
  near-black panel with thin dark-blue strokes, so the machine was almost
  invisible in the dark theme. It now uses dedicated `--illo-*` tokens tuned for
  high LUMINANCE contrast — a lighter body fill over a darker panel, brighter
  blue strokes, slightly thicker lines. Contrast carries the drawing, not hue,
  so it reads for a green-color-blind viewer too (persona Odair — no green is
  used here at all). The blue tracks the logo in the light theme.
*/

const STROKE = 'var(--illo-stroke)'
const STROKE_SOFT = 'var(--illo-stroke-soft)'
const BODY = 'var(--illo-fill)'
const PANEL = 'var(--illo-bg)'

function DotGrid() {
  return (
    <>
      {[30, 70, 110, 150, 190, 230, 270].map((x) => [30, 70, 110, 150].map((y) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1} fill="var(--illo-dot)" />
      )))}
    </>
  )
}

function Lathe() {
  return (
    <>
      <rect x="34" y="118" width="232" height="20" rx="4" fill={BODY} stroke={STROKE} strokeWidth="1.8" />
      <rect x="46" y="60" width="70" height="58" rx="6" fill={BODY} stroke={STROKE} strokeWidth="2" />
      <circle cx="81" cy="89" r="17" fill={PANEL} stroke={STROKE_SOFT} strokeWidth="2" />
      <circle cx="81" cy="89" r="6" fill={STROKE} />
      <line x1="98" y1="89" x2="210" y2="89" stroke={STROKE_SOFT} strokeWidth="2.4" />
      <rect x="150" y="80" width="30" height="18" rx="3" fill={BODY} stroke={STROKE_SOFT} strokeWidth="1.7" />
      <rect x="210" y="66" width="46" height="52" rx="6" fill={BODY} stroke={STROKE} strokeWidth="2" />
      <line x1="233" y1="66" x2="233" y2="54" stroke={STROKE_SOFT} strokeWidth="1.8" />
      <circle cx="233" cy="50" r="4" fill={STROKE_SOFT} />
    </>
  )
}

function Mill() {
  return (
    <>
      <rect x="60" y="120" width="180" height="18" rx="4" fill={BODY} stroke={STROKE} strokeWidth="1.8" />
      <rect x="120" y="30" width="60" height="26" rx="5" fill={BODY} stroke={STROKE} strokeWidth="2" />
      <line x1="150" y1="56" x2="150" y2="92" stroke={STROKE_SOFT} strokeWidth="3.2" />
      <polygon points="144,92 156,92 150,106 144,92" fill={STROKE} />
      <rect x="96" y="106" width="108" height="16" rx="3" fill={PANEL} stroke={STROKE_SOFT} strokeWidth="1.7" />
      <rect x="74" y="40" width="20" height="80" rx="4" fill={BODY} stroke={STROKE} strokeWidth="1.8" />
      <rect x="206" y="40" width="20" height="80" rx="4" fill={BODY} stroke={STROKE} strokeWidth="1.8" />
    </>
  )
}

function Compressor() {
  return (
    <>
      <rect x="44" y="70" width="150" height="68" rx="10" fill={BODY} stroke={STROKE} strokeWidth="2" />
      <circle cx="90" cy="104" r="20" fill={PANEL} stroke={STROKE_SOFT} strokeWidth="2" />
      <circle cx="90" cy="104" r="7" fill={STROKE} />
      {[0, 45, 90, 135].map((deg) => (
        <line key={deg} x1="90" y1="104"
          x2={90 + 18 * Math.cos((deg * Math.PI) / 180)}
          y2={104 + 18 * Math.sin((deg * Math.PI) / 180)}
          stroke={STROKE_SOFT} strokeWidth="1.6" />
      ))}
      <rect x="130" y="86" width="52" height="36" rx="4" fill={BODY} stroke={STROKE_SOFT} strokeWidth="1.7" />
      <rect x="206" y="52" width="46" height="86" rx="10" fill={BODY} stroke={STROKE} strokeWidth="2" />
      <line x1="194" y1="90" x2="206" y2="90" stroke={STROKE_SOFT} strokeWidth="2.4" />
      <circle cx="229" cy="44" r="5" fill={PANEL} stroke={STROKE_SOFT} strokeWidth="1.7" />
    </>
  )
}

function Conveyor() {
  return (
    <>
      <rect x="34" y="86" width="232" height="30" rx="15" fill={BODY} stroke={STROKE} strokeWidth="2" />
      <circle cx="62" cy="101" r="19" fill={PANEL} stroke={STROKE_SOFT} strokeWidth="1.9" />
      <circle cx="238" cy="101" r="19" fill={PANEL} stroke={STROKE_SOFT} strokeWidth="1.9" />
      <circle cx="62" cy="101" r="5" fill={STROKE} />
      <circle cx="238" cy="101" r="5" fill={STROKE} />
      {[100, 140, 180, 220].map((x) => (
        <rect key={x} x={x} y="70" width="18" height="14" rx="2" fill={BODY} stroke={STROKE_SOFT} strokeWidth="1.6" />
      ))}
    </>
  )
}

function Generic() {
  return (
    <>
      <rect x="70" y="52" width="160" height="86" rx="10" fill={BODY} stroke={STROKE} strokeWidth="2" />
      <circle cx="120" cy="95" r="18" fill={PANEL} stroke={STROKE_SOFT} strokeWidth="1.9" />
      <circle cx="120" cy="95" r="6" fill={STROKE} />
      <rect x="158" y="72" width="52" height="16" rx="3" fill={BODY} stroke={STROKE_SOFT} strokeWidth="1.6" />
      <rect x="158" y="98" width="52" height="16" rx="3" fill={BODY} stroke={STROKE_SOFT} strokeWidth="1.6" />
    </>
  )
}

const VARIANTS = {
  torno: Lathe,
  fresadora: Mill,
  compressor: Compressor,
  esteira: Conveyor,
  generico: Generic,
}

export default function MachineIllustration({ kind = 'generico', className, style }) {
  const Variant = VARIANTS[kind] ?? Generic
  return (
    <svg viewBox="0 0 300 170" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
      className={className} style={style} role="img" aria-label={`Ilustração de ${kind}`}>
      <rect width="300" height="170" rx="8" fill={PANEL} />
      <DotGrid />
      <Variant />
    </svg>
  )
}
