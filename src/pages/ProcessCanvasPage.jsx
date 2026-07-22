import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, AlignCenter, Activity, Wrench, FileText } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import ProcessGraphTab from '../components/process-graph/ProcessGraphTab'
import ProcessDetailsTab from '../components/process-graph/ProcessDetailsTab'
import { TOTAL_CASES } from '../components/process-graph/graph-core'

/*
  The process screen — what you land on after clicking a project on the
  dashboard, and immediately after creating one.

  Ported from the Figma Make export "Process Mining Canvas Design"
  Version 20 (`ZZKdwxgmeCNJFG64zGbADe`), which models the whole open-project
  experience as ONE screen with tabs, not as a form page that links to a
  graph page. That's why this replaces both the old ProcessDetailPage
  (`/processes/:id`, metadata form) and ProcessMiningPreviewPage
  (`/processes/:id/mining`): the form is now the "Processos" tab.

  Deliberately mounted OUTSIDE AppLayout: the export's canvas header (logo,
  ← Projetos, title, tabs, log upload) replaces the app shell entirely once
  a project is open. AppLayout's own header still owns /dashboard and
  /account.

  Real vs. simulated: process name/company/description/sector and delete are
  the real Kotlin-backed API. The graph itself is seed data — no route
  derives a graph from an event log yet (UC4/UC5). The "simulado" pill in
  the header says so rather than passing 856 fake cases off as this
  process's own.
*/

const TAB_ITEMS = [
  { id: 'grafo', label: 'Grafo do Processo', icon: <Activity size={12} /> },
  // UC16 (máquinas + modelo 3D) hasn't been through uc-scaffolder/esteira yet
  // — the tab is shown because the design has it, disabled because it has
  // no spec, no schema and no backend.
  { id: 'maquinas', label: 'Máquinas', icon: <Wrench size={12} />, disabled: true, hint: 'Máquinas — em breve (UC16, ainda sem especificação)' },
  { id: 'processos', label: 'Processos', icon: <FileText size={12} /> },
]

