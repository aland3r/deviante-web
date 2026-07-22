import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Plus, Grid3X3, List } from 'lucide-react'
import { api, ApiError } from '../lib/api'

/*
  Ported from the Figma Make export "Process Mining Canvas Design"
  (ZZKdwxgmeCNJFG64zGbADe), HomeScreen — figma is the style reference.
  Figma's own navbar (logo/search/user-chip) is dropped here since
  AppLayout already provides that role site-wide; everything below it
  (Criar novo cards, Recentes/Compartilhados/Favoritos tabs, project
  grid) is ported. Wired to the real Kotlin-backed API — cards route to
  the existing /processes/:id (ProcessDetailPage), not an embedded view.

  Compartilhados/Favoritos have no backend concept yet (no sharing or
  favoriting on processes) — tabs render, but stay empty, per owner
  21/07. "Nova análise" card is visibly present but disabled — depends
  on UC4 (log upload), not built yet.
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
      <path d="M 30 85 L 53 80 L 87 68 L 121 72 L 155 52 L 189 65 L 200 60" stroke="#c8e2f5" strokeWidth="2" fill="none" opacity="0.9" />
      {[[53, 80], [87, 68], [121, 72], [155, 52], [189, 65]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.5" fill="#c8e2f5" opacity="0.85" />
      ))}
      <line x1="30" y1="110" x2="200" y2="110" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {['Jan', 'Mar', 'Mai', 'Jul', 'Set'].map((l, i) => (
        <text key={l} x={42 + i * 34 + 11} y="122" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.25)" fontFamily="'JetBrains Mono',monospace">{l}</text>
      ))}
    </svg>
  )
}

function NewProjectCard({ type, label, description, disabled, onClick }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        background: '#111520', border: '1px dashed rgba(255,255,255,0.14)', borderRadius: 12,
        overflow: 'hidden', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => { if (disabled) return; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.30)'; e.currentTarget.style.background = '#161c28' }}
      onMouseLeave={(e) => { if (disabled) return; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.background = '#111520' }}
    >
      <div style={{ height: 140, background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
          {type === 'processo' ? <ProcessThumbnail /> : <AnaliseThumbnail />}
        </div>
        <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 10, border: '1.5px dashed rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)' }}>
          <Plus size={18} color="rgba(255,255,255,0.45)" />
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: type === 'processo' ? '#2870a8' : '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {type === 'processo'
              ? <Activity size={9} color="white" />
              : <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><rect x="0" y="4" width="2.5" height="5" rx="1" fill="white" /><rect x="3.25" y="2" width="2.5" height="7" rx="1" fill="white" /><rect x="6.5" y="0" width="2.5" height="9" rx="1" fill="white" /></svg>}
          </div>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13, color: 'white' }}>{label}</span>
          {disabled ? (
            <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>em breve</span>
          ) : null}
        </div>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.45 }}>{description}</p>
      </div>
    </div>
  )
}

function ProjectCard({ process }) {
  return (
    <Link
      to={`/processes/${process.id}`}
      style={{ display: 'block', background: '#0f141e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.15s' }}
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

const HOME_TABS = [
  { id: 'recentes', label: 'Visualizados recentemente' },
  { id: 'compartilhados', label: 'Compartilhados comigo' },
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
      <div className="flex-1" style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px', width: '100%', boxSizing: 'border-box' }}>

        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#f59e0b', fontFamily: "'JetBrains Mono',monospace" }}>UC2 · Manter processo</p>
            <p className="text-xs text-muted-foreground">Crie e gerencie processos antes de enviar logs de eventos.</p>
          </div>
          <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, maxWidth: 500 }}>
            <NewProjectCard
              type="processo" label={creating ? 'Criando processo…' : 'Novo processo'}
              description="Mapeie e analise fluxos de trabalho com grafo de processos."
              onClick={handleCreateProcess} disabled={creating}
            />
            <NewProjectCard
              type="analise" label="Nova análise"
              description="Detecte desvios e derive conformidade com logs de eventos."
              disabled
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {HOME_TABS.map((t) => (
                <button
                  key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: '8px 14px', background: 'transparent', border: 'none', borderBottom: tab === t.id ? '2px solid #991b1b' : '2px solid transparent', color: tab === t.id ? 'white' : '#64748b', fontFamily: "'Inter',sans-serif", fontWeight: tab === t.id ? 600 : 500, fontSize: 13, cursor: 'pointer', marginBottom: -1, transition: 'color 0.15s' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#475569', letterSpacing: '0.04em' }}>
                {visible.length} processo{visible.length !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: 1, padding: 3, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Grid3X3 size={12} />
                </div>
                <div style={{ width: 24, height: 24, borderRadius: 4, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <List size={12} />
                </div>
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
