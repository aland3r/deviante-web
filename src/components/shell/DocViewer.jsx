import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { slugify } from '../../lib/shell-headings'
import Mermaid from './Mermaid'

// Ported from the Make shell (DocViewer.tsx). Renders a markdown `body` string;
// `figures` optionally resolves `![alt](fig:key)` to imported assets. Heading
// ids mirror extractHeadings() so the Toc anchors line up. Light-only.
function textOf(node) {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (typeof node === 'object' && 'props' in node) return textOf(node.props?.children)
  return ''
}

export default function DocViewer({ body, figures }) {
  const seen = new Map()
  function headingId(children) {
    let id = slugify(textOf(children))
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    return n > 0 ? `${id}-${n}` : id
  }

  return (
    <article className="doc-prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 id={headingId(children)} className="font-[family-name:var(--font-display)] text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 id={headingId(children)} className="font-[family-name:var(--font-heading)] text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 id={headingId(children)} className="font-[family-name:var(--font-heading)] text-foreground">
              {children}
            </h3>
          ),
          p: ({ node, children }) => {
            const kids = node?.children
            if (kids?.length === 1 && kids[0]?.tagName === 'img') return <>{children}</>
            return <p className="text-foreground/85">{children}</p>
          },
          img: ({ src, alt }) => {
            const key = typeof src === 'string' && src.startsWith('fig:') ? src.slice(4) : null
            const resolved = key ? figures?.[key] : src
            if (!resolved) return null
            return (
              <figure className="my-8 overflow-hidden rounded-[var(--radius)] border border-border bg-card p-4 sm:p-6">
                <img src={resolved} alt={alt ?? ''} className="mx-auto h-auto w-full max-w-3xl object-contain" />
                {alt && <figcaption className="mt-3 text-center text-sm text-muted-foreground">{alt}</figcaption>}
              </figure>
            )
          },
          a: ({ children, href }) => (
            <a
              href={href}
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noreferrer' : undefined}
              className="font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          table: ({ children }) => (
            <div className="mt-7 overflow-x-auto rounded-[var(--radius)] border border-border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-border px-4 py-3 text-left font-[family-name:var(--font-eyebrow)] text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-4 py-3 align-top text-foreground/85 [tr:last-child_&]:border-b-0">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-2 border-accent/50 pl-5 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className ?? '')
            const lang = match?.[1]
            const raw = String(children).replace(/\n$/, '')
            if (lang === 'mermaid') return <Mermaid code={raw} />
            if (lang) {
              return <code className="block whitespace-pre font-mono text-sm leading-relaxed text-foreground/90">{children}</code>
            }
            return (
              <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
                {children}
              </code>
            )
          },
          pre: ({ children }) => {
            const child = Array.isArray(children) ? children[0] : children
            const cls = child?.props?.className ?? ''
            if (/language-mermaid/.test(cls)) return <>{children}</>
            return <pre className="mt-6 overflow-x-auto rounded-[var(--radius)] border border-border bg-muted p-5">{children}</pre>
          },
          hr: () => <hr className="my-10 border-border" />,
        }}
      >
        {body}
      </ReactMarkdown>
    </article>
  )
}
