import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import ShellHeader from '../components/shell/ShellHeader'
import ShellSidebar from '../components/shell/ShellSidebar'
import ShellFooter from '../components/shell/ShellFooter'
import DocViewer from '../components/shell/DocViewer'
import Mermaid from '../components/shell/Mermaid'
import Toc from '../components/shell/Toc'
import { fetchDoc, getView, DOCS_REPO } from '../lib/docs'
import { extractHeadings } from '../lib/shell-headings'

// Documentação / Objetos — markdown fetched from the public docs repo, rendered
// in the Gestalt shell ported from the Figma Make. (Casos de Uso is DB-driven
// and lives in UseCasesView.) Light-only.
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

  const isDiagram = (activePath ?? '').endsWith('.mmd')
  const activeDoc = docs.find((d) => d.path === activePath)
  const headings = useMemo(
    () => (status === 'ready' && !isDiagram ? extractHeadings(content) : []),
    [content, status, isDiagram],
  )

  if (!view) return <Navigate to="/" replace />

  const sidebarDocs = docs.map((d) => ({ id: d.path, title: d.label }))

  return (
    <div className="gestalt-shell min-h-screen bg-background text-foreground">
      <ShellHeader activeSlug={slug} />

      <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row">
        <ShellSidebar
          eyebrow={view.eyebrow}
          title={view.label}
          blurb={view.blurb}
          docs={sidebarDocs}
          activeId={activePath}
          onSelect={(id) => {
            setActivePath(id)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />

        <main className="min-w-0 flex-1 px-4 pt-4 pb-12 sm:px-6 lg:flex lg:gap-12 lg:px-0 lg:pt-14 lg:pl-16 lg:pr-8">
          <div className="min-w-0 max-w-[72ch] flex-1">
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
            {status === 'ready' && isDiagram && (
              <article className="doc-prose max-w-none">
                <h1 className="font-[family-name:var(--font-display)] text-foreground">{activeDoc?.label}</h1>
                <Mermaid code={content} />
                <p className="text-sm text-muted-foreground">
                  Diagrama renderizado direto do arquivo <code>{activePath}</code> (mermaid). Este .mmd é a
                  referência — editar e dar push atualiza esta página.
                </p>
              </article>
            )}

            {status === 'ready' && !isDiagram && <DocViewer body={content} />}

            <ShellFooter
              note="Publicado direto do vault Obsidian. Editar e dar push atualiza esta página."
              repoUrl={`https://github.com/${DOCS_REPO}`}
            />
          </div>

          {/* Table of contents */}
          <div className="hidden shrink-0 xl:block xl:w-56">
            <div className="sticky top-24 pt-1">
              <Toc key={activePath} headings={headings} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
