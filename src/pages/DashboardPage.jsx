import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Activity, Plus, ChevronRight } from 'lucide-react'
import { api, ApiError } from '../lib/api'

/*
  UC2 (Maintain Process) — gallery-style dashboard, ported from the Figma
  Make export "Process Mining Canvas Design" (ZZKdwxgmeCNJFG64zGbADe),
  ProcessosPanel's dashboard sub-view. Figma is the style reference here;
  the top creation-type row (Criar processo / Nova análise) doesn't exist
  in that export — it's new, built consistent with the same visual
  language, mirroring the tab-row idiom from Figma's own project browser.
  Wired to the real Kotlin-backed API (unlike the Figma mock's local
  state) — ProcessDetailPage.jsx (reached via "Abrir processo") is
  untouched by this change.
*/

function ProcessCard({ process }) {
  const formatted = new Date(process.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  return (
    <div
      className="rounded-xl border border-border overflow-hidden transition-all duration-200"
      style={{ background: '#111520' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <span
            className="self-start px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)', fontFamily: "'JetBrains Mono',monospace" }}
          >
            {process.sector || 'Sem setor'}
          </span>
          <h3 className="text-sm font-semibold text-foreground leading-tight">{process.name}</h3>
          <p
            className="text-xs text-muted-foreground leading-relaxed"
            style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {process.description || 'Sem descrição. Abra as configurações para definir este fluxo de manufatura.'}
          </p>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{formatted}</span>
          <Link
            to={`/processes/${process.id}`}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8' }}
          >
            Abrir processo<ChevronRight size={10} />
          </Link>
        </div>
      </div>
    </div>
  )
}

function CreationCta({ icon, label, hint, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
      style={{
        background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
        color: disabled ? '#475569' : '#e2e8f0',
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.14)' }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
      title={hint}
    >
      {icon}{label}
    </button>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [processes, setProcesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

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

  return (
    <div className="flex flex-col" style={{ background: '#0d1017', margin: '-2rem calc(-50vw + 50%)', padding: '0 calc(50vw - 50%)', minHeight: 'calc(100vh - 52px)' }}>
      <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-border flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#f59e0b', fontFamily: "'JetBrains Mono',monospace" }}>
            UC2 · Manter processo
          </p>
          <h1 className="text-lg font-semibold text-foreground" style={{ letterSpacing: '-0.01em' }}>Painel principal</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Crie e gerencie processos antes de enviar logs de eventos.</p>
        </div>
        <div className="flex items-center gap-2">
          <CreationCta
            icon={<Plus size={12} />}
            label={creating ? 'Criando processo…' : 'Criar processo'}
            onClick={handleCreateProcess}
            disabled={creating}
          />
          <CreationCta
            icon={<Activity size={12} />}
            label="Nova análise"
            hint="Em breve — depende do upload de log (UC4)"
            disabled
          />
        </div>
      </div>

      {error ? (
        <div className="mx-6 mt-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(220,38,38,0.10)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.25)' }}>
          {error}
        </div>
      ) : null}

      <div className="flex-1 p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando processos...</p>
        ) : processes.length === 0 ? (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: '50vh' }}>
            <div className="rounded-2xl border border-border p-10 flex flex-col items-center gap-5 max-w-xs text-center" style={{ background: '#111520' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.10)' }}>
                <FileText size={20} className="text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground" style={{ letterSpacing: '-0.01em' }}>Nenhum processo ainda</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Crie seu primeiro processo para começar a enviar logs e analisar fluxos de trabalho.</p>
              </div>
              <CreationCta icon={<Plus size={12} />} label={creating ? 'Criando processo…' : 'Criar processo'} onClick={handleCreateProcess} disabled={creating} />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              {processes.length} processo{processes.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {processes.map((process) => (
                <ProcessCard key={process.id} process={process} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
