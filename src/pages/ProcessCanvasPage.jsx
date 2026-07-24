import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, Activity, Wrench, FileText, Scan } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import BrandMark from '../components/layout/BrandMark'
import ProcessGraphTab from '../components/process-graph/ProcessGraphTab'
import ProcessDetailsTab from '../components/process-graph/ProcessDetailsTab'
import EventLogUploadModal from '../components/process-graph/EventLogUploadModal'
import ProcessAnalysisView from '../components/process-analysis/ProcessAnalysisView'

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

  Everything on this screen is now the real Kotlin-backed API: process
  metadata (UC2), the event-log upload (UC4/UC5) and — since the `/graph`
  and `/traces` routes landed — the canvas itself, derived from the traces
  persisted for this process. The old "simulado" pill is gone with the seed
  data it warned about; the badge counts the cases actually ingested.
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
  const [isMobile, setIsMobile] = useState(false)
  // Reported by the graph tab so the header badge and the canvas never
  // disagree about how many cases this process has.
  const [graphStats, setGraphStats] = useState(null)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  // Bumped after a mapping is confirmed so the graph tab refetches instead of
  // showing the state it had before the log existed.
  const [mappingVersion, setMappingVersion] = useState(0)

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

  // Stable identity: the graph tab reports stats from an effect, and a fresh
  // callback each render would make that effect fire in a loop.
  const handleGraphStats = useCallback((stats) => setGraphStats(stats), [])

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

  if (analysisOpen) {
    return (
      <ProcessAnalysisView
        processName={process.name || 'Processo sem nome'}
        eventLog={graphStats?.eventLog}
        onBack={() => setAnalysisOpen(false)}
        onGoHome={() => navigate('/dashboard')}
      />
    )
  }

  return (
    <div className="flex flex-col w-full overflow-hidden" style={{ height: '100vh', fontFamily: "'Inter',sans-serif", background: '#0d1017' }}>

      <header className="shrink-0 flex items-center gap-4 px-5 border-b border-border" style={{ height: '52px', background: '#111520' }}>

        <BrandMark />

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

        {!isMobile && activeTab === 'grafo' && graphStats?.caseCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded ml-1 shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            title={graphStats.eventLog ? `Derivado de ${graphStats.eventLog.fileName}` : undefined}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              {graphStats.caseCount.toLocaleString('pt-BR')} casos
            </span>
            {graphStats.hasUnmappedOperations && (
              <span className="text-[10px] uppercase tracking-wide" title="Operações ainda não mapeadas para atividades (UC5)"
                style={{ color: '#f59e0b', fontFamily: "'JetBrains Mono',monospace" }}>não mapeado</span>
            )}
          </div>
        )}

        <div className="flex-1" />

        <button type="button" onClick={() => setAnalysisOpen(true)}
          disabled={!graphStats?.caseCount || graphStats?.hasUnmappedOperations}
          title={!graphStats?.caseCount
            ? 'Carregue e mapeie um log antes de analisar desvios'
            : graphStats?.hasUnmappedOperations
              ? 'Conclua o mapeamento das atividades antes de analisar desvios'
              : 'Abrir análise de desvios'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ border: '1px solid rgba(153,27,27,0.40)', background: 'rgba(153,27,27,0.12)', color: '#fca5a5' }}>
          <Scan size={12} /><span className="hidden md:inline">Análise de desvios</span>
        </button>

        <button type="button" title="Carregar log de eventos (UC4)" onClick={() => setUploadOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Upload size={12} /><span className="hidden sm:inline">Carregar log</span>
        </button>
      </header>

      {uploadOpen && (
        <EventLogUploadModal
          processId={processId}
          onClose={() => setUploadOpen(false)}
          onMappingComplete={() => {
            // Confirming the mapping is what makes the process viewable —
            // close the modal and land the Manager on the graph.
            setUploadOpen(false)
            setMappingVersion((v) => v + 1)
            setActiveTab('grafo')
          }}
        />
      )}

      <div className="flex flex-1 min-h-0">
        {activeTab === 'grafo' && (
          <ProcessGraphTab
            key={mappingVersion}
            processId={processId}
            isMobile={isMobile}
            onStats={handleGraphStats}
            onUploadLog={() => setUploadOpen(true)}
          />
        )}

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
