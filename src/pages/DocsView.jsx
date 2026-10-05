import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Mermaid from '../components/shell/Mermaid'
import { fetchDoc, DOCS_REPO } from '../lib/docs'

// Documentação — port fiel do "Arc42View" do Figma Make (05/10): barra de 52px,
// índice das 12 seções à esquerda, conteúdo da seção ativa no centro e o
// "Nesta página" fixo à direita. O conteúdo é o arc42.md real do deviante-docs
// (main), dividido nas seções `## N. Título` e subseções `### N.M`.

const ARC42_PATH = 'architecture/arc42.md'

const C = {
  page: '#111318',
  bar: '#0d0f14',
  line: 'rgba(77,143,192,0.10)',
  blue: '#4d8fc0',
  red: '#dc2626',
  strong: '#c8dff0',
  body: '#7a93b0',
  dim: '#475569',
  faint: '#334155',
  mono: "'JetBrains Mono',monospace",
  sans: "'Inter',sans-serif",
}

function DevianteLogo({ size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="3" cy="7" r="2" fill="white" />
        <circle cx="11" cy="3" r="2" fill="white" opacity="0.7" />
        <circle cx="11" cy="11" r="2" fill="white" opacity="0.7" />
        <line x1="5" y1="6.2" x2="9" y2="3.8" stroke="white" strokeWidth="1.2" opacity="0.8" />
        <line x1="5" y1="7.8" x2="9" y2="10.2" stroke="white" strokeWidth="1.2" opacity="0.5" />
      </svg>
    </div>
  )
}

function textOf(node) {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (typeof node === 'object' && 'props' in node) return textOf(node.props?.children)
  return ''
}

/** Splits the arc42 markdown into its intro and the `## N. Título` sections. */
function parseArc42(markdown) {
  const lines = (markdown ?? '').split('\n')
  const sections = []
  const intro = []
  let current = null
  let inFence = false

  for (const line of lines) {
    if (/^\s*```/.test(line)) inFence = !inFence
    const h2 = !inFence && /^##\s+(\d+)\.\s+(.*)$/.exec(line)
    if (h2) {
      current = { id: h2[1], num: h2[1].padStart(2, '0'), title: h2[2].trim(), lines: [], sub: [] }
      sections.push(current)
      continue
    }
    const h3 = !inFence && current && /^###\s+(\d+\.\d+)\s+(.*)$/.exec(line)
    if (h3) current.sub.push({ id: h3[1], title: h3[2].replace(/[`*]/g, '').trim() })
    if (current) current.lines.push(line)
    else if (!/^#\s/.test(line)) intro.push(line)
  }

  return {
    intro: intro.join('\n').replace(/^\s*---\s*$/gm, '').trim(),
    sections: sections.map((s) => ({ ...s, body: s.lines.join('\n').trim() })),
  }
}

function DocCallout({ title, children }) {
  return (
    <div style={{ padding: '13px 16px 13px 18px', borderRadius: 7, background: 'rgba(77,143,192,0.07)', borderLeft: `3px solid ${C.blue}`, margin: '18px 0', lineHeight: 1.65 }}>
      {title && <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</p>}
      <div style={{ fontSize: 13, color: C.body }}>{children}</div>
    </div>
  )
}

const P_STYLE = { color: C.body, lineHeight: 1.75, fontSize: 13, margin: '0 0 14px' }

