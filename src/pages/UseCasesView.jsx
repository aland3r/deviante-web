import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layers, Loader2, Search } from 'lucide-react'
import { Arc42Header, C, DocCallout, HeaderButton, NavItem } from '../components/arc42/chrome'
import { fetchDevianteUseCases, toUseCaseView } from '../lib/useCases'

// "Casos de Uso" — UCs pulled live from portfolio.use_cases, laid out exactly
// like the Documentação page (Figma Arc42View): UC list on the left, the
// selected UC in the middle, "Nesta página" on the right. The selected UC is
// in the URL (?uc=DV-UC3) so it can be linked; ←/→ step through the list.

const TH = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.blue, background: 'rgba(77,143,192,0.08)', borderBottom: '1px solid rgba(77,143,192,0.18)', whiteSpace: 'nowrap' }
const TD = { padding: '9px 14px', color: C.body, verticalAlign: 'top', lineHeight: 1.55 }
const TABLE_WRAP = { overflowX: 'auto', margin: '18px 0', borderRadius: 8, border: '1px solid rgba(77,143,192,0.14)' }
const P_STYLE = { color: C.body, lineHeight: 1.75, fontSize: 13, margin: '0 0 14px' }

function H2({ anchor, children }) {
  return (
    <h2 data-anchor={anchor} style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 700, color: C.strong, margin: '48px 0 14px', letterSpacing: '-0.01em', paddingTop: 20, borderTop: '1px solid rgba(77,143,192,0.12)', scrollMarginTop: 24 }}>
      {children}
    </h2>
  )
}

// "2a" → "2": an alternative step branches off the main step with that number.
const baseStep = (key) => String(key ?? '').replace(/[a-z]+$/i, '')

