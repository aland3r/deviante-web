import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, X } from 'lucide-react'
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

// Several diagrams render at once, so the override is reference-counted.
let widened = 0
function widenScreen() {
  if (widened++ === 0 && window.screen.availWidth < LAYOUT_WIDTH) {
    Object.defineProperty(window.screen, 'availWidth', { value: LAYOUT_WIDTH, configurable: true })
  }
}
function restoreScreen() {
  if (--widened === 0) delete window.screen.availWidth
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
    widenScreen()
    mermaid
      .render(`mmd-${id}`, code)
      .then(({ svg }) => {
        if (cancelled || !ref.current) return
        ref.current.innerHTML = svg
        const el = ref.current.querySelector('svg')
        if (el) {
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

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

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
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Diagrama ampliado"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
              className="absolute right-6 top-6 z-10 rounded-md border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
            <div
              className="h-full w-full rounded-[var(--radius)] border border-border bg-card p-3 [&_svg]:!h-full [&_svg]:!w-full [&_svg]:!max-w-none"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
