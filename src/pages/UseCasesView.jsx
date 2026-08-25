import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import ShellHeader from '../components/shell/ShellHeader'
import ShellSidebar from '../components/shell/ShellSidebar'
import ShellFooter from '../components/shell/ShellFooter'
import UseCaseCard from '../components/shell/UseCaseCard'
import { fetchDevianteUseCases, toUseCaseView } from '../lib/useCases'

// "Casos de Uso" tab — UCs pulled live from portfolio.use_cases (owner 25/08),
// rendered in the Gestalt shell ported from the Figma Make. Light-only.
export default function UseCasesView() {
  const [useCases, setUseCases] = useState([])
  const [status, setStatus] = useState('loading')
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    fetchDevianteUseCases('pt')
      .then(({ status: s, useCases: rows }) => {
        if (cancelled) return
        if (s === 'unconfigured') {
          setStatus('unconfigured')
          return
        }
        setUseCases(rows)
        setActiveId(rows[0]?.short_id ?? null)
        setStatus(rows.length ? 'ready' : 'empty')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const docs = useMemo(
    () => useCases.map((uc) => ({ id: uc.short_id, title: `${uc.short_id} · ${uc.title}` })),
    [useCases],
  )
  const index = useMemo(() => useCases.findIndex((uc) => uc.short_id === activeId), [useCases, activeId])
  const active = index >= 0 ? useCases[index] : null

  return (
    <div className="gestalt-shell min-h-screen bg-background text-foreground">
      <ShellHeader activeSlug="casos-de-uso" />

      <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row">
        <ShellSidebar
          eyebrow="Cenários"
          title="Casos de Uso"
          blurb="Casos de uso no formato caixa-preta — ator, contexto e passos. Puxados direto do banco."
          docs={docs}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />

        <main className="min-w-0 flex-1 px-4 pt-4 pb-12 sm:px-6 lg:px-0 lg:pt-14 lg:pl-16 lg:pr-8">
          <div className="min-w-0 max-w-[72ch] flex-1">
            {status === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Carregando…
              </div>
            )}
            {status === 'error' && (
              <p className="text-sm text-destructive">
                Não foi possível carregar os casos de uso agora. Tente recarregar a página.
              </p>
            )}
            {status === 'unconfigured' && (
              <p className="text-sm italic text-muted-foreground">
                Conexão com o banco não configurada neste ambiente.
              </p>
            )}
            {status === 'empty' && (
              <p className="text-sm italic text-muted-foreground">Nenhum caso de uso público publicado ainda.</p>
            )}

            {status === 'ready' && active && (
              <UseCaseCard useCase={toUseCaseView(active)} index={index} total={useCases.length} />
            )}

            <ShellFooter
              note="Casos de uso publicados direto do banco (portfolio.use_cases)."
            />
          </div>
        </main>
      </div>
    </div>
  )
}