// Markdown → the Figma doc helpers (DocH2, DocTable, DocCallout, DocPill).
const MD_COMPONENTS = {
  h3: ({ children }) => {
    const id = /^(\d+\.\d+)/.exec(textOf(children))?.[1]
    return (
      <h2 data-anchor={id} style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 700, color: C.strong, margin: '48px 0 14px', letterSpacing: '-0.01em', paddingTop: 20, borderTop: '1px solid rgba(77,143,192,0.12)', scrollMarginTop: 24 }}>
        {children}
      </h2>
    )
  },
  h4: ({ children }) => (
    <h3 style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 700, color: C.strong, margin: '28px 0 10px' }}>{children}</h3>
  ),
  p: ({ children }) => <p style={P_STYLE}>{children}</p>,
  strong: ({ children }) => <strong style={{ color: C.strong }}>{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" style={{ color: C.blue, textDecoration: 'underline', textUnderlineOffset: 3 }}>
      {children}
    </a>
  ),
  ul: ({ children }) => <ul style={{ ...P_STYLE, paddingLeft: 20, listStyle: 'disc' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ ...P_STYLE, paddingLeft: 20, listStyle: 'decimal' }}>{children}</ol>,
  li: ({ children }) => <li style={{ margin: '4px 0' }}>{children}</li>,
  blockquote: ({ children }) => <DocCallout>{children}</DocCallout>,
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '18px 0', borderRadius: 8, border: '1px solid rgba(77,143,192,0.14)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.blue, background: 'rgba(77,143,192,0.08)', borderBottom: '1px solid rgba(77,143,192,0.18)', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  ),
  tr: ({ children }) => <tr style={{ borderBottom: '1px solid rgba(77,143,192,0.07)' }}>{children}</tr>,
  td: ({ children }) => (
    <td style={{ padding: '9px 14px', color: C.body, verticalAlign: 'top', lineHeight: 1.55 }}>{children}</td>
  ),
  code: ({ className, children }) => {
    const lang = /language-(\w+)/.exec(className ?? '')?.[1]
    const raw = String(children).replace(/\n$/, '')
    if (lang === 'mermaid') return <Mermaid code={raw} />
    if (lang) return <code style={{ display: 'block', whiteSpace: 'pre', fontFamily: C.mono, fontSize: 12, color: C.strong, lineHeight: 1.6 }}>{children}</code>
    return (
      <code style={{ fontFamily: C.mono, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'rgba(77,143,192,0.10)', border: '1px solid rgba(77,143,192,0.18)', color: C.strong }}>
        {children}
      </code>
    )
  },
  pre: ({ children }) => {
    const child = Array.isArray(children) ? children[0] : children
    if (/language-mermaid/.test(child?.props?.className ?? '')) return <>{children}</>
    return <pre style={{ overflowX: 'auto', margin: '18px 0', padding: '14px 16px', borderRadius: 8, background: C.bar, border: '1px solid rgba(77,143,192,0.14)' }}>{children}</pre>
  },
  hr: () => null,
  img: ({ src, alt }) => (
    <img src={src} alt={alt ?? ''} style={{ display: 'block', maxWidth: '100%', margin: '18px auto', borderRadius: 8 }} />
  ),
}

function HeaderButton({ to, children, accent = false }) {
  const base = accent
    ? { border: '1px solid rgba(220,38,38,0.35)', background: 'rgba(220,38,38,0.08)', color: '#fca5a5' }
    : { border: '1px solid rgba(77,143,192,0.18)', background: 'rgba(77,143,192,0.08)', color: '#94a3b8' }
  return (
    <Link
      to={to}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', textDecoration: 'none', transition: 'all 0.15s', ...base }}
      onMouseEnter={(e) => { const b = e.currentTarget; b.style.background = accent ? 'rgba(220,38,38,0.18)' : 'rgba(77,143,192,0.18)'; b.style.color = accent ? '#fff' : C.strong }}
      onMouseLeave={(e) => { const b = e.currentTarget; b.style.background = base.background; b.style.color = base.color }}
    >
      {children}
    </Link>
  )
}