export default function ProcessCanvasPage() {
  const { processId } = useParams()
  const navigate = useNavigate()

  const [process, setProcess] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [activeTab, setActiveTab] = useState('grafo')
  const [layout, setLayout] = useState('vertical')
  const [isMobile, setIsMobile] = useState(false)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [titleError, setTitleError] = useState('')
  const titleInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.getProcess(processId)
      .then((data) => { if (!cancelled) { setProcess(data); setTitleDraft(data.name ?? '') } })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar este processo.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [processId])

  useEffect(() => {
    const mq = window.matchMedia('(max-width:1023px)')
    const upd = () => setIsMobile(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [])

  useEffect(() => { if (editingTitle) titleInputRef.current?.select() }, [editingTitle])

  async function commitTitle() {
    setEditingTitle(false)
    const name = titleDraft.trim()
    if (!name || name === process.name) { setTitleDraft(process.name ?? ''); return }

    try {
      const updated = await api.updateProcess(processId, {
        name,
        companyName: process.companyName ?? '',
        description: process.description ?? '',
        sector: process.sector ?? '',
      })
      setProcess(updated)
      setTitleDraft(updated.name ?? '')
      setTitleError('')
    } catch (err) {
      // A brand-new process has no company yet, and the API requires one —
      // send the user to the tab that can actually fix it.
      setTitleDraft(process.name ?? '')
      setTitleError(err instanceof ApiError ? err.message : 'Não foi possível renomear o processo.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh', background: '#0d1017' }}>
        <p className="text-sm text-muted-foreground">Carregando processo...</p>
      </div>
    )
  }

  if (!process) {
    return (
      <div className="flex flex-col items-center justify-center gap-4" style={{ height: '100vh', background: '#0d1017' }}>
        <p className="text-sm" style={{ color: '#fca5a5' }}>{loadError || 'Processo não encontrado.'}</p>
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Voltar ao painel</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full overflow-hidden" style={{ height: '100vh', fontFamily: "'Inter',sans-serif", background: '#0d1017' }}>

      <header className="shrink-0 flex items-center gap-4 px-5 border-b border-border" style={{ height: '52px', background: '#111520' }}>

        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: '#991b1b' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="3" cy="7" r="2" fill="white" />
              <circle cx="11" cy="3" r="2" fill="white" opacity="0.7" />
              <circle cx="11" cy="11" r="2" fill="white" opacity="0.7" />
              <line x1="5" y1="6.2" x2="9" y2="3.8" stroke="white" strokeWidth="1.2" opacity="0.8" />
              <line x1="5" y1="7.8" x2="9" y2="10.2" stroke="white" strokeWidth="1.2" opacity="0.5" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground" style={{ letterSpacing: '-0.01em' }}>Deviante</span>
        </div>

        <button onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', fontSize: 11, fontFamily: "'Inter',sans-serif", transition: 'background 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'white' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8' }}>
          <ArrowLeft size={11} />
          Projetos
        </button>

        <div className="w-px h-5 bg-border" />

        <div className="flex flex-col justify-center min-w-0">
          {editingTitle ? (
            <input ref={titleInputRef} value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle} maxLength={100}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle()
                if (e.key === 'Escape') { setTitleDraft(process.name ?? ''); setEditingTitle(false) }
              }}
              className="text-sm font-semibold bg-transparent border-0 outline-none text-foreground"
              style={{ borderBottom: '1px solid #991b1b', paddingBottom: '1px', minWidth: '180px', letterSpacing: '-0.01em' }} />
          ) : (
            <button onClick={() => { setTitleError(''); setEditingTitle(true) }} title="Renomear processo"
              className="text-sm font-semibold text-left text-foreground hover:text-white transition-colors truncate"
              style={{ letterSpacing: '-0.01em' }}>
              {process.name || 'Processo sem nome'}
            </button>
          )}
          <span className="text-[11px] leading-none mt-0.5 truncate" style={{ color: titleError ? '#fca5a5' : undefined }}>
            {titleError
              ? <span>{titleError} — ajuste na aba Processos.</span>
              : <span className="text-muted-foreground">{process.companyName || 'Empresa não definida'}</span>}
          </span>
        </div>

        <div className="flex items-center gap-0.5 ml-4 rounded-lg p-0.5 shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TAB_ITEMS.map((tab) => (
            <button key={tab.id} onClick={() => { if (!tab.disabled) setActiveTab(tab.id) }}
              disabled={tab.disabled} title={tab.hint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
              style={{
                background: activeTab === tab.id ? '#1e2738' : 'transparent',
                color: activeTab === tab.id ? '#e2e8f0' : '#64748b',
                fontFamily: "'JetBrains Mono',monospace",
                opacity: tab.disabled ? 0.4 : 1,
                cursor: tab.disabled ? 'not-allowed' : 'pointer',
              }}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {!isMobile && activeTab === 'grafo' && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded ml-1 shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{TOTAL_CASES} casos</span>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: '#f59e0b', fontFamily: "'JetBrains Mono',monospace" }}>simulado</span>
          </div>
        )}

        <div className="flex-1" />

        {activeTab === 'grafo' && !isMobile && (
          <button onClick={() => setLayout((l) => (l === 'horizontal' ? 'vertical' : 'horizontal'))}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors border border-border text-muted-foreground hover:text-foreground shrink-0"
            style={{ fontFamily: "'JetBrains Mono',monospace" }}>
            <AlignCenter size={13} style={{ transform: layout === 'horizontal' ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
            {layout === 'horizontal' ? 'Vertical' : 'Horizontal'}
          </button>
        )}

        <button title="Carregar log de eventos — em breve (UC4)" disabled
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border border-border text-muted-foreground opacity-50 cursor-not-allowed shrink-0">
          <Upload size={12} /><span className="hidden sm:inline">Carregar log</span>
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {activeTab === 'grafo' && <ProcessGraphTab layout={layout} isMobile={isMobile} />}

        {activeTab === 'processos' && (
          <ProcessDetailsTab
            process={process}
            onSaved={setProcess}
            onDeleted={() => navigate('/dashboard', { replace: true, state: { message: 'Processo excluído com sucesso.' } })}
          />
        )}
      </div>
    </div>
  )
}
