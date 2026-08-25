import { useEffect, useId, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Ported from the Make shell (Mermaid.tsx). Light-only: theme 'neutral'.
let initialized = false
function configure() {
  if (initialized) return
  initialized = true
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    fontFamily: 'var(--font-body)',
  })
}

export default function Mermaid({ code }) {
  const id = useId().replace(/:/g, '')
  const ref = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    configure()
    mermaid
      .render(`mmd-${id}`, code)
      .then(({ svg }) => {
        if (!cancelled && ref.current) ref.current.innerHTML = svg
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e))
      })
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
    <div
      ref={ref}
      className="my-8 flex justify-center overflow-x-auto rounded-[var(--radius)] border border-border bg-card p-6 [&_svg]:h-auto [&_svg]:max-w-full"
    />
  )
}