export default function DocsView() {
  const navigate = useNavigate()
  const [markdown, setMarkdown] = useState('')
  const [status, setStatus] = useState('loading')
  const [activeSection, setActiveSection] = useState('1')
  const [activeSubId, setActiveSubId] = useState(null)
  const contentRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetchDoc(ARC42_PATH)
      .then((text) => { if (!cancelled) { setMarkdown(text); setStatus('ready') } })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [])

  const { intro, sections } = useMemo(() => parseArc42(markdown), [markdown])
  const section = sections.find((s) => s.id === activeSection) ?? sections[0]

  useEffect(() => {
    setActiveSubId(section?.sub[0]?.id ?? null)
  }, [section])

  function goToSection(id) {
    setActiveSection(id)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }

  function scrollToSub(subId) {
    setActiveSubId(subId)
    contentRef.current?.querySelector(`[data-anchor="${subId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="arc42-view" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', fontFamily: C.sans, background: C.page, overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderBottom: `1px solid ${C.line}`, background: C.bar }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(77,143,192,0.08)', color: '#94a3b8', cursor: 'pointer', fontSize: 11, transition: 'all 0.15s' }}
          onMouseEnter={(e) => { const b = e.currentTarget; b.style.background = 'rgba(77,143,192,0.18)'; b.style.color = C.strong }}
          onMouseLeave={(e) => { const b = e.currentTarget; b.style.background = 'rgba(77,143,192,0.08)'; b.style.color = '#94a3b8' }}
        >
          <ArrowLeft size={11} /> Voltar
        </button>
        <div style={{ width: 1, height: 20, background: 'rgba(77,143,192,0.15)' }} />
        <DevianteLogo size={22} />
        <span className="arc42-crumb" style={{ fontSize: 13, color: '#64748b' }}>Deviante</span>
        <span className="arc42-crumb" style={{ fontSize: 13, color: 'rgba(77,143,192,0.30)' }}>›</span>
        <span className="arc42-crumb" style={{ fontSize: 13, fontWeight: 600, color: C.strong, whiteSpace: 'nowrap' }}>Documentação Arc42</span>
        <div style={{ flex: 1 }} />
        <HeaderButton to="/casos-de-uso"><BookOpen size={12} /> Casos de Uso</HeaderButton>
        <HeaderButton to="/#entrar" accent>Entrar →</HeaderButton>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left nav */}
        <nav className="doc-scroll arc42-nav" style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${C.line}`, background: C.bar, overflowY: 'auto', padding: '18px 0 24px' }}>
          {sections.map((s) => {
            const isActive = section?.id === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goToSection(s.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 18px', textAlign: 'left', border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(77,143,192,0.09)' : 'transparent',
                  borderLeft: `2px solid ${isActive ? C.blue : 'transparent'}`,
                  color: isActive ? C.strong : C.dim,
                  fontSize: 13, fontWeight: isActive ? 500 : 400, transition: 'all 0.14s',
                }}
                onMouseEnter={(e) => { if (!isActive) { const b = e.currentTarget; b.style.color = C.body; b.style.background = 'rgba(77,143,192,0.04)' } }}
                onMouseLeave={(e) => { if (!isActive) { const b = e.currentTarget; b.style.color = C.dim; b.style.background = 'transparent' } }}
              >
                <span style={{ fontFamily: C.mono, fontSize: 11, color: isActive ? C.red : C.dim, flexShrink: 0, minWidth: 22, fontWeight: isActive ? 700 : 400 }}>{s.num}</span>
                {s.title}
              </button>
            )
          })}
        </nav>

        {/* Content + sticky right TOC inside */}
        <div ref={contentRef} className="doc-scroll" style={{ flex: 1, overflowY: 'auto', background: C.page }}>
          <div className="arc42-content" style={{ maxWidth: 960, margin: '0 auto', padding: '52px 40px 80px', display: 'flex', gap: 52, alignItems: 'flex-start' }}>
            {/* Main text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {status === 'loading' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.dim }}>
                  <Loader2 size={14} className="animate-spin" /> Carregando…
                </div>
              )}
              {status === 'error' && (
                <p style={{ ...P_STYLE, color: '#fca5a5' }}>
                  Não foi possível carregar a documentação agora. Ela vive em{' '}
                  <a href={`https://github.com/${DOCS_REPO}`} target="_blank" rel="noreferrer" style={{ color: C.blue }}>github.com/{DOCS_REPO}</a>.
                </p>
              )}
              {status === 'ready' && section && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 11, color: C.red, fontWeight: 700 }}>{section.num}</span>
                    <div style={{ height: 1, flex: 1, background: 'rgba(220,38,38,0.25)' }} />
                  </div>
                  <h1 style={{ fontFamily: C.sans, fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{section.title}</h1>
                  <p style={{ fontSize: 11, color: C.faint, fontFamily: C.mono, margin: '0 0 32px' }}>
                    arc42 · seção {section.num} de {String(sections.length).padStart(2, '0')}
                  </p>
                  {section.id === '1' && intro && (
                    <DocCallout title="Sobre esta documentação">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ...MD_COMPONENTS, p: ({ children }) => <p style={{ margin: '0 0 6px' }}>{children}</p> }}>
                        {intro}
                      </ReactMarkdown>
                    </DocCallout>
                  )}
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                    {section.body}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Sticky right TOC — "Nesta página" */}
            {section?.sub.length > 0 && (
              <div className="arc42-toc" style={{ width: 160, flexShrink: 0, position: 'sticky', top: 52 }}>
                <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: C.mono }}>
                  Nesta página
                </p>
                {section.sub.map((sub) => {
                  const isSubActive = activeSubId === sub.id
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => scrollToSub(sub.id)}
                      style={{
                        width: '100%', display: 'block', padding: '5px 0 5px 10px',
                        textAlign: 'left', border: 'none', cursor: 'pointer', background: 'transparent',
                        color: isSubActive ? C.blue : C.faint,
                        fontSize: 13, fontWeight: isSubActive ? 500 : 400,
                        borderLeft: `2px solid ${isSubActive ? C.blue : 'rgba(77,143,192,0.12)'}`,
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={(e) => { if (!isSubActive) e.currentTarget.style.color = '#64748b' }}
                      onMouseLeave={(e) => { if (!isSubActive) e.currentTarget.style.color = C.faint }}
                    >
                      {sub.title}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
