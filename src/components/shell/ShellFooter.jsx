import { Github } from 'lucide-react'

// Ported from the Make shell (Footer.tsx).
export default function ShellFooter({ repoUrl, note }) {
  return (
    <footer className="mt-20 border-t border-border">
      <div className="flex flex-col items-start justify-between gap-4 px-1 py-8 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          {note ?? 'Deviante — suporte à decisão em manutenção industrial.'}
        </p>
        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="size-4" />
            Repositório de docs
          </a>
        )}
      </div>
    </footer>
  )
}
