import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { siteTabs } from '../../lib/docs'

// Ported from the Make shell (Header.tsx). Adapted to react-router: tabs are
// Links to the routes; back returns to the landing. Light-only, so the Make's
// theme toggle is dropped. `activeSlug` is null on the landing.
export default function ShellHeader({ activeSlug = null }) {
  const navigate = useNavigate()
  const onLanding = !activeSlug

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Left: back + product name */}
        <div className="flex min-w-0 items-center gap-3">
          {onLanding ? (
            <span className="size-2.5 rounded-full bg-accent" aria-hidden />
          ) : (
            <Link
              to="/"
              aria-label="Voltar para a landing"
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </Link>
          )}
          <span className="truncate font-[family-name:var(--font-heading)] text-[0.95rem] font-semibold tracking-tight text-foreground">
            Deviante
          </span>
        </div>

        {/* Tab pills — same place in every view */}
        <nav className="hidden items-center gap-2 md:flex">
          {siteTabs.map((t) => {
            const isActive = t.slug === activeSlug
            return (
              <Link
                key={t.slug}
                to={`/${t.slug}`}
                aria-current={isActive ? 'page' : undefined}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent/15 text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>

        {/* Right: enter app */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigate('/login')}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Entrar no app
          </button>
        </div>
      </div>

      {/* Mobile tab pills */}
      <nav className="flex items-center gap-3 overflow-x-auto border-t border-border bg-background/60 px-4 py-2 md:hidden">
        {siteTabs.map((t) => {
          const isActive = t.slug === activeSlug
          return (
            <Link
              key={t.slug}
              to={`/${t.slug}`}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent/15 text-foreground' : 'text-muted-foreground'
              }`}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
