import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ShellHeader from '../components/shell/ShellHeader'
import ShellFooter from '../components/shell/ShellFooter'

// Landing — the Gestalt shell landing ported from the Figma Make, with
// Deviante's own copy (temporary statements, owner 19/08). Light-only.
const STATEMENTS = {
  eyebrow: 'Manutenção preditiva',
  headline: 'Manutenção que enxerga o desvio antes da falha.',
  lead:
    'O Deviante transforma o event log do chão de fábrica em decisão: detecta desvios de desempenho em tempo real e antecipa quando a máquina vai precisar de manutenção — para que a parada seja escolha, não surpresa.',
  values: [
    { title: 'Detecção de drift em tempo real', body: 'ADWIN sobre o event log encontra a mudança de desempenho no instante em que ela acontece.' },
    { title: 'Previsão orientada a dados', body: 'Do desvio à antecipação: quando a máquina vai pedir manutenção, com base no que o processo mostra.' },
    { title: 'Do event log à decisão', body: 'O dado bruto do chão de fábrica vira ação proativa de manutenção — não relatório parado.' },
  ],
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="gestalt-shell min-h-screen bg-background text-foreground">
      <ShellHeader activeSlug={null} />

      <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
        {/* Hero */}
        <section className="grid grid-cols-1 gap-12 pt-16 pb-24 lg:grid-cols-12 lg:gap-8 lg:pt-24 lg:pb-32">
          <div className="lg:col-span-7">
            <div className="flex flex-col gap-7">
              <p className="font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-[0.2em] text-accent">
                {STATEMENTS.eyebrow}
              </p>
              <h1 className="shell-hero-title max-w-[18ch] font-[family-name:var(--font-display)] font-semibold text-foreground">
                {STATEMENTS.headline}
              </h1>
              <p className="max-w-[52ch] text-lg leading-relaxed text-muted-foreground">{STATEMENTS.lead}</p>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Começar
                <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-0.5" />
              </button>
              <span className="text-sm text-muted-foreground">Documentação · Casos de Uso · Objetos</span>
            </div>
          </div>

          {/* Neutral placeholder block — no brand imagery */}
          <div className="lg:col-span-5">
            <div className="grid h-full min-h-[280px] grid-cols-6 grid-rows-6 gap-2 rounded-[var(--radius)] border border-border bg-card p-2 shadow-[var(--shadow-panel)]">
              <div className="col-span-4 row-span-2 rounded-md bg-secondary" />
              <div className="col-span-2 row-span-3 rounded-md bg-accent/15" />
              <div className="col-span-2 row-span-2 rounded-md bg-muted" />
              <div className="col-span-2 row-span-4 rounded-md bg-secondary" />
              <div className="col-span-4 row-span-2 rounded-md bg-muted" />
              <div className="col-span-2 row-span-2 rounded-md bg-accent/10" />
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24">
          <p className="font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Valores
          </p>
          <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-3">
            {STATEMENTS.values.map((v, i) => (
              <div key={v.title} className="border-t border-border pt-6">
                <span className="font-[family-name:var(--font-eyebrow)] text-sm text-muted-foreground">0{i + 1}</span>
                <div className="mt-3 flex flex-col gap-2">
                  <div
                    role="heading"
                    aria-level={3}
                    className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-foreground"
                  >
                    {v.title}
                  </div>
                  <p className="leading-relaxed text-muted-foreground">{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <ShellFooter note="Deviante — suporte à decisão em manutenção industrial." />
      </div>
    </div>
  )
}
