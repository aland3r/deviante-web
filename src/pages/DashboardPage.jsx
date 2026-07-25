import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  ChevronRight,
  Grid3X3,
  List,
  Plus,
  RadioTower,
  X,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'

/*
  Ported from the Figma Make export "Process Mining Canvas Design"
  (ZZKdwxgmeCNJFG64zGbADe), HomeScreen — figma is the style reference.
  Figma's own navbar (logo/search/user-chip) is dropped here since
  AppLayout already provides that role site-wide; everything below it
  (Criar novo cards, Recentes/Compartilhados/Favoritos tabs, project
  grid) is ported. Wired to the real Kotlin-backed API — cards and
  "Novo processo" both route to /processes/:id (ProcessCanvasPage), which
  is the open-project screen: graph canvas + Processos tab.

  Compartilhados/Favoritos have no backend concept yet (no sharing or
  favoriting on processes) — tabs render, but stay empty. Analysis stays
  process-scoped: its dashboard action first asks which process to open.
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

function NewProjectButton({ type, label, description, disabled, busy, onClick }) {
  const appearance = ACTION_APPEARANCE[type]
  const Icon = appearance.icon

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      style={{
        minHeight: 68,
        display: 'grid',
        gridTemplateColumns: '42px minmax(0, 1fr) 24px',
        alignItems: 'center',
        gap: 11,
        padding: '10px 11px',
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
        width: 42,
        height: 42,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: appearance.surface,
        border: `1px solid ${appearance.border}`,
        color: appearance.accent,
      }}>
        <Icon size={17} />
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
          {busy ? 'Criando processo...' : label}
        </span>
        <span style={{
          display: 'block',
          marginTop: 3,
          fontFamily: "'Inter',sans-serif",
          fontSize: 10,
          color: '#64748b',
          lineHeight: 1.3,
          whiteSpace: 'normal',
        }}>
          {description}
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

function AnalysisProcessPicker({ processes, onClose }) {
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
            <Link key={process.id} to={`/processes/${process.id}?view=analysis`}
              className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-secondary/60"
              style={{ textDecoration: 'none' }}>
              <span className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                style={{ background: 'rgba(180,83,9,0.12)', color: '#f59e0b' }}>
                <BarChart3 size={13} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-foreground truncate">{process.name}</span>
                <span className="block text-[10px] text-muted-foreground truncate mt-0.5">
                  {process.companyName || 'Empresa não definida'}
                </span>
              </span>
              <ChevronRight size={13} className="text-muted-foreground shrink-0" />
            </Link>
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

function ProjectCard({ process }) {
  return (
    <Link
      to={`/processes/${process.id}`}
      style={{ display: 'block', background: '#0f141e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
    >
      <div style={{ height: 140, background: '#080c14', overflow: 'hidden', position: 'relative' }}>
        <ProcessThumbnail />
      </div>
      <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: '#2870a8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={8} color="white" />
          </div>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: 'white', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{process.name}</span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#475569' }}>Editado {timeAgo(process.updatedAt)}</span>
      </div>
    </Link>
  )
}

function ProjectListItem({ process }) {
  return (
    <Link to={`/processes/${process.id}`}
      className="flex items-center gap-3 px-3 py-3 border-b border-border last:border-0 hover:bg-secondary/40"
      style={{ textDecoration: 'none' }}>
      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: '#16202e' }}>
        <Activity size={13} color="#4d8fc0" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground truncate">{process.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
          {process.companyName || 'Empresa não definida'} · editado {timeAgo(process.updatedAt)}
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState('recentes')
  const [search, setSearch] = useState('')
  const [displayMode, setDisplayMode] = useState('grid')
  const [analysisPickerOpen, setAnalysisPickerOpen] = useState(false)

  useEffect(() => {
    api.listProcesses()
      .then(setProcesses)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os processos.')
      })
      .finally(() => setLoading(false))
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

  const visible = tab === 'recentes'
    ? processes.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : []

  return (
    <div className="flex flex-col" style={{ background: '#0d1017', margin: '-2rem calc(-50vw + 50%)', padding: '0 calc(50vw - 50%)', minHeight: 'calc(100vh - 52px)' }}>
      {analysisPickerOpen && (
        <AnalysisProcessPicker processes={processes} onClose={() => setAnalysisPickerOpen(false)} />
      )}
      <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8"
        style={{ maxWidth: 1120, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        <div className="flex items-center justify-end mb-6 gap-3 flex-wrap">
          <div className="w-full sm:max-w-[280px]" style={{ position: 'relative' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar processos…"
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '6px 10px 6px 30px', color: 'white', fontFamily: "'Inter',sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {error ? (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(220,38,38,0.10)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.25)' }}>
            {error}
          </div>
        ) : null}

        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600, color: '#94a3b8', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Criar novo</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <NewProjectButton
              type="processo"
              label="Novo processo"
              description="Defina atividades e carregue um log."
              onClick={handleCreateProcess}
              busy={creating}
            />
            <NewProjectButton
              type="analise"
              label="Nova análise"
              description="Escolha um processo com log mapeado."
              onClick={() => setAnalysisPickerOpen(true)}
            />
            <NewProjectButton
              type="monitoramento"
              label="Novo monitoramento"
              description="Acompanhe desvios ao longo do tempo."
              disabled
            />
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0"
            style={{ marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex" style={{ gap: 0 }}>
              {HOME_TABS.map((t) => (
                <button
                  key={t.id} onClick={() => setTab(t.id)}
                  className="flex-1 sm:flex-none"
                  style={{ padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: tab === t.id ? '2px solid #991b1b' : '2px solid transparent', color: tab === t.id ? 'white' : '#64748b', fontFamily: "'Inter',sans-serif", fontWeight: tab === t.id ? 600 : 500, fontSize: 12, cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s', whiteSpace: 'nowrap' }}
                >
                  <span className="sm:hidden">{t.shortLabel || t.label}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end" style={{ gap: 8, paddingBottom: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#475569', letterSpacing: '0.04em' }}>
                {visible.length} processo{visible.length !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: 1, padding: 3, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <button type="button" onClick={() => setDisplayMode('grid')} title="Visualização em grade"
                  style={{ width: 24, height: 24, borderRadius: 4, border: 0, background: displayMode === 'grid' ? 'rgba(255,255,255,0.08)' : 'transparent', color: displayMode === 'grid' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Grid3X3 size={12} />
                </button>
                <button type="button" onClick={() => setDisplayMode('list')} title="Visualização em lista"
                  style={{ width: 24, height: 24, borderRadius: 4, border: 0, background: displayMode === 'list' ? 'rgba(255,255,255,0.08)' : 'transparent', color: displayMode === 'list' ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <List size={12} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando processos...</p>
          ) : tab !== 'recentes' ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#475569', fontFamily: "'Inter',sans-serif", fontSize: 13 }}>
              {tab === 'compartilhados' ? 'Nenhum processo compartilhado com você ainda.' : 'Nenhum favorito ainda.'}
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#475569', fontFamily: "'Inter',sans-serif", fontSize: 13 }}>
              {search ? `Nenhum processo encontrado para “${search}”` : 'Nenhum processo ainda — crie o primeiro acima.'}
            </div>
          ) : displayMode === 'list' ? (
            <div className="border border-border rounded overflow-hidden" style={{ background: '#0f141e' }}>
              {visible.map((process) => <ProjectListItem key={process.id} process={process} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {visible.map((p) => (
                <ProjectCard key={p.id} process={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
