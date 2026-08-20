import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import GithubSlugger from 'github-slugger'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import MermaidDiagram from '../components/MermaidDiagram'
import { docsViews, fetchDoc, getView, DOCS_REPO } from '../lib/docs'

// Markdown renderer overrides: a ```mermaid fenced block renders as a diagram
// instead of a code listing. `pre` unwraps the mermaid case so we don't nest a
// diagram inside a <pre> shell. rehype-slug (below) puts an id on every heading,
// which the Table of Contents anchors to.
const markdownComponents = {
  code({ className, children, ...props }) {
    if (/language-mermaid/.test(className || '')) {
      return <MermaidDiagram code={String(children).replace(/\n$/, '')} />
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
  pre({ children }) {
    const child = Array.isArray(children) ? children[0] : children
    if (/language-mermaid/.test(child?.props?.className || '')) return child
    return <pre>{children}</pre>
  },
}

// Extract headings (level ≥ 2 — the h1 is the page title) from raw Markdown,
// skipping fenced code. Slugs use github-slugger, the same algorithm rehype-slug
// applies to the rendered headings, so the anchors line up.
function extractHeadings(markdown) {
  const slugger = new GithubSlugger()
  const out = []
  let inFence = false
  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
    if (!m) continue
    const level = m[1].length
    const text = m[2].replace(/[*_`]/g, '').trim()
    const id = slugger.slug(text)
    if (level >= 2) out.push({ level, text, id })
  }
  return out
}

export default function DocsView() {
  const { pathname } = useLocation()
  const slug = pathname.replace(/^\/+/, '')
  const navigate = useNavigate()
  const view = getView(slug)

  const docItems = useMemo(
    () => view?.sections.flatMap((s) => s.items) ?? [],
    [view],
  )
  const firstItem = docItems[0] ?? null
  const [active, setActive] = useState(firstItem)

  // Reset the open doc whenever we switch views.
  useEffect(() => {
    setActive(firstItem)
  }, [firstItem])

  const [content, setContent] = useState('')
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!active) return
    if (active.placeholder) {
      setContent('')
      setStatus('placeholder')
      return
    }
    let cancelled = false
    setStatus('loading')
    fetchDoc(active.path)
      .then((text) => {
        if (!cancelled) {
          setContent(text)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [active])

  const headings = useMemo(
    () => (status === 'ready' ? extractHeadings(content) : []),
    [content, status],
  )

  // Scroll-spy: highlight the TOC entry for the heading nearest the top.
  const [activeId, setActiveId] = useState(null)
  const articleRef = useRef(null)
  useEffect(() => {
    if (headings.length === 0) return
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean)
    if (els.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-64px 0px -70% 0px', threshold: 0 },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headings])

  function goTo(id) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
    }
  }

  // Unknown slug → back to the landing page.
  if (!view) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header height is 64px — the sticky sidebar + heading scroll-margin
          below are anchored to it. */}
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur px-6 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <ArrowLeft className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="hidden sm:inline text-xl font-bold uppercase tracking-[0.18em] text-foreground">IPDD</span>
          </Link>
          <nav className="flex items-center gap-2 overflow-x-auto">
            {docsViews.map((item) => (
              <Link
                key={item.slug}
                to={`/${item.slug}`}
                className={`text-[15px] rounded-full px-4 py-2 whitespace-nowrap transition-colors ${
                  item.slug === view.slug
                    ? 'bg-primary/15 text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <Button onClick={() => navigate('/login')}>Entrar no app</Button>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* No vertical border between panels (fewer grid lines) — the reading
            column's generous left padding does the separation. 8pt rhythm
            throughout; larger type + tap targets for older readers. */}
        <aside className="lg:w-80 shrink-0 overflow-y-auto lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]">
          <div className="p-8 space-y-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary mb-2">{view.eyebrow}</p>
              <h2 className="text-lg font-semibold text-foreground">{view.label}</h2>
              <p className="text-[15px] text-muted-foreground mt-2 leading-relaxed">{view.blurb}</p>
            </div>

            {/* Document switcher (only when the view holds more than one doc). */}
            {docItems.length > 1 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">
                  Documentos
                </p>
                <ul className="space-y-1">
                  {docItems.map((item) => {
                    const on = active?.label === item.label
                    return (
                      <li key={item.label}>
                        <button
                          type="button"
                          onClick={() => setActive(item)}
                          className={`w-full text-left text-[15px] rounded-lg px-3 py-2 transition-colors ${
                            on
                              ? 'bg-primary/12 text-foreground font-medium'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Table of Contents — auto from headings. No continuous rule; the
                active entry gets a short accent tick instead of a full line. */}
            {headings.length > 0 && (
              <nav aria-label="Índice">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">
                  Índice
                </p>
                <ul className="space-y-1">
                  {headings.map((h) => {
                    const on = activeId === h.id
                    return (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => goTo(h.id)}
                          style={{ paddingLeft: `${h.level - 1}rem` }}
                          className={`w-full text-left text-[15px] py-2 border-l-2 transition-colors ${
                            on
                              ? 'border-primary text-foreground font-medium'
                              : 'border-transparent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {h.text}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            )}
          </div>
        </aside>

        <main className="flex-1 px-8 py-16 md:px-20 md:py-20 min-w-0">
          <div className="max-w-3xl" ref={articleRef}>
            {status === 'loading' && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" />
                Carregando…
              </div>
            )}

            {status === 'error' && (
              <p className="text-sm text-destructive">
                Não foi possível carregar esse documento agora. Ele vive em{' '}
                <a
                  className="underline"
                  href={`https://github.com/${DOCS_REPO}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/{DOCS_REPO}
                </a>
                .
              </p>
            )}

            {status === 'placeholder' && active && (
              <p className="text-sm text-muted-foreground italic">{active.placeholder}</p>
            )}

            {status === 'ready' && (
              <article className="prose prose-base md:prose-lg max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:mb-4 prose-h2:mt-16 prose-h2:mb-6 prose-h3:mt-10 prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-hr:border-border prose-hr:my-12 [&_:is(h1,h2,h3,h4)]:scroll-mt-24">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug]}
                  components={markdownComponents}
                >
                  {content}
                </ReactMarkdown>
              </article>
            )}
          </div>
        </main>
      </div>

      <footer className="px-8 py-6 text-sm text-muted-foreground">
        Publicado direto do vault Obsidian —{' '}
        <a className="underline" href={`https://github.com/${DOCS_REPO}`} target="_blank" rel="noreferrer">
          {DOCS_REPO}
        </a>
        . Editar e dar push atualiza esta página.
      </footer>
    </div>
  )
}
