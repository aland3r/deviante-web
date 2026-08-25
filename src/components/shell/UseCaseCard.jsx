import { ChevronDown } from 'lucide-react'

// Ported from the Figma Make shell, with interactions mirrored from the
// portfolio UC list (owner 25/08): one UC open at a time (controlled via
// `open`/`onToggle`), smooth height + chevron animation. Style stays Deviante's
// neutral shell. The mono labels are a single size (12px); the body/description
// text is a single size (16px), matching the documentation reading size. The
// description is a distinct-background box, set apart from the table.
const MONO = 'font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground'
const EASE = 'cubic-bezier(0.22,1,0.36,1)'

export default function UseCaseCard({ useCase, index, total, open, onToggle }) {
  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[var(--shadow-panel)]">
      {/* Header — the whole row toggles the card */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/40"
      >
        <span className="size-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/50" aria-hidden />
        <code className="shrink-0 font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.12em] text-muted-foreground">
          {useCase.id}
        </code>
        <span className="min-w-0 flex-1 truncate font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-foreground">
          {useCase.title}
        </span>

        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground"
          style={{ transition: `transform 380ms ${EASE}`, transform: open ? 'none' : 'rotate(-90deg)' }}
          aria-hidden
        />

        {total > 1 && (
          <span className="hidden items-center gap-3 pl-2 sm:flex" aria-hidden>
            <span className="h-1 w-28 overflow-hidden rounded-full bg-secondary">
              <span className="block h-full rounded-full bg-foreground/40" style={{ width: `${((index + 1) / total) * 100}%` }} />
            </span>
            <span className="font-[family-name:var(--font-mono)] text-xs font-medium tabular-nums text-muted-foreground">
              {index + 1}/{total}
            </span>
          </span>
        )}
      </button>

      {/* Collapsible body — grid-rows 0fr/1fr gives a smooth height animation */}
      <div
        className="grid"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', transition: `grid-template-rows 320ms ${EASE}` }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border">
            {/* Description — a distinct box, set apart from the table */}
            {useCase.description && (
              <div className="m-5 rounded-lg border border-border border-l-2 border-l-accent bg-secondary/50 p-4">
                <div className={`${MONO} mb-2`}>Descrição</div>
                <p className="text-base leading-relaxed text-foreground/85">{useCase.description}</p>
              </div>
            )}

            {/* Context */}
            <SectionBar label="Contexto" />
            <div className="grid grid-cols-1 border-t border-border sm:grid-cols-[auto_1fr_auto_1fr]">
              <Cell className={MONO}>Ator</Cell>
              <Cell className="text-base text-foreground/90">{useCase.actor || '—'}</Cell>
              <Cell className={MONO}>Objeto</Cell>
              <Cell className="text-base text-foreground/90">{useCase.object || '—'}</Cell>

              <Cell className={`${MONO} sm:col-span-1`}>Pré-condição</Cell>
              <Cell className="text-base text-foreground/90 sm:col-span-3">{useCase.preCondition || '—'}</Cell>

              <Cell className={`${MONO} sm:col-span-1`}>Pós-condição</Cell>
              <Cell className="text-base text-foreground/90 sm:col-span-3">{useCase.postCondition || '—'}</Cell>
            </div>

            {/* Flows */}
            {useCase.flows.map((flow, i) => (
              <Flow key={i} flow={flow} showBar={Boolean(flow.label) || useCase.flows.length > 1} />
            ))}
          </div>
        </div>
      </div>
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
        <table className="w-full border-collapse text-base">
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
