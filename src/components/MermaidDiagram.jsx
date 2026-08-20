import { useEffect, useId, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Mermaid is initialized once, lazily. The public docs render in the light
// theme (see App ThemeSync), so we use a clean neutral palette tuned to the
// Deviante light tokens — a calm, low-chrome look that suits arc42 / C4 / UML.
let initialized = false
function ensureInit() {
  if (initialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    fontFamily: 'Inter, system-ui, sans-serif',
    themeVariables: {
      primaryColor: '#eef1f8',
      primaryBorderColor: '#2a4d8f',
      primaryTextColor: '#1a2338',
      lineColor: '#5f83ba',
      fontSize: '14px',
    },
  })
  initialized = true
}

// Renders a single Mermaid diagram from source text. On a syntax error it falls
// back to the raw source in a <pre> so a broken diagram never blanks the page.
export default function MermaidDiagram({ code }) {
  const ref = useRef(null)
  const rawId = useId()
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const source = (code || '').trim()
    if (!source) return

    ensureInit()
    // Mermaid ids must be valid CSS selectors — strip colons from useId().
    const id = `mmd-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

    mermaid
      .render(id, source)
      .then(({ svg }) => {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Diagrama inválido')
      })

    return () => {
      cancelled = true
    }
  }, [code, rawId])

  if (error) {
    return (
      <pre className="text-xs overflow-x-auto rounded-md border border-border p-3 text-muted-foreground">
        {code}
      </pre>
    )
  }

  return (
    <div
      ref={ref}
      className="my-6 flex justify-center overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
    />
  )
}
