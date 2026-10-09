import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, Minus, Plus, ScanSearch, X } from 'lucide-react'
import mermaid from 'mermaid'

// Ported from the Make shell (Mermaid.tsx). The shell is dark: theme 'dark'.
let initialized = false
function configure() {
  if (initialized) return
  initialized = true
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'dark',
    fontFamily: 'var(--font-body)',
  })
}

// Mermaid (C4 above all) draws on a canvas much larger than the diagram, so
// the shapes end up small inside empty margins. Crop the viewBox to the drawn
// content and let the SVG grow to the column width, up to MAX_ZOOM.
const PAD = 12
const MAX_ZOOM = 1.8
const LAYOUT_WIDTH = 1200
const CLASS_LAYOUT_WIDTH = 2200

// Several diagrams render at once, so the override is reference-counted.
let widened = 0
function layoutWidthFor(code) {
  return /\bclassDiagram\b/.test(code) ? CLASS_LAYOUT_WIDTH : LAYOUT_WIDTH
}
function widenScreen(code) {
  const want = layoutWidthFor(code)
  if (widened++ === 0 && window.screen.availWidth < want) {
    Object.defineProperty(window.screen, 'availWidth', { value: want, configurable: true })
  }
}
function restoreScreen() {
  if (--widened === 0) delete window.screen.availWidth
}

// Mermaid's C4 draws relations (lines and labels) in a fixed #444444 that
// disappears on the dark shell. Swap that default for a light grey; colours
// set with UpdateRelStyle are left alone.
const C4_DEFAULT_LINE = /"#444444"/g
const C4_LIGHT_LINE = '"#cbd5e1"'
function lightenC4Lines(svg) {
  return svg.includes('aria-roledescription="c4"') ? svg.replace(C4_DEFAULT_LINE, C4_LIGHT_LINE) : svg
}

function cropSvg(svg) {
  // Invisible spacer shapes (used in C4 to steer the layout) still count in
  // the bounding box; take them out so the crop hugs what is actually seen.
  svg.querySelectorAll('rect[style*="fill:transparent"]').forEach((r) => {
    r.closest('g')?.setAttribute('display', 'none')
  })
  const box = svg.getBBox()
  if (!box.width || !box.height) return
  svg.setAttribute('viewBox', `${box.x - PAD} ${box.y - PAD} ${box.width + 2 * PAD} ${box.height + 2 * PAD}`)
  svg.removeAttribute('height')
  svg.setAttribute('width', '100%')
  svg.style.maxWidth = `${Math.round((box.width + 2 * PAD) * MAX_ZOOM)}px`
  svg.style.height = 'auto'
}

// Mermaid's orthogonal router often puts a 1–2px stub under the inheritance
// triangle (or at the arrow tip), then bends 90°. Rebuild as a clean stem.
const INHERIT_STEM = 56
const TIP_STUB_MAX = 8

function pathPoints(d) {
  return [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: +m[1], y: +m[2] }))
}

function clearPathDash(path) {
  path.style.strokeDasharray = ''
  path.style.strokeDashoffset = ''
}

function setOrthoPath(path, points) {
  if (points.length < 2) return
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 1; i < points.length; i++) d += `L${points[i].x},${points[i].y}`
  path.setAttribute('d', d)
  clearPathDash(path)
}

function straightenInheritanceStems(svg) {
  for (const path of svg.querySelectorAll('path.relation')) {
    const style = getComputedStyle(path)
    const marker = `${style.markerStart || ''} ${style.markerEnd || ''}`
    if (!/extension/i.test(marker)) continue
    const raw = path.getAttribute('d')
    if (!raw) continue
    const nums = pathPoints(raw)
    if (nums.length < 2) continue
    const start = nums[0]
    const end = nums[nums.length - 1]
    const dx = end.x - start.x
    const dy = end.y - start.y

    // Aligned: one straight segment (no tip kink).
    if (Math.abs(dx) < 1.5) {
      setOrthoPath(path, [start, { x: start.x, y: end.y }])
      continue
    }
    if (Math.abs(dy) < 1.5) {
      setOrthoPath(path, [start, { x: end.x, y: start.y }])
      continue
    }

    // Dominant vertical: long stem from parent, then across, then into child.
    if (Math.abs(dy) >= Math.abs(dx) * 0.55) {
      const dir = Math.sign(dy) || 1
      const stem = Math.min(INHERIT_STEM, Math.max(28, Math.abs(dy) * 0.4))
      if (Math.abs(dy) < stem + 12) continue
      const yBranch = start.y + dir * stem
      if ((dir > 0 && yBranch >= end.y - 6) || (dir < 0 && yBranch <= end.y + 6)) continue
      setOrthoPath(path, [start, { x: start.x, y: yBranch }, { x: end.x, y: yBranch }, end])
      continue
    }

    // Dominant horizontal (LR layouts): stem sideways from parent first.
    const dir = Math.sign(dx) || 1
    const stem = Math.min(INHERIT_STEM, Math.max(28, Math.abs(dx) * 0.35))
    if (Math.abs(dx) < stem + 12) continue
    const xBranch = start.x + dir * stem
    if ((dir > 0 && xBranch >= end.x - 6) || (dir < 0 && xBranch <= end.x + 6)) continue
    setOrthoPath(path, [start, { x: xBranch, y: start.y }, { x: xBranch, y: end.y }, end])
  }
}

