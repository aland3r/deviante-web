/*
  Schematic machine illustrations for the monitoring detail hero.

  Same visual language as DashboardPage's ProcessThumbnail: thin strokes on a
  near-black panel, blue accents (var(--graph-node-strong) / var(--graph-node)), a faint dot grid. One
  component switches by `kind` so a Torno reads differently from a Compressor
  without pulling in real photography (which would fight the flat dark theme).
*/

const ACCENT = 'var(--graph-node-strong)'
const ACCENT_SOFT = 'var(--graph-node)'

function DotGrid() {
  return (
    <>
      {[30, 70, 110, 150, 190, 230, 270].map((x) => [30, 70, 110, 150].map((y) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1} fill="var(--overlay)" />
      )))}
    </>
  )
}

function Lathe() {
  return (
    <>
      <rect x="34" y="118" width="232" height="20" rx="4" fill="var(--surface-raised)" stroke={ACCENT} strokeWidth="1.4" />
      <rect x="46" y="60" width="70" height="58" rx="6" fill="var(--surface-panel)" stroke={ACCENT} strokeWidth="1.6" />
      <circle cx="81" cy="89" r="17" fill="var(--surface-base)" stroke={ACCENT_SOFT} strokeWidth="1.6" />
      <circle cx="81" cy="89" r="6" fill={ACCENT} />
      <line x1="98" y1="89" x2="210" y2="89" stroke={ACCENT_SOFT} strokeWidth="2" />
      <rect x="150" y="80" width="30" height="18" rx="3" fill="var(--surface-raised)" stroke={ACCENT_SOFT} strokeWidth="1.3" />
      <rect x="210" y="66" width="46" height="52" rx="6" fill="var(--surface-panel)" stroke={ACCENT} strokeWidth="1.6" />
      <line x1="233" y1="66" x2="233" y2="54" stroke={ACCENT_SOFT} strokeWidth="1.4" />
      <circle cx="233" cy="50" r="4" fill={ACCENT_SOFT} />
    </>
  )
}

function Mill() {
  return (
    <>
      <rect x="60" y="120" width="180" height="18" rx="4" fill="var(--surface-raised)" stroke={ACCENT} strokeWidth="1.4" />
      <rect x="120" y="30" width="60" height="26" rx="5" fill="var(--surface-panel)" stroke={ACCENT} strokeWidth="1.6" />
      <line x1="150" y1="56" x2="150" y2="92" stroke={ACCENT_SOFT} strokeWidth="3" />
      <polygon points="144,92 156,92 150,106 144,92" fill={ACCENT} />
      <rect x="96" y="106" width="108" height="16" rx="3" fill="var(--surface-base)" stroke={ACCENT_SOFT} strokeWidth="1.3" />
      <rect x="74" y="40" width="20" height="80" rx="4" fill="var(--surface-panel)" stroke={ACCENT} strokeWidth="1.4" />
      <rect x="206" y="40" width="20" height="80" rx="4" fill="var(--surface-panel)" stroke={ACCENT} strokeWidth="1.4" />
    </>
  )
}

function Compressor() {
  return (
    <>
      <rect x="44" y="70" width="150" height="68" rx="10" fill="var(--surface-panel)" stroke={ACCENT} strokeWidth="1.6" />
      <circle cx="90" cy="104" r="20" fill="var(--surface-base)" stroke={ACCENT_SOFT} strokeWidth="1.6" />
      <circle cx="90" cy="104" r="7" fill={ACCENT} />
      {[0, 45, 90, 135].map((deg) => (
        <line key={deg} x1="90" y1="104"
          x2={90 + 18 * Math.cos((deg * Math.PI) / 180)}
          y2={104 + 18 * Math.sin((deg * Math.PI) / 180)}
          stroke={ACCENT_SOFT} strokeWidth="1.2" />
      ))}
      <rect x="130" y="86" width="52" height="36" rx="4" fill="var(--surface-raised)" stroke={ACCENT_SOFT} strokeWidth="1.3" />
      <rect x="206" y="52" width="46" height="86" rx="10" fill="var(--surface-panel)" stroke={ACCENT} strokeWidth="1.6" />
      <line x1="194" y1="90" x2="206" y2="90" stroke={ACCENT_SOFT} strokeWidth="2" />
      <circle cx="229" cy="44" r="5" fill="var(--surface-base)" stroke={ACCENT_SOFT} strokeWidth="1.3" />
    </>
  )
}

function Conveyor() {
  return (
    <>
      <rect x="34" y="86" width="232" height="30" rx="15" fill="var(--surface-panel)" stroke={ACCENT} strokeWidth="1.6" />
      <circle cx="62" cy="101" r="19" fill="var(--surface-base)" stroke={ACCENT_SOFT} strokeWidth="1.5" />
      <circle cx="238" cy="101" r="19" fill="var(--surface-base)" stroke={ACCENT_SOFT} strokeWidth="1.5" />
      <circle cx="62" cy="101" r="5" fill={ACCENT} />
      <circle cx="238" cy="101" r="5" fill={ACCENT} />
      {[100, 140, 180, 220].map((x) => (
        <rect key={x} x={x} y="70" width="18" height="14" rx="2" fill="var(--surface-raised)" stroke={ACCENT_SOFT} strokeWidth="1.2" />
      ))}
    </>
  )
}

function Generic() {
  return (
    <>
      <rect x="70" y="52" width="160" height="86" rx="10" fill="var(--surface-panel)" stroke={ACCENT} strokeWidth="1.6" />
      <circle cx="120" cy="95" r="18" fill="var(--surface-base)" stroke={ACCENT_SOFT} strokeWidth="1.5" />
      <circle cx="120" cy="95" r="6" fill={ACCENT} />
      <rect x="158" y="72" width="52" height="16" rx="3" fill="var(--surface-raised)" stroke={ACCENT_SOFT} strokeWidth="1.2" />
      <rect x="158" y="98" width="52" height="16" rx="3" fill="var(--surface-raised)" stroke={ACCENT_SOFT} strokeWidth="1.2" />
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
      <rect width="300" height="170" rx="8" fill="var(--surface-deep)" />
      <DotGrid />
      <Variant />
    </svg>
  )
}
