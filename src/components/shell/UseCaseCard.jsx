import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Ported from the Make shell (UseCaseCard.tsx). The template's edit pencil is
// dropped — the public site is read-only. `useCase` shape matches the Make's
// contract; it is fed from the DB (see lib/useCases → toUseCaseView).
// Single JetBrains-Mono style across the card: one size (text-xs), one weight
// (owner 25/08 — the mono font must exist in only one size/style).
const MONO = 'font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground'

export default function UseCaseCard({ useCase, index, total, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-panel)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="size-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/50" aria-hidden />
        <code className="shrink-0 font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.12em] text-muted-foreground">
          {useCase.id}
        </code>
        <div
          role="heading"
          aria-level={2}
          className="min-w-0 flex-1 truncate font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-foreground"
        >
          {useCase.title}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Recolher' : 'Expandir'}
          aria-expanded={open}
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronDown className={`size-4 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>

        {/* Progress within the set */}
        {total > 1 && (
          <div className="hidden items-center gap-3 pl-2 sm:flex">
            <div className="h-1 w-28 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-foreground/40" style={{ width: `${((index + 1) / total) * 100}%` }} />
            </div>
            <span className="font-[family-name:var(--font-mono)] text-xs font-medium tabular-nums text-muted-foreground">
              {index + 1}/{total}
            </span>
          </div>
        )}
      </div>

      {open && (
        <div className="border-t border-border">
          {/* Description */}
          {useCase.description && (
            <div className="border-l-2 border-accent px-5 py-5">
              <div className={`${MONO} mb-3`}>Descrição</div>
              <p className="leading-relaxed text-foreground/85">{useCase.description}</p>
            </div>
          )}

          {/* Context */}
          <SectionBar label="Contexto" />
          <div className="grid grid-cols-1 border-t border-border sm:grid-cols-[auto_1fr_auto_1fr]">
            <Cell className={MONO}>Ator</Cell>
            <Cell className="text-sm text-foreground/90">{useCase.actor || '—'}</Cell>
            <Cell className={MONO}>Objeto</Cell>
            <Cell className="text-sm text-foreground/90">{useCase.object || '—'}</Cell>

            <Cell className={`${MONO} sm:col-span-1`}>Pré-condição</Cell>
            <Cell className="text-sm text-foreground/90 sm:col-span-3">{useCase.preCondition || '—'}</Cell>

            <Cell className={`${MONO} sm:col-span-1`}>Pós-condição</Cell>
            <Cell className="text-sm text-foreground/90 sm:col-span-3">{useCase.postCondition || '—'}</Cell>
          </div>

          {/* Flows */}
          {useCase.flows.map((flow, i) => (
            <Flow key={i} flow={flow} showBar={Boolean(flow.label) || useCase.flows.length > 1} />
          ))}
        </div>
      )}
    </section>
  )
}

function SectionBar({ label, count }) {
  return (
    <div className="flex items-center gap-2 border-t border-l-2 border-l-accent/60 bg-secondary/50 px-5 py-2.5">
      <span className="font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-[0.18em] text-foreground/70">
        {label}
      </span>
      {count != null && <span className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">{count}</span>}
    </div>
  )
}

function Cell({ children, className = '' }) {
  return <div className={`border-b border-border px-5 py-3 leading-relaxed ${className}`}>{children}</div>
}

function Flow({ flow, showBar }) {
  return (
    <>
      {showBar && flow.label && <SectionBar label={flow.label} count={flow.steps.length} />}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-t border-border bg-secondary/30">
              <th className="w-16 border-r border-border px-3 py-2.5 text-center font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Passo
              </th>
              <th className="w-1/2 border-r border-border px-4 py-2.5 text-center font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Ação do ator
              </th>
              <th className="px-4 py-2.5 text-center font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Resposta do sistema (caixa-preta)
              </th>
            </tr>
          </thead>
          <tbody>
            {flow.steps.map((s) => (
              <tr key={s.step} className="border-t border-border align-top">
                <td className="border-r border-border px-3 py-4 text-center font-[family-name:var(--font-mono)] text-xs font-medium text-muted-foreground">
                  {s.step}
                </td>
                <td className="border-r border-border px-4 py-4 leading-relaxed text-foreground/90">{s.action}</td>
                <td className="px-4 py-4 leading-relaxed text-foreground/90">{s.response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
