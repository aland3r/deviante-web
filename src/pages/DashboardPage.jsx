import { useEffect, useState } from 'react'
import { FileText, Plus, ChevronRight, Trash2, X, ArrowLeft, AlertCircle } from 'lucide-react'
import { api, ApiError } from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────

const PROCESS_SECTORS = [
  'Atendimento', 'Compras', 'Financeiro', 'Jurídico',
  'Logística', 'Marketing', 'Operações', 'RH', 'TI', 'Outros',
]

// ─── Components (from Figma Make "Process Mining Canvas Design") ───────

function ProcessCard({ process, onOpen }) {
  const formatted = new Date(process.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  return (
    <div
      className="rounded-xl border border-border overflow-hidden transition-all duration-200 cursor-default"
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
          <button
            onClick={onOpen}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8' }}
          >
            Abrir processo<ChevronRight size={10} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ProcessFormField({ label, error, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-[11px] text-red-400 flex items-center gap-1"><AlertCircle size={10}/>{error}</span>}
    </div>
  )
}

const pInputBase = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.09)',
  background: '#0d1017', color: '#e2e8f0',
  fontFamily: "'Inter',sans-serif", fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
const pInputErr = { ...pInputBase, borderColor: 'rgba(220,38,38,0.60)' }

function ProcessDeleteDialog({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0" style={{ background: 'rgba(3,5,9,0.82)' }} onClick={onCancel}/>
      <div className="relative rounded-2xl border border-border p-7 max-w-sm w-full flex flex-col gap-5"
        style={{ background: '#161c28', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(153,27,27,0.15)', border: '1px solid rgba(153,27,27,0.30)' }}>
          <Trash2 size={18} color="#f87171"/>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-foreground" style={{ letterSpacing: '-0.01em' }}>Excluir processo?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O processo <strong className="text-foreground">&ldquo;{name}&rdquo;</strong> e todos os dados — atividades, logs e análises — serão excluídos permanentemente.
          </p>
        </div>
        <div className="flex gap-2.5 justify-end">
          <button onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', background: 'transparent' }}
            onMouseEnter={e => ((e.currentTarget).style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => ((e.currentTarget).style.background = 'transparent')}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            style={{ background: 'rgba(153,27,27,0.20)', color: '#fca5a5', border: '1px solid rgba(153,27,27,0.40)' }}
            onMouseEnter={e => ((e.currentTarget).style.background = 'rgba(153,27,27,0.35)')}
            onMouseLeave={e => ((e.currentTarget).style.background = 'rgba(153,27,27,0.20)')}>
            <Trash2 size={11}/>Excluir processo
          </button>
        </div>
        <button onClick={onCancel} className="absolute top-4 right-4 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <X size={13}/>
        </button>
      </div>
    </div>
  )
}

function ProcessDetailView({ process, onBack, onSave, onDelete }) {
  const isNew = process === null
  const [vals, setVals] = useState({
    name: process?.name ?? '',
    companyName: process?.companyName ?? '',
    description: process?.description ?? '',
    sector: process?.sector ?? '',
  })
  const [errs, setErrs] = useState({})
  const [showDel, setShowDel] = useState(false)
  const [saved, setSaved] = useState(false)

  function sf(k, v) {
    setVals(p => ({ ...p, [k]: v }))
    if (errs[k]) setErrs(p => ({ ...p, [k]: undefined }))
  }

  function submit(e) {
    e.preventDefault()
    const next = {}
    if (!vals.name.trim()) next.name = 'Campo obrigatório.'
    if (!vals.companyName.trim()) next.companyName = 'Campo obrigatório.'
    if (Object.keys(next).length) { setErrs(next); return }
    setErrs({})
    onSave(vals)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const metrics = [
    { label: 'Atividades', value: String(process?.activities ?? 0) },
    { label: 'Logs de eventos', value: String(process?.eventLogs ?? 0) },
    { label: 'Status do mapeamento', value: process?.mappingStatus ?? 'Não iniciado' },
  ]

  const nextSteps = ['Vincular máquinas ao processo', 'Enviar log de eventos', 'Analisar mapeamento de deriva']

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b border-border" style={{ background: '#0d1017' }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={12}/>Voltar ao painel
        </button>
        <div className="w-px h-4 bg-border"/>
        <h2 className="text-sm font-semibold text-foreground truncate" style={{ letterSpacing: '-0.01em' }}>
          {isNew ? 'Novo processo' : (vals.name || 'Processo sem nome')}
        </h2>
      </div>

      <div className="flex-1 p-6" style={{ background: '#0d1017' }}>
        <div className="max-w-3xl mx-auto" style={{ display: 'grid', gridTemplateColumns: '1fr 256px', gap: 20, alignItems: 'start' }}>
          {/* Form */}
          <form onSubmit={submit}>
            <div className="rounded-xl border border-border p-5 flex flex-col gap-5" style={{ background: '#111520' }}>
              <div>
                <p className="text-xs font-semibold text-foreground mb-0.5">Informações do processo</p>
                <p className="text-[11px] text-muted-foreground">Defina o nome e os metadados básicos.</p>
              </div>
              <div className="h-px bg-border"/>

              <ProcessFormField label="Nome do processo" required error={errs.name}>
                <input type="text" value={vals.name} onChange={e => sf('name', e.target.value)}
                  placeholder="Ex.: Aprovação de compras"
                  style={errs.name ? pInputErr : pInputBase}
                  onFocus={e => { e.target.style.borderColor = errs.name ? 'rgba(220,38,38,0.60)' : 'rgba(255,255,255,0.20)' }}
                  onBlur={e => { e.target.style.borderColor = errs.name ? 'rgba(220,38,38,0.60)' : 'rgba(255,255,255,0.09)' }}/>
              </ProcessFormField>

              <ProcessFormField label="Nome da empresa" required error={errs.companyName}>
                <input type="text" value={vals.companyName} onChange={e => sf('companyName', e.target.value)}
                  placeholder="Ex.: Acme Indústria Ltda."
                  style={errs.companyName ? pInputErr : pInputBase}
                  onFocus={e => { e.target.style.borderColor = errs.companyName ? 'rgba(220,38,38,0.60)' : 'rgba(255,255,255,0.20)' }}
                  onBlur={e => { e.target.style.borderColor = errs.companyName ? 'rgba(220,38,38,0.60)' : 'rgba(255,255,255,0.09)' }}/>
              </ProcessFormField>

              <ProcessFormField label="Descrição">
                <textarea value={vals.description} onChange={e => sf('description', e.target.value)}
                  placeholder="Descreva o objetivo e o escopo deste processo…" rows={4}
                  style={{ ...pInputBase, resize: 'vertical', minHeight: 88, lineHeight: 1.6 }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.20)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}/>
              </ProcessFormField>

              <ProcessFormField label="Setor">
                <select value={vals.sector} onChange={e => sf('sector', e.target.value)}
                  style={{ ...pInputBase, cursor: 'pointer', appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 32 }}>
                  <option value="">Selecionar setor…</option>
                  {PROCESS_SECTORS.map(s => <option key={s} value={s} style={{ background: '#0d1017' }}>{s}</option>)}
                </select>
              </ProcessFormField>

              <div className="flex items-center gap-3 pt-1">
                <button type="submit"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.09)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.14)' }}
                  onMouseEnter={e => ((e.currentTarget).style.background = 'rgba(255,255,255,0.14)')}
                  onMouseLeave={e => ((e.currentTarget).style.background = 'rgba(255,255,255,0.09)')}>
                  {saved ? '✓  Salvo' : 'Salvar'}
                </button>
                {saved && <span className="text-[11px] text-emerald-400">Alterações salvas com sucesso.</span>}
              </div>
            </div>
          </form>

          {/* Sidebar */}
          <div className="flex flex-col gap-3">
            {/* Próximos passos */}
            <div className="rounded-xl border border-border p-4 flex flex-col gap-3" style={{ background: '#111520' }}>
              <p className="text-xs font-semibold text-foreground">Próximos passos</p>
              <div className="flex flex-col gap-2">
                {nextSteps.map((s,i) => (
                  <div key={i} className="flex items-center gap-2" style={{ opacity: 0.4 }}>
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{ border: '1px dashed rgba(255,255,255,0.15)' }}>
                      📎
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">{s}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Disponíveis após salvar.</p>
            </div>

            {/* Métricas */}
            <div className="rounded-xl border border-border p-4 flex flex-col" style={{ background: '#111520' }}>
              <p className="text-xs font-semibold text-foreground mb-3">Métricas</p>
              {metrics.map((m,i) => (
                <div key={m.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-[11px] text-muted-foreground">{m.label}</span>
                  <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Danger zone */}
            {!isNew && (
              <div className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: '#111520', border: '1px solid rgba(153,27,27,0.20)' }}>
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#fca5a5' }}>Zona de perigo</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Ações irreversíveis.</p>
                </div>
                <button onClick={() => setShowDel(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors self-start"
                  style={{ background: 'rgba(153,27,27,0.15)', color: '#fca5a5', border: '1px solid rgba(153,27,27,0.35)' }}
                  onMouseEnter={e => ((e.currentTarget).style.background = 'rgba(153,27,27,0.30)')}
                  onMouseLeave={e => ((e.currentTarget).style.background = 'rgba(153,27,27,0.15)')}>
                  <Trash2 size={11}/>Excluir processo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDel && (
        <ProcessDeleteDialog
          name={process?.name ?? ''}
          onConfirm={() => { setShowDel(false); onDelete() }}
          onCancel={() => setShowDel(false)}
        />
      )}
    </div>
  )
}

function ProcessosPanel({ processes, setProcesses }) {
  const [subView, setSubView] = useState({ kind: 'dashboard' })

  function handleSave(vals) {
    const today = new Date().toISOString().slice(0, 10)
    if (subView.kind === 'detail') {
      if (subView.pid === null) {
        const newId = `pr_${Date.now()}`
        setProcesses(prev => [
          {
            id: newId,
            name: vals.name,
            companyName: vals.companyName,
            description: vals.description,
            sector: vals.sector,
            updatedAt: today,
            activities: 0,
            eventLogs: 0,
            mappingStatus: 'Não iniciado'
          },
          ...prev
        ])
        setSubView({ kind: 'detail', pid: newId })
      } else {
        setProcesses(prev => prev.map(p => p.id === subView.pid ? { ...p, ...vals, updatedAt: today } : p))
      }
    }
  }

  function handleDelete() {
    if (subView.kind === 'detail' && subView.pid) {
      setProcesses(prev => prev.filter(p => p.id !== subView.pid))
      setSubView({ kind: 'dashboard' })
    }
  }

  const currentProcess = subView.kind === 'detail' && subView.pid
    ? (processes.find(p => p.id === subView.pid) ?? null)
    : null

  if (subView.kind === 'detail') {
    return (
      <ProcessDetailView
        process={currentProcess}
        onBack={() => setSubView({ kind: 'dashboard' })}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#0d1017' }}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#f59e0b', fontFamily: "'JetBrains Mono',monospace" }}>
            UC2 · Manter processo
          </p>
          <h2 className="text-sm font-semibold text-foreground" style={{ letterSpacing: '-0.01em' }}>Painel principal</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Crie e gerencie processos antes de enviar logs de eventos.</p>
        </div>
        <button onClick={() => setSubView({ kind: 'detail', pid: null })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.12)' }}
          onMouseEnter={e => ((e.currentTarget).style.background = 'rgba(255,255,255,0.14)')}
          onMouseLeave={e => ((e.currentTarget).style.background = 'rgba(255,255,255,0.08)')}>
          <Plus size={12}/>Criar processo
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {processes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="rounded-2xl border border-border p-10 flex flex-col items-center gap-5 max-w-xs text-center" style={{ background: '#111520' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.10)' }}>
                <FileText size={20} className="text-muted-foreground"/>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground" style={{ letterSpacing: '-0.01em' }}>Nenhum processo ainda</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Crie seu primeiro processo para começar a enviar logs e analisar fluxos de trabalho.</p>
              </div>
              <button onClick={() => setSubView({ kind: 'detail', pid: null })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.12)' }}
                onMouseEnter={e => ((e.currentTarget).style.background = 'rgba(255,255,255,0.14)')}
                onMouseLeave={e => ((e.currentTarget).style.background = 'rgba(255,255,255,0.08)')}>
                <Plus size={12}/>Criar processo
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              {processes.length} processo{processes.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {processes.map(p => (
                <ProcessCard key={p.id} process={p} onOpen={() => setSubView({ kind: 'detail', pid: p.id })}/>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [processes, setProcesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.listProcesses()
      .then(setProcesses)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os processos.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ background: '#0d1017', padding: '2rem', minHeight: 'calc(100vh - 52px)' }}>
        <p className="text-sm text-muted-foreground">Carregando processos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ background: '#0d1017', padding: '2rem', minHeight: 'calc(100vh - 52px)' }}>
        <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(220,38,38,0.10)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.25)' }}>
          {error}
        </div>
      </div>
    )
  }

  return <ProcessosPanel processes={processes} setProcesses={setProcesses} />
}