// Drop tiny stubs at the arrow tip of association edges (not inheritance —
// those are rebuilt above). Mermaid often jogs 1–2px right at marker-end.
function unkinkRelationTips(svg) {
  for (const path of svg.querySelectorAll('path.relation')) {
    const style = getComputedStyle(path)
    const marker = `${style.markerStart || ''} ${style.markerEnd || ''}`
    if (/extension/i.test(marker)) continue
    const raw = path.getAttribute('d')
    if (!raw) continue
    let pts = pathPoints(raw)
    if (pts.length < 3) continue
    const b = pts[pts.length - 2]
    const c = pts[pts.length - 1]
    if (Math.hypot(c.x - b.x, c.y - b.y) >= TIP_STUB_MAX) continue
    setOrthoPath(path, [...pts.slice(0, -2), c])
  }
}

export default function Mermaid({ code }) {
  const id = useId().replace(/:/g, '')
  const ref = useRef(null)
  const [error, setError] = useState(null)
  const [svgMarkup, setSvgMarkup] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    configure()
    // Mermaid's C4 layout wraps rows at screen.availWidth, so on a phone the
    // diagram collapses into one tall column. Lay it out as on a desktop; the
    // crop below scales it to fit and the overlay shows it full size.
    widenScreen(code)
    mermaid
      .render(`mmd-${id}`, code)
      .then(({ svg }) => {
        if (cancelled || !ref.current) return
        ref.current.innerHTML = lightenC4Lines(svg)
        const el = ref.current.querySelector('svg')
        if (el) {
          straightenInheritanceStems(el)
          unkinkRelationTips(el)
          cropSvg(el)
          setSvgMarkup(el.outerHTML)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e))
      })
      .finally(restoreScreen)
    return () => {
      cancelled = true
    }
  }, [code, id])

  if (error) {
    return (
      <pre className="my-6 overflow-x-auto rounded-[var(--radius)] border border-border bg-muted p-4 font-mono text-sm text-muted-foreground">
        {error}
      </pre>
    )
  }

  return (
    <>
      <div className="group my-8">
        <div
          ref={ref}
          role="button"
          tabIndex={0}
          aria-label="Ampliar diagrama"
          onClick={() => svgMarkup && setOpen(true)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && svgMarkup && setOpen(true)}
          className="flex cursor-zoom-in justify-center overflow-x-auto rounded-[var(--radius)] border border-border bg-card p-2"
        />
        {svgMarkup && (
          <span className="pointer-events-none mt-1.5 flex items-center justify-end gap-1 text-[11px] text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100">
            <Maximize2 size={12} aria-hidden="true" /> Clique no diagrama para ampliar
          </span>
        )}
      </div>
      {open && createPortal(<ZoomOverlay svgMarkup={svgMarkup} onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

// Full-screen view: starts fitted to the screen width (readable even for tall
// diagrams), scrolls in both directions and zooms with the buttons, + / -,
// or Ctrl + scroll wheel.
const MIN_SCALE = 0.25
const MAX_SCALE = 6
const STEP = 1.25

function naturalSize(markup) {
  const m = markup.match(/viewBox="([-\d.\s]+)"/)
  if (!m) return { width: 1000, height: 1000 }
  const [, , width, height] = m[1].trim().split(/\s+/).map(Number)
  return { width, height }
}

function ZoomOverlay({ svgMarkup, onClose }) {
  const scrollRef = useRef(null)
  const size = naturalSize(svgMarkup)
  const [scale, setScale] = useState(null)

  const fitWidth = () => {
    const el = scrollRef.current
    if (!el) return
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, (el.clientWidth - 32) / size.width)))
  }
  const zoom = (factor) => setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, (s ?? 1) * factor)))

  useEffect(() => {
    fitWidth()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === '+' || e.key === '=') zoom(STEP)
      else if (e.key === '-') zoom(1 / STEP)
      else if (e.key === '0') fitWidth()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      zoom(e.deltaY < 0 ? STEP : 1 / STEP)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const button =
    'rounded-md border border-border bg-card p-2 text-muted-foreground hover:text-foreground'
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Diagrama ampliado"
      className="fixed inset-0 z-[100] flex flex-col bg-black/85 backdrop-blur-sm"
    >
      <div className="flex items-center justify-end gap-2 p-3">
        <span className="mr-auto pl-1 text-xs text-muted-foreground">
          {scale ? `${Math.round(scale * 100)}%` : ''} · Ctrl + rolagem para zoom
        </span>
        <button type="button" aria-label="Diminuir zoom" onClick={() => zoom(1 / STEP)} className={button}>
          <Minus size={18} />
        </button>
        <button type="button" aria-label="Ajustar à largura" onClick={fitWidth} className={button}>
          <ScanSearch size={18} />
        </button>
        <button type="button" aria-label="Aumentar zoom" onClick={() => zoom(STEP)} className={button}>
          <Plus size={18} />
        </button>
        <button type="button" aria-label="Fechar" onClick={onClose} className={button}>
          <X size={18} />
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 pb-4">
        <div
          className="mx-auto rounded-[var(--radius)] border border-border bg-card p-4 [&_svg]:!h-full [&_svg]:!w-full [&_svg]:!max-w-none"
          style={scale ? { width: size.width * scale + 32, height: size.height * scale + 32 } : { visibility: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </div>
    </div>
  )
}
