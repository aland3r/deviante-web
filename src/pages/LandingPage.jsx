import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { docsManifest, fetchDoc, DOCS_REPO } from '../lib/docs'

const DEFAULT_ITEM = docsManifest[0].items[0]

export default function LandingPage() {
  const navigate = useNavigate()
  const [active, setActive] = useState(DEFAULT_ITEM)
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('loading')

  useEffect(() => {
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

  const allItems = useMemo(() => docsManifest.flatMap((group) => group.items), [])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Deviante</p>
          <h1 className="text-lg font-semibold text-foreground">Documentação viva do produto</h1>
        </div>
        <Button onClick={() => navigate('/login')}>Entrar no app</Button>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-border p-4 space-y-6 overflow-y-auto">
          {docsManifest.map((group) => (
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
                        active.label === item.label
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

          {status === 'placeholder' && (
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
        Publicado direto do vault Obsidian ({allItems.length} documentos) —{' '}
        <a className="underline" href={`https://github.com/${DOCS_REPO}`} target="_blank" rel="noreferrer">
          {DOCS_REPO}
        </a>
        . Editar e dar push atualiza esta página.
      </footer>
    </div>
  )
}
