import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, Layers, Loader2 } from 'lucide-react'
import { Arc42Header, C, DocCallout, HeaderButton } from '../components/arc42/chrome'
import UseCaseDiagram from '../components/usecases/UseCaseDiagram'
import { fetchDevianteUseCases, toUseCaseView } from '../lib/useCases'

// "Casos de Uso" — UCs pulled live from portfolio.use_cases. Unlike the
// Documentação page, this one keeps the portfolio interaction (owner 25/08,
// restored 14/10): the use case diagram on top, then every UC stacked as a
// collapsible card, one open at a time. Visual is the site's dark palette.
// The open UC is in the URL (?uc=DV-UC3) so it can be linked; clicking an
// ellipse in the diagram opens its card.

const EASE = 'cubic-bezier(0.22,1,0.36,1)'
const TH = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.blue, background: 'rgba(77,143,192,0.08)', borderBottom: '1px solid rgba(77,143,192,0.18)', whiteSpace: 'nowrap' }
const TD = { padding: '9px 14px', color: C.body, verticalAlign: 'top', lineHeight: 1.55 }
const TABLE_WRAP = { overflowX: 'auto', margin: '12px 0 22px', borderRadius: 8, border: '1px solid rgba(77,143,192,0.14)' }
const P_STYLE = { color: C.body, lineHeight: 1.75, fontSize: 13, margin: '0 0 14px' }
const LABEL = { margin: '22px 0 0', fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: C.mono }

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

function UseCaseCard({ uc, index, total, open, onToggle }) {
  const [hoverBase, setHoverBase] = useState(null)
  const mainFlow = uc.flows.find((f) => f.label !== 'ALTERNATIVAS')?.steps ?? []
  const altFlow = uc.flows.find((f) => f.label === 'ALTERNATIVAS')?.steps ?? []

  return (
    <section
      id={uc.id}
      style={{ borderRadius: 8, border: `1px solid ${open ? 'rgba(77,143,192,0.35)' : 'rgba(77,143,192,0.14)'}`, background: C.bar, overflow: 'hidden', scrollMarginTop: 16, transition: 'border-color 0.15s' }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px', border: 'none', background: open ? 'rgba(77,143,192,0.07)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'rgba(77,143,192,0.04)' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: C.red, flexShrink: 0, minWidth: 52 }}>{uc.id}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: C.strong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uc.title}</span>
        <ChevronDown size={16} color={C.dim} style={{ flexShrink: 0, transition: `transform 380ms ${EASE}`, transform: open ? 'none' : 'rotate(-90deg)' }} aria-hidden />
        <span className="uc-progress" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4 }} aria-hidden>
          <span style={{ width: 96, height: 3, borderRadius: 2, background: 'rgba(77,143,192,0.12)', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${((index + 1) / total) * 100}%`, background: 'rgba(77,143,192,0.55)' }} />
          </span>
          <span style={{ fontFamily: C.mono, fontSize: 11, color: C.dim, fontVariantNumeric: 'tabular-nums' }}>{index + 1}/{total}</span>
        </span>
      </button>

      {/* grid-rows 0fr/1fr gives a smooth height animation */}
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: `grid-template-rows 320ms ${EASE}` }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: '4px 20px 22px', borderTop: `1px solid ${C.line}` }}>
            {uc.description && (
              <DocCallout title="Descrição">
                {uc.description.split(/\n{2,}/).map((para, i) => <p key={i} style={{ margin: '0 0 6px' }}>{para}</p>)}
              </DocCallout>
            )}

            <p style={LABEL}>Contexto</p>
            <div style={TABLE_WRAP}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {[['Ator', uc.actor], ['Objeto', uc.object], ['Pré-condição', uc.preCondition], ['Pós-condição', uc.postCondition]].map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid rgba(77,143,192,0.07)' }}>
                      <td style={{ ...TD, width: 140, whiteSpace: 'nowrap', color: C.strong }}>{k}</td>
                      <td style={TD}>{v || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={LABEL}>Caminho principal</p>
            <FlowTable steps={mainFlow} hoverBase={hoverBase} onHover={setHoverBase} />

            {altFlow.length > 0 && (
              <>
                <p style={LABEL}>Alternativas</p>
                <p style={{ ...P_STYLE, margin: '8px 0 0' }}>Cada alternativa parte do passo de mesmo número no caminho principal; passe o mouse sobre uma linha para ver a ligação.</p>
                <FlowTable steps={altFlow} hoverBase={hoverBase} onHover={setHoverBase} />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function UseCasesView() {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [params, setParams] = useSearchParams()

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
  const openId = params.get('uc')

  // A linked or diagram-picked UC scrolls into view once its card exists.
  const pendingScroll = useRef(Boolean(openId))
  useEffect(() => {
    if (!pendingScroll.current || status !== 'ready' || !openId) return
    pendingScroll.current = false
    requestAnimationFrame(() => document.getElementById(openId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [status, openId])

  function toggle(id) {
    setParams(openId === id ? {} : { uc: id }, { replace: true })
  }

  function openFromDiagram(id) {
    pendingScroll.current = true
    setParams({ uc: id }, { replace: true })
  }

  return (
    <div className="arc42-view" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', fontFamily: C.sans, background: C.page, overflow: 'hidden' }}>
      <Arc42Header title="Casos de Uso">
        <HeaderButton to="/documentacao"><Layers size={12} /> Documentação</HeaderButton>
        <HeaderButton to="/#entrar" accent>Entrar →</HeaderButton>
      </Arc42Header>

      <div className="doc-scroll" style={{ flex: 1, overflowY: 'auto', background: C.page }}>
        <main className="uc-page" style={{ maxWidth: 960, margin: '0 auto', padding: '48px 40px 80px' }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: C.mono }}>Cenários</p>
          <h1 style={{ fontFamily: C.sans, fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: '6px 0 8px', letterSpacing: '-0.02em' }}>Casos de Uso</h1>
          <p style={{ ...P_STYLE, margin: '0 0 28px' }}>Casos de uso no formato caixa-preta: ator, contexto e passos. Clique em um caso de uso no diagrama ou na lista para ver os detalhes.</p>

          {status === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.dim }}>
              <Loader2 size={14} className="animate-spin" /> Carregando…
            </div>
          )}
          {status === 'error' && <p style={{ ...P_STYLE, color: '#fca5a5' }}>Não foi possível carregar os casos de uso agora. Tente recarregar a página.</p>}
          {status === 'unconfigured' && <p style={P_STYLE}>Conexão com o banco não configurada neste ambiente.</p>}
          {status === 'empty' && <p style={P_STYLE}>Nenhum caso de uso público publicado ainda.</p>}

          {status === 'ready' && (
            <>
              <figure style={{ margin: '0 0 36px', padding: '18px 18px 12px', borderRadius: 8, border: '1px solid rgba(77,143,192,0.14)', background: C.page }}>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 560 }}>
                    <UseCaseDiagram useCases={useCases} activeId={openId} onSelect={openFromDiagram} />
                  </div>
                </div>
                <figcaption style={{ marginTop: 8, fontSize: 11, color: C.faint, fontFamily: C.mono, textAlign: 'center' }}>Diagrama de casos de uso do Deviante</figcaption>
              </figure>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {useCases.map((uc, i) => (
                  <UseCaseCard key={uc.id} uc={uc} index={i} total={useCases.length} open={openId === uc.id} onToggle={() => toggle(uc.id)} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
