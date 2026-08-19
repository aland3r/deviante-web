import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/button'
import { docsViews } from '../lib/docs'

// Temporary statements for the Deviante landing (owner 19/08 — "se não tiver
// coloque temporários"). Deviante has no `statements` table of its own yet, so
// these live in code for now; when a source of truth exists, swap this block
// for a fetch. Kept in PT-BR, in the product's own voice.
const STATEMENTS = {
  eyebrow: 'Deviante',
  headline: 'Manutenção que enxerga o desvio antes da falha.',
  lead:
    'Deviante transforma o event log do chão de fábrica em decisão: detecta desvios de desempenho em tempo real e antecipa quando a máquina vai precisar de manutenção — para que a parada seja escolha, não surpresa.',
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

      <header className="relative z-10 px-6 py-5 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-foreground">
          Deviante
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
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-6">
            {STATEMENTS.eyebrow}
          </p>

          <h1 className="text-4xl md:text-6xl font-semibold leading-[1.05] text-foreground text-balance">
            {STATEMENTS.headline}
          </h1>

          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {STATEMENTS.lead}
          </p>

          {/* CTA lives on the page, right below the hero copy — portfolio-home
              style. This is the only prominent action; the docs sit quietly in
              the nav above. */}
          <div className="mt-10 flex justify-center">
            <Button size="lg" onClick={() => navigate('/login')} className="px-8">
              Começar
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <ul className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
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
        Deviante — suporte à decisão em manutenção industrial.
      </footer>
    </div>
  )
}
