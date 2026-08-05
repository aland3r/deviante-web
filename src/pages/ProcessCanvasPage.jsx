import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import BrandMark from '../components/layout/BrandMark'
import ProcessGraphTab from '../components/process-graph/ProcessGraphTab'
import EventLogUploadModal from '../components/process-graph/EventLogUploadModal'
import ProcessAnalysisView from '../components/process-analysis/ProcessAnalysisView'
import ProjectActionsMenu from '../components/projects/ProjectActionsMenu'

/*
  The process screen — what you land on after clicking a project on the
  dashboard, and immediately after creating one.

  Ported from the Figma Make export "Process Mining Canvas Design"
  Version 20 (`ZZKdwxgmeCNJFG64zGbADe`), which models the whole open-project
  experience as one focused process workspace rather than a form page that
  links to a separate graph page.

  Deliberately mounted OUTSIDE AppLayout: the canvas header (logo, ← Projetos,
  title and log status) replaces the app shell entirely once
  a project is open. AppLayout's own header still owns /dashboard and
  /account.

  Everything on this screen is now the real Kotlin-backed API: process
  metadata (UC2), the event-log upload (UC4/UC5) and — since the `/graph`
  and `/traces` routes landed — the canvas itself, derived from the traces
  persisted for this process. The old "simulado" pill is gone with the seed
  data it warned about; the badge counts the cases actually ingested.
*/

export default function ProcessCanvasPage() {
  const { processId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [process, setProcess] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [isMobile, setIsMobile] = useState(false)
  // Reported by the graph tab so the header badge and the canvas never
  // disagree about how many cases this process has.
  const [graphStats, setGraphStats] = useState(null)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(
    () => new URLSearchParams(location.search).get('view') === 'analysis',
  )
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

  useEffect(() => {
    setAnalysisOpen(new URLSearchParams(location.search).get('view') === 'analysis')
  }, [location.search])

  // Stable identity: the graph tab reports stats from an effect, and a fresh
  // callback each render would make that effect fire in a loop.
  const handleGraphStats = useCallback((stats) => setGraphStats(stats), [])

  async function commitTitle() {
    setEditingTitle(false)
    const name = titleDraft.trim()
    if (!name || name === process.name) { setTitleDraft(process.name ?? ''); return }

    try {
      const updated = await api.renameProcess(processId, name)
      setProcess(updated)
      setTitleDraft(updated.name ?? '')
      setTitleError('')
    } catch (err) {
      setTitleDraft(process.name ?? '')
      setTitleError(err instanceof ApiError ? err.message : 'Não foi possível renomear o processo.')
    }
  }

  async function deleteCurrentProcess() {
    const processName = window.prompt(`Digite exatamente o nome do processo para excluir:\n${process.name}`)
    if (processName == null) return
    try {
      await api.deleteProcess(processId, { processName, confirmationPhrase: 'quero excluir este processo' })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setTitleError(err instanceof ApiError ? err.message : 'Não foi possível excluir o processo.')
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
    const analysisId = new URLSearchParams(location.search).get('analysisId') || undefined
    return (
      <ProcessAnalysisView
        processId={processId}
        processName={process.name || 'Processo sem nome'}
        analysisId={analysisId}
        onDelete={analysisId ? async () => {
          if (!window.confirm('Excluir esta análise persistida? Esta ação não pode ser desfeita.')) return
          try {
            await api.deleteAnalysis(analysisId)
            navigate(`/processes/${processId}`, { replace: true })
          } catch (err) {
            window.alert(err instanceof ApiError ? err.message : 'Não foi possível excluir a análise.')
          }
        } : undefined}
        onBack={() => navigate(`/processes/${processId}`, { replace: true })}
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
              className="text-sm font-semibold text-left text-foreground hover:text-white hover:bg-white/[0.06] rounded px-1.5 -mx-1.5 py-0.5 transition-colors truncate"
              style={{ letterSpacing: '-0.01em' }}>
              {process.name || 'Processo sem nome'}
            </button>
          )}
          {titleError && <span className="text-[11px] leading-none mt-0.5 truncate" style={{ color: '#fca5a5' }}>{titleError}</span>}
        </div>
        <ProjectActionsMenu onDelete={deleteCurrentProcess} deleteLabel="Excluir processo" />

        {!isMobile && graphStats?.caseCount > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded ml-4 shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            title="Recorte atual da próxima análise">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              {(graphStats.selectedCaseCount ?? graphStats.caseCount).toLocaleString('pt-BR')}
              {(graphStats.selectedCaseCount ?? graphStats.caseCount) !== graphStats.caseCount ? ` / ${graphStats.caseCount.toLocaleString('pt-BR')}` : ''} traces
            </span>
            {graphStats.hasUnmappedOperations && (
              <span className="text-[10px] uppercase tracking-wide" title="Operações ainda não mapeadas para atividades (UC5)"
                style={{ color: '#f59e0b', fontFamily: "'JetBrains Mono',monospace" }}>não mapeado</span>
            )}
          </div>
        )}

        <div className="flex-1" />

        <button type="button" title="Carregar log de eventos (UC4)" onClick={() => setUploadOpen(true)}
          className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0">
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
          }}
        />
      )}

      <div className="flex flex-1 min-h-0">
        <ProcessGraphTab
          key={mappingVersion}
          processId={processId}
          isMobile={isMobile}
          onStats={handleGraphStats}
          onUploadLog={() => setUploadOpen(true)}
          onAnalyze={async (scope) => {
            try {
              const analysis = await api.createAnalysis(processId)
              await api.runProcessAnalysis(processId, analysis.id, {
                treatment: 'treated',
                delta: 0.002,
                eventLogIds: scope.eventLogIds,
                excludedActivityIds: scope.excludedActivityIds,
                excludedTraceIds: scope.excludedTraceIds,
              })
              navigate(`/processes/${processId}?view=analysis&analysisId=${analysis.id}`)
            } catch (err) {
              setLoadError(err instanceof ApiError ? err.message : 'Não foi possível criar a análise.')
            }
          }}
        />
      </div>
    </div>
  )
}
