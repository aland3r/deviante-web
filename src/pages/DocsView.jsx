import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { docsViews, fetchDoc, getView, allDocItems, DOCS_REPO } from '../lib/docs'

// One of the three documentation destinations (Documentação / Casos de Uso /
// Objetos). The landing is now a real landing page — this is the docs viewer it
// links down into. The sidebar shows only the sections that belong to this
// view; the top nav lets you hop between the three.
export default function DocsView() {
  const { pathname } = useLocation()
  const slug = pathname.replace(/^\/+/, '')
  const navigate = useNavigate()
  const view = getView(slug)

  const firstItem = useMemo(() => view?.sections[0]?.items[0] ?? null, [view])
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

  // Unknown slug → back to the landing page.
  if (!view) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Deviante</span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {docsViews.map((item) => (
              <Link
                key={item.slug}
                to={`/${item.slug}`}
                className={`text-sm rounded-full px-3 py-1.5 whitespace-nowrap transition-colors ${
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
        <Button size="sm" onClick={() => navigate('/login')}>
          Entrar no app
        </Button>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-border p-4 space-y-6 overflow-y-auto">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary mb-1">{view.eyebrow}</p>
            <h2 className="text-base font-semibold text-foreground">{view.label}</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{view.blurb}</p>
          </div>

          {view.sections.map((group) => (
            <div key={group.section}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                {group.section}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => setActive(item)}
                      className={`w-full text-left text-sm rounded-md px-2 py-1.5 flex items-center gap-2 transition-colors ${
                        active?.label === item.label
                          ? 'bg-primary/15 text-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <FileText className="size-3.5 shrink-0" />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <main className="flex-1 p-6 md:p-10 max-w-3xl">
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
            <article className="prose prose-invert prose-sm md:prose-base max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </article>
          )}
        </main>
      </div>

      <footer className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
        Publicado direto do vault Obsidian ({allDocItems.length} documentos) —{' '}
        <a className="underline" href={`https://github.com/${DOCS_REPO}`} target="_blank" rel="noreferrer">
          {DOCS_REPO}
        </a>
        . Editar e dar push atualiza esta página.
      </footer>
    </div>
  )
}
