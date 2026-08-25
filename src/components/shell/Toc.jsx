import { useEffect, useState } from 'react'

// Ported from the Make shell (Toc.tsx). Scroll-spy over the DocViewer headings.
export default function Toc({ headings }) {
  const [active, setActive] = useState(headings[0]?.id ?? '')

  useEffect(() => {
    if (headings.length === 0) return
    const els = headings.map((h) => document.getElementById(h.id)).filter(Boolean)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target.id) setActive(visible[0].target.id)
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headings])

  if (headings.length <= 1) return null

  return (
    <nav aria-label="Nesta página" className="text-sm">
      <p className="mb-4 font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Nesta página
      </p>
      <ul className="space-y-1 border-l border-border">
        {headings.map((h) => {
          const isActive = h.id === active
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  setActive(h.id)
                }}
                className={`-ml-px block border-l-2 py-1.5 leading-snug transition-colors ${
                  isActive
                    ? 'border-accent font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                } ${h.level === 3 ? 'pl-7' : 'pl-4'}`}
              >
                {h.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
