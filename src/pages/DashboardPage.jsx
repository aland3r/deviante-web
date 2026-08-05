import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  ChevronRight,
  Grid3X3,
  Plus,
  RadioTower,
  X,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'

/*
  Ported from the Figma Make export "Process Mining Canvas Design"
  (ZZKdwxgmeCNJFG64zGbADe), HomeScreen — figma is the style reference.

  Grid mixes Process + Analysis cards (Figma HomeProject type). Analyses are
  persisted by the authenticated API; opening one routes to the process
  analysis view, with the process name as provenance on the card.
*/

function timeAgo(isoDate) {
  const then = new Date(isoDate).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `${minutes} minuto${minutes !== 1 ? 's' : ''} atrás`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hora${hours !== 1 ? 's' : ''} atrás`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} dia${days !== 1 ? 's' : ''} atrás`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} semana${weeks !== 1 ? 's' : ''} atrás`
  const months = Math.floor(days / 30)
  return `${months} ${months !== 1 ? 'meses' : 'mês'} atrás`
}

function ProcessThumbnail() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 130" fill="none" preserveAspectRatio="xMidYMid meet">
      {[20, 60, 100, 140, 180].map((x) => [30, 70, 110].map((y) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1} fill="rgba(255,255,255,0.06)" />
      )))}
      <path d="M 55 30 C 90 30 90 65 110 65" stroke="#2870a8" strokeWidth="2.5" fill="none" opacity="0.9" />
      <path d="M 110 65 C 130 65 130 30 165 30" stroke="#4d8fc0" strokeWidth="1.8" fill="none" opacity="0.7" />
      <path d="M 110 65 C 130 65 130 100 165 100" stroke="#2870a8" strokeWidth="3.2" fill="none" opacity="0.9" />
      <path d="M 165 100 C 185 100 200 65 200 65" stroke="#4d8fc0" strokeWidth="1.4" fill="none" strokeDasharray="4 3" opacity="0.5" />
      <polygon points="108,61 116,65 108,69" fill="#2870a8" opacity="0.8" />
      <polygon points="162,27 170,30 162,33" fill="#4d8fc0" opacity="0.7" />
      <polygon points="162,97 170,100 162,103" fill="#2870a8" opacity="0.9" />
      <circle cx="40" cy="30" r="12" fill="#0d1017" stroke="#2870a8" strokeWidth="1.5" />
      <circle cx="40" cy="30" r="5" fill="#2870a8" />
      <rect x="100" y="55" width="20" height="20" rx="5" fill="#111520" stroke="#4d8fc0" strokeWidth="1.2" />
      <rect x="155" y="20" width="24" height="20" rx="5" fill="#111520" stroke="#3a7db8" strokeWidth="1.2" />
      <rect x="155" y="90" width="24" height="20" rx="5" fill="#111520" stroke="#2870a8" strokeWidth="1.5" />
      <circle cx="205" cy="65" r="10" fill="#0d1017" stroke="#4d8fc0" strokeWidth="1.2" />
      <rect x="200" y="60" width="10" height="10" rx="2" fill="#4d8fc0" opacity="0.6" />
    </svg>
  )
}

/** Monitoring card art — equipment signal traces on a health baseline. */
function MonitoramentoThumbnail() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 130" fill="none" preserveAspectRatio="xMidYMid meet">
      {[35, 65, 95].map((y) => (
        <line key={y} x1="20" y1={y} x2="200" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      <line x1="20" y1="50" x2="200" y2="50" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
      <path d="M 20 92 L 45 90 L 70 91 L 95 88 L 120 86 L 135 70 L 150 52 L 170 44 L 200 40"
        stroke="#10b981" strokeWidth="2" fill="none" opacity="0.9" />
      {[[45, 90], [95, 88], [135, 70], [170, 44]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.6" fill="#10b981" opacity="0.85" />
      ))}
      <circle cx="185" cy="42" r="4" fill="#dc2626" />
      <circle cx="185" cy="42" r="8" fill="none" stroke="#dc2626" strokeWidth="1" opacity="0.4" />
      <rect x="28" y="104" width="14" height="12" rx="2" fill="#111520" stroke="#4d8fc0" strokeWidth="1.2" />
      <rect x="52" y="104" width="14" height="12" rx="2" fill="#111520" stroke="#2870a8" strokeWidth="1.2" />
      <circle cx="80" cy="110" r="6" fill="#0d1017" stroke="#4d8fc0" strokeWidth="1.2" />
    </svg>
  )
}

/** Figma Make HomeScreen — analysis card art */
function AnaliseThumbnail() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 130" fill="none" preserveAspectRatio="xMidYMid meet">
      {[40, 70, 100].map((y) => (
        <line key={y} x1="30" y1={y} x2="200" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      <rect x="42" y="72" width="22" height="38" rx="3" fill="#2870a8" opacity="0.75" />
      <rect x="76" y="52" width="22" height="58" rx="3" fill="#4d8fc0" opacity="0.85" />
      <rect x="110" y="60" width="22" height="50" rx="3" fill="#2870a8" opacity="0.75" />
      <rect x="144" y="38" width="22" height="72" rx="3" fill="#4d8fc0" opacity="0.90" />
      <rect x="178" y="55" width="22" height="55" rx="3" fill="#2870a8" opacity="0.70" />
      <path d="M 30 85 L 53 80 L 87 68 L 121 72 L 155 52 L 189 65 L 200 60"
        stroke="#c8e2f5" strokeWidth="2" fill="none" opacity="0.9" />
      {[[53, 80], [87, 68], [121, 72], [155, 52], [189, 65]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.5" fill="#c8e2f5" opacity="0.85" />
      ))}
      <line x1="30" y1="110" x2="200" y2="110" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {['Jan', 'Mar', 'Mai', 'Jul', 'Set'].map((label, i) => (
        <text key={label} x={42 + i * 34 + 11} y="122" textAnchor="middle"
          fontSize="8" fill="rgba(255,255,255,0.25)" fontFamily="'JetBrains Mono',monospace">{label}</text>
      ))}
    </svg>
  )
}

function AnalysisBarsIcon({ size = 8, fill = 'white' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 9 9" fill="none" aria-hidden>
      <rect x="0" y="4" width="2.5" height="5" rx="1" fill={fill} />
      <rect x="3.25" y="2" width="2.5" height="7" rx="1" fill={fill} />
      <rect x="6.5" y="0" width="2.5" height="9" rx="1" fill={fill} />
    </svg>
  )
}

const ACTION_APPEARANCE = {
  processo: {
    icon: Activity,
    accent: '#2870a8',
    surface: 'rgba(40,112,168,0.12)',
    border: 'rgba(77,143,192,0.30)',
  },
  analise: {
    icon: BarChart3,
    accent: '#b45309',
    surface: 'rgba(180,83,9,0.11)',
    border: 'rgba(245,158,11,0.27)',
  },
  monitoramento: {
    icon: RadioTower,
    accent: '#059669',
    surface: 'rgba(5,150,105,0.10)',
    border: 'rgba(16,185,129,0.24)',
  },
}

function NewProjectButton({ type, label, disabled, busy, onClick }) {
  const appearance = ACTION_APPEARANCE[type]
  const Icon = appearance.icon

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="w-full sm:w-[168px]"
      style={{
        minHeight: 52,
        display: 'grid',
        gridTemplateColumns: '34px minmax(0, 1fr) 20px',
        alignItems: 'center',
        gap: 8,
        padding: '8px 9px',
        borderRadius: 7,
        border: `1px solid ${appearance.border}`,
        background: '#111520',
        color: 'white',
        textAlign: 'left',
        cursor: disabled || busy ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.48 : 1,
        transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
      }}
      onMouseEnter={(event) => {
        if (disabled || busy) return
        event.currentTarget.style.borderColor = appearance.accent
        event.currentTarget.style.background = '#151b27'
        event.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(event) => {
        if (disabled || busy) return
        event.currentTarget.style.borderColor = appearance.border
        event.currentTarget.style.background = '#111520'
        event.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <span style={{
        width: 34,
        height: 34,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: appearance.surface,
        border: `1px solid ${appearance.border}`,
        color: appearance.accent,
      }}>
        <Icon size={15} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{
          display: 'block',
          fontFamily: "'Inter',sans-serif",
          fontWeight: 600,
          fontSize: 12,
          color: '#e2e8f0',
          lineHeight: 1.25,
        }}>
          {busy ? (type === 'monitoramento' ? 'Criando monitoramento...' : 'Criando processo...') : label}
        </span>
      </span>
      <span style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: disabled ? '#475569' : appearance.accent,
        background: disabled ? 'rgba(255,255,255,0.03)' : appearance.surface,
      }}>
        {disabled ? (
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8 }}>--</span>
        ) : type === 'processo' ? (
          <Plus size={12} />
        ) : (
          <ChevronRight size={13} />
        )}
      </span>
    </button>
  )
}

function AnalysisProcessPicker({ processes, onClose, onPick }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,6,12,0.78)' }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="w-full overflow-hidden border border-border"
        role="dialog" aria-modal="true" aria-labelledby="analysis-picker-title"
        style={{ maxWidth: 460, maxHeight: 'min(620px, 84vh)', borderRadius: 8, background: '#111520', boxShadow: '0 24px 70px rgba(0,0,0,0.55)' }}>
        <div className="flex items-start justify-between gap-4 px-4 py-3.5 border-b border-border">
          <div>
            <h2 id="analysis-picker-title" className="text-sm font-semibold text-foreground">Nova análise</h2>
            <p className="text-[11px] text-muted-foreground mt-1">Selecione o processo que será analisado.</p>
          </div>
          <button type="button" onClick={onClose} title="Fechar"
            className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary">
            <X size={13} />
          </button>
        </div>
        <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(min(620px, 84vh) - 70px)' }}>
          {processes.length ? processes.map((process) => (
            <button
              key={process.id}
              type="button"
              onClick={() => onPick(process)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded hover:bg-secondary/60 text-left"
              style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
            >
              <span className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                style={{ background: 'rgba(180,83,9,0.12)', color: '#f59e0b' }}>
                <BarChart3 size={13} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-foreground truncate">{process.name}</span>
                <span className="block text-[10px] text-muted-foreground truncate mt-0.5">
                  {process.sector || 'Processo produtivo'}
                </span>
              </span>
              <ChevronRight size={13} className="text-muted-foreground shrink-0" />
            </button>
          )) : (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              Crie um processo antes de iniciar uma análise.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ item }) {
  const isAnalysis = item.type === 'analise'
  const isMonitoring = item.type === 'monitoramento'
  const to = isMonitoring
    ? `/monitoring/${item.id}`
    : isAnalysis
      ? `/processes/${item.processId}?view=analysis&analysisId=${item.id}`
      : `/processes/${item.id}`
  const accent = isMonitoring ? '#059669' : isAnalysis ? '#6366f1' : '#2870a8'
  const hoverBorder = isMonitoring ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.16)'
  const subtitle = isMonitoring
    ? `${item.machineCount ?? 0} máquina${(item.machineCount ?? 0) !== 1 ? 's' : ''}`
    : isAnalysis
      ? (item.processName
        ? `Processo · ${item.processName}`
        : 'Análise de desvios')
      : `Editado ${timeAgo(item.updatedAt)}`

  return (
    <Link
      to={to}
      style={{ display: 'block', background: '#0f141e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = hoverBorder }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
    >
      <div style={{ height: 140, background: '#080c14', overflow: 'hidden', position: 'relative' }}>
        {isMonitoring ? <MonitoramentoThumbnail /> : isAnalysis ? <AnaliseThumbnail /> : <ProcessThumbnail />}
      </div>
      <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isMonitoring ? <RadioTower size={8} color="white" /> : isAnalysis ? <AnalysisBarsIcon size={8} /> : <Activity size={8} color="white" />}
          </div>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: 'white', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#475569', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {subtitle}
        </span>
        {isAnalysis ? (
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#334155', display: 'block', marginTop: 2 }}>
            Editado {timeAgo(item.updatedAt)}
            {item.driftCount != null ? ` · ${item.driftCount} drift${item.driftCount !== 1 ? 's' : ''}` : ''}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

function ProjectListItem({ item }) {
  const isAnalysis = item.type === 'analise'
  const isMonitoring = item.type === 'monitoramento'
  const to = isMonitoring
    ? `/monitoring/${item.id}`
    : isAnalysis
      ? `/processes/${item.processId}?view=analysis&analysisId=${item.id}`
      : `/processes/${item.id}`
  const accent = isMonitoring ? '#10b981' : isAnalysis ? '#6366f1' : '#4d8fc0'
  const meta = isMonitoring
    ? `${item.machineCount ?? 0} máquina${(item.machineCount ?? 0) !== 1 ? 's' : ''} · editado ${timeAgo(item.updatedAt)}`
    : isAnalysis
      ? `${item.processName ? `Processo · ${item.processName}` : 'Análise'} · editado ${timeAgo(item.updatedAt)}`
      : `${item.sector || 'Processo produtivo'} · editado ${timeAgo(item.updatedAt)}`

  return (
    <Link to={to}
      className="flex items-center gap-3 px-3 py-3 border-b border-border last:border-0 hover:bg-secondary/40"
      style={{ textDecoration: 'none' }}>
      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: '#16202e' }}>
        {isMonitoring
          ? <RadioTower size={13} color={accent} />
          : isAnalysis
            ? <AnalysisBarsIcon size={12} fill="#6366f1" />
            : <Activity size={13} color={accent} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
          {meta}
        </p>
      </div>
    </Link>
  )
}

const HOME_TABS = [
  { id: 'recentes', label: 'Visualizados recentemente', shortLabel: 'Recentes' },
  { id: 'compartilhados', label: 'Compartilhados comigo', shortLabel: 'Compartilhados' },
  { id: 'favoritos', label: 'Favoritos' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [processes, setProcesses] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [monitorings, setMonitorings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [creatingMonitoring, setCreatingMonitoring] = useState(false)
  const [tab, setTab] = useState('recentes')
  const [search, setSearch] = useState('')
  
  const [analysisPickerOpen, setAnalysisPickerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.listProcesses(),
      api.listAnalyses().catch(() => []),
      api.listMonitorings().catch(() => []),
    ])
      .then(([processRows, analysisRows, monitoringRows]) => {
        if (cancelled) return
        setProcesses(processRows)
        setAnalyses(analysisRows)
        setMonitorings(monitoringRows)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o painel.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  async function handleCreateProcess() {
    setCreating(true)
    setError('')
    try {
      const process = await api.createProcess()
      navigate(`/processes/${process.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o processo.')
      setCreating(false)
    }
  }

  async function handleCreateMonitoring() {
    setCreatingMonitoring(true)
    setError('')
    try {
      const created = await api.createMonitoring()
      navigate(`/monitoring/${created.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o monitoramento.')
      setCreatingMonitoring(false)
    }
  }

  async function handlePickAnalysisProcess(process) {
    setError('')
    try {
      const analysis = await api.createAnalysis(process.id)
      setAnalyses((prev) => {
        const without = prev.filter((row) => row.id !== analysis.id)
        return [analysis, ...without]
      })
      setAnalysisPickerOpen(false)
      navigate(`/processes/${process.id}?view=analysis&analysisId=${analysis.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar a análise.')
      setAnalysisPickerOpen(false)
    }
  }

  const items = useMemo(() => {
    const processItems = processes.map((p) => ({
      id: p.id,
      type: 'processo',
      name: p.name,
      updatedAt: p.updatedAt,
      sector: p.sector,
    }))
    const analysisItems = analyses.map((a) => ({
      ...a,
      type: 'analise',
    }))
    const monitoringItems = monitorings.map((m) => ({
      id: m.id,
      type: 'monitoramento',
      name: m.name,
      updatedAt: m.updatedAt,
      machineCount: m.machineCount,
    }))
    return [...processItems, ...analysisItems, ...monitoringItems].sort((a, b) =>
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
    )
  }, [processes, analyses, monitorings])

  const visible = tab === 'recentes'
    ? items.filter((item) => {
      const q = search.toLowerCase()
      if (!q) return true
      return (
        item.name?.toLowerCase().includes(q)
        || item.processName?.toLowerCase().includes(q)
        || item.sector?.toLowerCase().includes(q)
      )
    })
    : []

  const processCount = visible.filter((i) => i.type === 'processo').length
  const analysisCount = visible.filter((i) => i.type === 'analise').length
  const monitoringCount = visible.filter((i) => i.type === 'monitoramento').length
  const countLabel = (() => {
    const parts = []
    if (processCount) parts.push(`${processCount} processo${processCount !== 1 ? 's' : ''}`)
    if (analysisCount) parts.push(`${analysisCount} anális${analysisCount !== 1 ? 'es' : 'e'}`)
    if (monitoringCount) parts.push(`${monitoringCount} monitoramento${monitoringCount !== 1 ? 's' : ''}`)
    if (!parts.length) return '0 itens'
    return parts.join(' · ')
  })()

  return (
    <div className="flex flex-col" style={{ background: '#0d1017', margin: '-2rem calc(-50vw + 50%)', padding: '0 calc(50vw - 50%)', minHeight: 'calc(100vh - 52px)' }}>
      {analysisPickerOpen && (
        <AnalysisProcessPicker
          processes={processes}
          onClose={() => setAnalysisPickerOpen(false)}
          onPick={handlePickAnalysisProcess}
        />
      )}
      <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8"
        style={{ maxWidth: 1120, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="w-full sm:max-w-[360px]" style={{ position: 'relative' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar processos e análises…"
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, height: 44, padding: '8px 12px 8px 36px', color: 'white', fontFamily: "'Inter',sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end" style={{ gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              return (
                <button
                  type="button"
                  onClick={onClick}
                  disabled={disabled || busy}
                  className="w-full sm:w-[168px]"
                  style={{
                    minHeight: 48,
                    display: 'grid',
                    gridTemplateColumns: '40px minmax(0, 1fr) 24px',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 9px',
                    borderRadius: 7,
                    border: `1px solid ${appearance.border}`,
                    background: '#111520',
                    color: 'white',
                    textAlign: 'left',
                    cursor: disabled || busy ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.48 : 1,
                    transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={(event) => {
                    if (disabled || busy) return
                    event.currentTarget.style.borderColor = appearance.accent
                    event.currentTarget.style.background = '#151b27'
                    event.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(event) => {
                    if (disabled || busy) return
                    event.currentTarget.style.borderColor = appearance.border
                    event.currentTarget.style.background = '#111520'
                    event.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <span style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: appearance.surface,
                    border: `1px solid ${appearance.border}`,
                    color: appearance.accent,
                  }}>
                    <Icon size={20} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{
                      display: 'block',
                      fontFamily: "'Inter',sans-serif",
                      fontWeight: 600,
                      fontSize: 12,
                      color: '#e2e8f0',
                      lineHeight: 1.25,
                    }}>
                      {busy ? (type === 'monitoramento' ? 'Criando monitoramento...' : 'Criando processo...') : label}
                    </span>
                  </span>
                  <span style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: disabled ? '#475569' : appearance.accent,
                    background: disabled ? 'rgba(255,255,255,0.03)' : appearance.surface,
                  }}>
                    {disabled ? (
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9 }}>--</span>
                    ) : type === 'processo' ? (
                      <Plus size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </span>
                </button>
              )
