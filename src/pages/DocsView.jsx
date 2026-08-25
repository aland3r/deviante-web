import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import ShellHeader from '../components/shell/ShellHeader'
import ShellFooter from '../components/shell/ShellFooter'
import DocViewer from '../components/shell/DocViewer'
import Toc from '../components/shell/Toc'
import { fetchDoc, getView, DOCS_REPO } from '../lib/docs'
import { extractHeadings } from '../lib/shell-headings'

// Documentação / Objetos — markdown fetched from the public docs repo, rendered
// in the Gestalt shell. Layout (owner 25/08): the navigable index ("Nesta
// página") lives on the LEFT; there is no title/blurb sidebar. Diagrams are
// embedded inline in the markdown (```mermaid), not as separate entries. The
// doc switcher only appears for tabs with more than one doc (e.g. Objetos).
export default function DocsView() {
  const { pathname } = useLocation()
  const slug = pathname.replace(/^\/+/, '')
  const view = getView(slug)

  const docs = useMemo(() => view?.sections.flatMap((s) => s.items) ?? [], [view])
  const firstPath = docs[0]?.path ?? null
  const [activePath, setActivePath] = useState(firstPath)

  useEffect(() => {
    setActivePath(firstPath)
  }, [firstPath])

  const [content, setContent] = useState('')
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!activePath) return
    let cancelled = false
    setStatus('loading')
    fetchDoc(activePath)
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
  }, [activePath])

  const headings = useMemo(() => (status === 'ready' ? extractHeadings(content) : []), [content, status])

  if (!view) return <Navigate to="/" replace />

  const multiDoc = docs.length > 1

  return (
    <div className="gestalt-shell min-h-screen bg-background text-foreground">
      <ShellHeader activeSlug={slug} />

      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 pt-8 pb-12 sm:px-6 lg:flex-row lg:gap-14 lg:px-8 lg:pt-14">
        {/* Left column: doc switcher (multi-doc only) + navigable index */}
        <aside className="shrink-0 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-64 lg:overflow-y-auto lg:py-1">
          {multiDoc && (
            <nav className="mb-8">
              <div className="mb-3 font-[family-name:var(--font-eyebrow)] text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Documentos
              </div>
              <ul className="space-y-0.5">
                {docs.map((d) => {
                  const on = d.path === activePath
                  return (
                    <li key={d.path}>
                      <button
                        onClick={() => setActivePath(d.path)}
                        aria-current={on ? 'true' : undefined}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          on
                            ? 'bg-accent/12 font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        {d.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          )}
          <Toc key={activePath} headings={headings} />
        </aside>

        {/* Reading column */}
        <main className="min-w-0 flex-1">
          <div className="min-w-0 max-w-3xl">
            {status === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Carregando…
              </div>
            )}
            {status === 'error' && (
              <p className="text-sm text-destructive">
                Não foi possível carregar esse documento agora. Ele vive em{' '}
                <a className="underline" href={`https://github.com/${DOCS_REPO}`} target="_blank" rel="noreferrer">
                  github.com/{DOCS_REPO}
                </a>
                .
              </p>
            )}
            {status === 'ready' && <DocViewer body={content} />}

            <ShellFooter
              note="Publicado direto do vault Obsidian. Editar e dar push atualiza esta página."
              repoUrl={`https://github.com/${DOCS_REPO}`}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
