import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import ShellHeader from '../components/shell/ShellHeader'
import ShellFooter from '../components/shell/ShellFooter'
import UseCaseCard from '../components/shell/UseCaseCard'
import { fetchDevianteUseCases, toUseCaseView } from '../lib/useCases'

// "Casos de Uso" tab — UCs pulled live from portfolio.use_cases (owner 25/08),
// rendered in the Gestalt shell. All UC cards are stacked in one column (like
// the portfolio UCs page, owner 25/08): the list of collapsible cards IS the
// navigable summary, so there is no left sidebar. Each card opens one at a
// time; they start collapsed. Light-only.
export default function UseCasesView() {
  const [useCases, setUseCases] = useState([])
  const [status, setStatus] = useState('loading')
  // Accordion: at most one UC open at a time (mirrors the portfolio UC list).
  const [openId, setOpenId] = useState(null)

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
        setStatus(rows.length ? 'ready' : 'empty')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="gestalt-shell min-h-screen bg-background text-foreground">
      <ShellHeader activeSlug="casos-de-uso" />

      <main className="mx-auto w-full max-w-4xl px-4 pt-10 pb-12 sm:px-6 lg:pt-14">
        <header className="mb-8">
          <p className="font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-[0.16em] text-accent">
            Cenários
          </p>
          <div
            role="heading"
            aria-level={1}
            className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-foreground"
          >
            Casos de Uso
          </div>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
            Casos de uso no formato caixa-preta — ator, contexto e passos. Puxados direto do banco.
          </p>
        </header>

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
          <p className="text-sm italic text-muted-foreground">Conexão com o banco não configurada neste ambiente.</p>
        )}
        {status === 'empty' && (
          <p className="text-sm italic text-muted-foreground">Nenhum caso de uso público publicado ainda.</p>
        )}

        {status === 'ready' && (
          <div className="space-y-4">
            {useCases.map((uc, i) => (
              <UseCaseCard
                key={uc.short_id}
                useCase={toUseCaseView(uc)}
                index={i}
                total={useCases.length}
                open={openId === uc.short_id}
                onToggle={() => setOpenId((prev) => (prev === uc.short_id ? null : uc.short_id))}
              />
            ))}
          </div>
        )}

        <ShellFooter note="Casos de uso publicados direto do banco (portfolio.use_cases)." />
      </main>
    </div>
  )
}