function FlowTable({ steps, hoverBase, onHover }) {
  return (
    <div style={TABLE_WRAP}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: 64 }}>Passo</th>
            <th style={TH}>Ação do ator</th>
            <th style={TH}>Resposta do sistema</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => {
            const linked = hoverBase != null && baseStep(s.step) === hoverBase
            return (
              <tr
                key={s.step}
                onMouseEnter={() => onHover(baseStep(s.step))}
                onMouseLeave={() => onHover(null)}
                style={{ borderBottom: '1px solid rgba(77,143,192,0.07)', background: linked ? 'rgba(77,143,192,0.08)' : 'transparent', transition: 'background 0.12s' }}
              >
                <td style={{ ...TD, fontFamily: C.mono, fontSize: 11, color: linked ? C.red : C.strong, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.step}</td>
                <td style={TD}>{s.action || '—'}</td>
                <td style={TD}>{s.response || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PagerCard({ uc, direction, onClick }) {
  const next = direction === 'next'
  const base = { background: next ? 'rgba(77,143,192,0.08)' : C.bar, borderColor: next ? 'rgba(77,143,192,0.35)' : 'rgba(77,143,192,0.14)' }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: next ? 'flex-end' : 'flex-start', textAlign: next ? 'right' : 'left', padding: '16px 18px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${base.borderColor}`, background: base.background, transition: 'all 0.15s', gridColumn: next ? 2 : 1 }}
      onMouseEnter={(e) => { const b = e.currentTarget; b.style.borderColor = C.blue; b.style.background = 'rgba(77,143,192,0.12)' }}
      onMouseLeave={(e) => { const b = e.currentTarget; b.style.borderColor = base.borderColor; b.style.background = base.background }}
    >
      <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {next ? 'Próximo →' : '← Anterior'}
      </span>
      <span style={{ fontSize: 15, fontWeight: 600, color: C.strong }}>
        <span style={{ fontFamily: C.mono, fontSize: 12, color: C.red, marginRight: 8 }}>{uc.id}</span>
        {uc.title}
      </span>
      {uc.object && <span style={{ fontSize: 13, color: C.body, lineHeight: 1.5 }}>Objeto: {uc.object}</span>}
    </button>
  )
}

export default function UseCasesView() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [query, setQuery] = useState('')
  const [activeSubId, setActiveSubId] = useState('descricao')
  const [hoverBase, setHoverBase] = useState(null)
  const [params, setParams] = useSearchParams()
  const contentRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetchDevianteUseCases('pt')
      .then(({ status: s, useCases }) => {
        if (cancelled) return
        if (s === 'unconfigured') { setStatus('unconfigured'); return }
        setRows(useCases)
        setStatus(useCases.length ? 'ready' : 'empty')
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [])

  const useCases = useMemo(() => rows.map(toUseCaseView), [rows])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return useCases
    return useCases.filter((u) => `${u.id} ${u.title} ${u.object ?? ''}`.toLowerCase().includes(q))
  }, [useCases, query])

  const selectedId = params.get('uc')
  const uc = useCases.find((u) => u.id === selectedId) ?? useCases[0]
  const index = useCases.indexOf(uc)
  const prev = index > 0 ? useCases[index - 1] : null
  const next = index >= 0 && index < useCases.length - 1 ? useCases[index + 1] : null

  const mainFlow = uc?.flows.find((f) => f.label !== 'ALTERNATIVAS')?.steps ?? []
  const altFlow = uc?.flows.find((f) => f.label === 'ALTERNATIVAS')?.steps ?? []
  const toc = [
    { id: 'descricao', title: 'Descrição' },
    { id: 'contexto', title: 'Contexto' },
    { id: 'principal', title: 'Caminho principal' },
    ...(altFlow.length ? [{ id: 'alternativas', title: 'Alternativas' }] : []),
  ]

  const goTo = useCallback((id) => {
    setParams(id ? { uc: id } : {}, { replace: false })
    setActiveSubId('descricao')
    setHoverBase(null)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [setParams])

  // ←/→ walk through the UCs, unless the user is typing in the filter.
  useEffect(() => {
    function onKey(e) {
      if (e.target.closest?.('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight' && next) goTo(next.id)
      if (e.key === 'ArrowLeft' && prev) goTo(prev.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, goTo])

  // Scroll spy for "Nesta página": the last heading above the top third wins.
  function onScroll() {
    const root = contentRef.current
    if (!root) return
    const limit = root.getBoundingClientRect().top + root.clientHeight / 3
    let current = 'descricao'
    root.querySelectorAll('[data-anchor]').forEach((el) => {
      if (el.getBoundingClientRect().top <= limit) current = el.dataset.anchor
    })
    setActiveSubId(current)
  }

  function scrollToSub(id) {
    setActiveSubId(id)
    contentRef.current?.querySelector(`[data-anchor="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="arc42-view" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', fontFamily: C.sans, background: C.page, overflow: 'hidden' }}>
      <Arc42Header title="Casos de Uso">
        <HeaderButton to="/documentacao"><Layers size={12} /> Documentação</HeaderButton>
        <HeaderButton to="/#entrar" accent>Entrar →</HeaderButton>
      </Arc42Header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <nav className="doc-scroll arc42-nav" style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${C.line}`, background: C.bar, overflowY: 'auto', padding: '18px 0 24px' }}>
          <p className="uc-nav-label" style={{ margin: '0 18px 10px', fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: C.mono }}>
            Casos de uso
          </p>
          {useCases.length > 4 && (
            <label className="uc-filter" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 14px 10px', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(77,143,192,0.14)', background: C.page }}>
              <Search size={12} color={C.dim} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar…"
                aria-label="Filtrar casos de uso"
                style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: C.strong, fontSize: 13, fontFamily: C.sans }}
              />
            </label>
          )}
          {filtered.map((u) => (
            <NavItem key={u.id} num={u.id.replace(/^DV-UC/, 'UC')} label={u.title} active={uc?.id === u.id} onClick={() => goTo(u.id)} />
          ))}
          {status === 'ready' && filtered.length === 0 && (
            <p style={{ margin: '6px 18px', fontSize: 13, color: C.dim }}>Nenhum resultado.</p>
          )}
        </nav>

        <div ref={contentRef} onScroll={onScroll} className="doc-scroll" style={{ flex: 1, overflowY: 'auto', background: C.page }}>
          <div className="arc42-content" style={{ maxWidth: 960, margin: '0 auto', padding: '52px 40px 80px', display: 'flex', gap: 52, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {status === 'loading' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.dim }}>
                  <Loader2 size={14} className="animate-spin" /> Carregando…
                </div>
              )}
              {status === 'error' && <p style={{ ...P_STYLE, color: '#fca5a5' }}>Não foi possível carregar os casos de uso agora. Tente recarregar a página.</p>}
              {status === 'unconfigured' && <p style={P_STYLE}>Conexão com o banco não configurada neste ambiente.</p>}
              {status === 'empty' && <p style={P_STYLE}>Nenhum caso de uso público publicado ainda.</p>}

              {status === 'ready' && uc && (
                <div key={uc.id} className="uc-enter">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 11, color: C.red, fontWeight: 700 }}>{uc.id}</span>
                    <div style={{ height: 1, flex: 1, background: 'rgba(220,38,38,0.25)' }} />
                  </div>
                  <h1 style={{ fontFamily: C.sans, fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{uc.title}</h1>
                  <p style={{ fontSize: 11, color: C.faint, fontFamily: C.mono, margin: '0 0 32px' }}>
                    caso de uso · {String(index + 1).padStart(2, '0')} de {String(useCases.length).padStart(2, '0')} · caixa-preta
                  </p>

                  <div data-anchor="descricao">
                    <DocCallout title="Descrição">
                      {uc.description.split(/\n{2,}/).map((para, i) => <p key={i} style={{ margin: '0 0 6px' }}>{para}</p>)}
                    </DocCallout>
                  </div>

                  <H2 anchor="contexto">Contexto</H2>
                  <div style={TABLE_WRAP}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <tbody>
                        {[['Ator', uc.actor], ['Objeto', uc.object], ['Pré-condição', uc.preCondition], ['Pós-condição', uc.postCondition]].map(([k, v]) => (
                          <tr key={k} style={{ borderBottom: '1px solid rgba(77,143,192,0.07)' }}>
                            <td style={{ ...TD, width: 140, whiteSpace: 'nowrap' }}>{k}</td>
                            <td style={TD}>{v || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <H2 anchor="principal">Caminho principal</H2>
                  <FlowTable steps={mainFlow} hoverBase={hoverBase} onHover={setHoverBase} />

                  {altFlow.length > 0 && (
                    <>
                      <H2 anchor="alternativas">Alternativas</H2>
                      <p style={P_STYLE}>Cada alternativa parte do passo de mesmo número no caminho principal; passe o mouse sobre uma linha para ver a ligação.</p>
                      <FlowTable steps={altFlow} hoverBase={hoverBase} onHover={setHoverBase} />
                    </>
                  )}

                  {(prev || next) && (
                    <nav aria-label="Navegação entre casos de uso" className="arc42-pager" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 48, paddingTop: 28, borderTop: `1px solid ${C.line}` }}>
                      {prev && <PagerCard uc={prev} direction="prev" onClick={() => goTo(prev.id)} />}
                      {next && <PagerCard uc={next} direction="next" onClick={() => goTo(next.id)} />}
                    </nav>
                  )}
                  <p style={{ marginTop: 18, fontSize: 11, color: C.faint, fontFamily: C.mono, textAlign: 'center' }}>← → para navegar entre casos de uso</p>
                </div>
              )}
            </div>

            <div className="arc42-toc" style={{ width: 160, flexShrink: 0, position: 'sticky', top: 52 }}>
              {status === 'ready' && uc && (
                <>
                  <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: C.mono }}>Nesta página</p>
                  {toc.map((t) => {
                    const on = activeSubId === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => scrollToSub(t.id)}
                        style={{ width: '100%', display: 'block', padding: '5px 0 5px 10px', textAlign: 'left', border: 'none', cursor: 'pointer', background: 'transparent', color: on ? C.blue : C.faint, fontSize: 13, fontWeight: on ? 500 : 400, borderLeft: `2px solid ${on ? C.blue : 'rgba(77,143,192,0.12)'}`, transition: 'all 0.12s' }}
                        onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = '#64748b' }}
                        onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = C.faint }}
                      >
                        {t.title}
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
