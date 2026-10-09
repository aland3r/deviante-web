import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Mermaid from '../components/shell/Mermaid'
import { Arc42Header, C, DocCallout, HeaderButton, NavItem } from '../components/arc42/chrome'
import { fetchDoc, DOCS_REPO } from '../lib/docs'

// Documentação — port fiel do "Arc42View" do Figma Make (05/10): barra de 52px,
// índice das 12 seções à esquerda, conteúdo da seção ativa no centro e o
// "Nesta página" fixo à direita. O conteúdo é o arc42.md real do deviante-docs
// (main), dividido nas seções `## N. Título` e subseções `### N.M`.

const ARC42_PATH = 'architecture/arc42.md'

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

// One line per arc42 section for the "Anterior / Próxima" cards, following
// the arc42 template's own section summaries.
const SECTION_BLURBS = {
  1: 'Requisitos, metas de qualidade e stakeholders',
  2: 'Restrições técnicas, organizacionais e convenções',
  3: 'Contexto de negócio e técnico, interfaces externas',
  4: 'Decisões fundamentais e estratégias de solução',
  5: 'Decomposição estática do sistema em blocos',
  6: 'Comportamento dos blocos em cenários de execução',
  7: 'Infraestrutura técnica e mapeamento dos blocos',
  8: 'Regras e soluções que valem para vários blocos',
  9: 'Decisões importantes, caras ou arriscadas',
  10: 'Árvore e cenários de qualidade',
  11: 'Riscos e dívidas técnicas conhecidos',
  12: 'Termos de domínio e técnicos',
}

function PagerCard({ section, direction, onClick }) {
  const next = direction === 'next'
  const base = {
    background: next ? 'rgba(77,143,192,0.08)' : C.bar,
    borderColor: next ? 'rgba(77,143,192,0.35)' : 'rgba(77,143,192,0.14)',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6, alignItems: next ? 'flex-end' : 'flex-start',
        textAlign: next ? 'right' : 'left', padding: '16px 18px', borderRadius: 8, cursor: 'pointer',
        border: `1px solid ${base.borderColor}`, background: base.background, transition: 'all 0.15s',
        gridColumn: next ? 2 : 1,
      }}
      onMouseEnter={(e) => { const b = e.currentTarget; b.style.borderColor = C.blue; b.style.background = 'rgba(77,143,192,0.12)' }}
      onMouseLeave={(e) => { const b = e.currentTarget; b.style.borderColor = base.borderColor; b.style.background = base.background }}
    >
      <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {next ? 'Próxima →' : '← Anterior'}
      </span>
      <span style={{ fontSize: 15, fontWeight: 600, color: C.strong }}>
        <span style={{ fontFamily: C.mono, fontSize: 12, color: C.red, marginRight: 8 }}>{section.num}</span>
        {section.title}
      </span>
      {SECTION_BLURBS[section.id] && <span style={{ fontSize: 13, color: C.body, lineHeight: 1.5 }}>{SECTION_BLURBS[section.id]}</span>}
    </button>
  )
}

export default function DocsView() {
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
  const index = sections.indexOf(section)
  const prev = index > 0 ? sections[index - 1] : null
  const next = index >= 0 && index < sections.length - 1 ? sections[index + 1] : null

  useEffect(() => {
    setActiveSubId(section?.sub[0]?.id ?? null)
  }, [section])

  function goToSection(id) {
    setActiveSection(id)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }

  // Scroll spy for "Nesta página": the last heading above the top third wins.
  function onScroll() {
    const root = contentRef.current
    if (!root || !section?.sub.length) return
    const limit = root.getBoundingClientRect().top + root.clientHeight / 3
    let current = section.sub[0].id
    root.querySelectorAll('[data-anchor]').forEach((el) => {
      if (el.getBoundingClientRect().top <= limit) current = el.dataset.anchor
    })
    setActiveSubId(current)
  }

  function scrollToSub(subId) {
    setActiveSubId(subId)
    contentRef.current?.querySelector(`[data-anchor="${subId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="arc42-view" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', fontFamily: C.sans, background: C.page, overflow: 'hidden' }}>
      {/* Header */}
      <Arc42Header title="Documentação Arc42">
        <HeaderButton to="/casos-de-uso"><BookOpen size={12} /> Casos de Uso</HeaderButton>
        <HeaderButton to="/#entrar" accent>Entrar →</HeaderButton>
      </Arc42Header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left nav */}
        <nav className="doc-scroll arc42-nav" style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${C.line}`, background: C.bar, overflowY: 'auto', padding: '18px 0 24px' }}>
          {sections.map((s) => (
            <NavItem key={s.id} num={s.num} label={s.title} active={section?.id === s.id} onClick={() => goToSection(s.id)} />
          ))}
        </nav>

        {/* Content + sticky right TOC inside */}
        <div ref={contentRef} onScroll={onScroll} className="doc-scroll" style={{ flex: 1, overflowY: 'auto', background: C.page }}>
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
                  {(prev || next) && (
                    <nav aria-label="Navegação entre seções" className="arc42-pager" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 48, paddingTop: 28, borderTop: `1px solid ${C.line}` }}>
                      {prev && <PagerCard section={prev} direction="prev" onClick={() => goToSection(prev.id)} />}
                      {next && <PagerCard section={next} direction="next" onClick={() => goToSection(next.id)} />}
                    </nav>
                  )}
                </div>
              )}
            </div>

            {/* Sticky right TOC — "Nesta página" */}
            {/* Rendered even when empty so every section keeps the same text width. */}
            <div className="arc42-toc" style={{ width: 160, flexShrink: 0, position: 'sticky', top: 52 }}>
            {section?.sub.length > 0 && (
              <>
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
              </>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
