import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { docsViews } from '../lib/docs'

// Temporary statements for the IPDD landing (owner 19/08 — "se não tiver
// coloque temporários"). IPDD has no `statements` table of its own yet, so
// these live in code for now; when a source of truth exists, swap this block
// for a fetch. Kept in PT-BR, in the product's own voice.
const STATEMENTS = {
  headline: 'Manutenção que enxerga o desvio antes da falha.',
  lead:
    'O IPDD transforma o event log do chão de fábrica em decisão: detecta desvios de desempenho em tempo real e antecipa quando a máquina vai precisar de manutenção — para que a parada seja escolha, não surpresa.',
  values: [
    'Detecção de drift em tempo real',
    'Previsão orientada a dados',
    'Do event log à decisão',
  ],
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Soft accent glow so the page reads as a lit landing, not a flat dark
          well. Sits behind everything, ignores pointer events. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] opacity-90"
        style={{
          background:
            'radial-gradient(60% 55% at 50% 0%, rgba(220,38,38,0.20), transparent 70%)',
        }}
      />

      <header className="relative z-10 px-8 py-8 flex items-center justify-between gap-6">
        <p className="text-2xl md:text-3xl font-bold uppercase tracking-[0.18em] text-foreground">
          IPDD
        </p>
        <nav className="flex items-center gap-1">
          {docsViews.map((view) => (
            <Link
              key={view.slug}
              to={`/${view.slug}`}
              className="text-sm rounded-full px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {view.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="relative z-10 flex-1 flex items-center">
        <section className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight text-foreground text-balance">
            {STATEMENTS.headline}
          </h1>

          {/* Spacing uses padding, not margin: the global `p { margin: 0 }`
              reset in index.css is unlayered and would beat Tailwind's layered
              margin utilities on <p>, collapsing the gap to zero. Equal rhythm:
              headline→lead and lead→CTA share the same 3rem gap. */}
          <p className="pt-12 text-base md:text-lg text-muted-foreground leading-[1.75] max-w-xl mx-auto text-pretty">
            {STATEMENTS.lead}
          </p>

          {/* CTA lives on the page, right below the hero copy — portfolio-home
              style. This is the only prominent action; the docs sit quietly in
              the nav above. */}
          <div className="mt-12 flex justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="w-full max-w-xs px-12"
            >
              Começar
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <ul className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground">
            {STATEMENTS.values.map((value) => (
              <li key={value} className="flex items-center gap-2">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                {value}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="relative z-10 px-6 py-5 text-center text-xs text-muted-foreground">
        IPDD — suporte à decisão em manutenção industrial.
      </footer>
    </div>
  )
}
