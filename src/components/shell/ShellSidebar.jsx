// Ported from the Make shell (Sidebar.tsx). `docs` is [{ id, title }]; the
// switcher shows only when there's more than one. Spacing uses flex gap so the
// app's global `…{margin:0}` reset can't collapse it.
export default function ShellSidebar({ eyebrow, title, blurb, docs = [], activeId, onSelect }) {
  const showSwitcher = docs.length > 1

  return (
    <aside className="lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-80 lg:shrink-0 lg:overflow-y-auto">
      <div className="px-4 py-8 sm:px-6 lg:py-12 lg:pr-6 lg:pl-8">
        <div className="flex flex-col gap-2">
          <p className="font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-[0.16em] text-accent">
            {eyebrow}
          </p>
          <h2 className="font-[family-name:var(--font-heading)] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{blurb}</p>
        </div>

        {showSwitcher && (
          <nav className="mt-8">
            <div className="mb-3 font-[family-name:var(--font-eyebrow)] text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Documentos
            </div>
            <ul className="space-y-0.5">
              {docs.map((doc) => {
                const isActive = doc.id === activeId
                return (
                  <li key={doc.id}>
                    <button
                      onClick={() => onSelect(doc.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-accent/12 font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {doc.title}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}
      </div>
    </aside>
  )
}
