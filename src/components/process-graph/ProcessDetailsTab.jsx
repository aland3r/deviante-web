import { useState } from 'react'
import { AlertCircle, Lock, Trash2, X } from 'lucide-react'
import { api, ApiError } from '../../lib/api'

/*
  "Processos" tab — process metadata form + danger zone.

  Ported from the Figma Make export "Process Mining Canvas Design"
  (ZZKdwxgmeCNJFG64zGbADe), Version 20, `ProcessDetailView`. In the
  export this form lives inside
  the canvas shell as a tab, not as a standalone route — which is why the
  old `/processes/:id` ProcessDetailPage was removed in favour of this.

  Wired to the real Kotlin-backed API: Figma's mock field `company` maps
  to the real `companyName`. Figma's `activities`/`eventLogs`/
  `mappingStatus` have no equivalent on the real ProcessDto yet (UC3/UC4
  not built), so the Métricas card shows placeholders and says so.

  Its own "Voltar ao painel" header from the export is dropped — the
  canvas header above already owns "← Projetos".
*/

const PROCESS_SECTORS = [
  'Atendimento', 'Compras', 'Financeiro', 'Jurídico',
  'Logística', 'Marketing', 'Operações', 'RH', 'TI', 'Outros',
]

const NEXT_STEPS = [
  'Vincular máquinas ao processo',
  'Enviar log de eventos',
  'Analisar mapeamento de deriva',
]

const pInputBase = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.09)',
  background: '#0d1017', color: '#e2e8f0',
  fontFamily: "'Inter',sans-serif", fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
const pInputErr = { ...pInputBase, borderColor: 'rgba(220,38,38,0.60)' }

function ProcessFormField({ label, error, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-[11px] text-red-400 flex items-center gap-1"><AlertCircle size={10} />{error}</span>}
    </div>
  )
}

function ProcessDeleteDialog({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0" style={{ background: 'rgba(3,5,9,0.82)' }} onClick={onCancel} />
      <div className="relative rounded-2xl border border-border p-7 max-w-sm w-full flex flex-col gap-5"
        style={{ background: '#161c28', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(153,27,27,0.15)', border: '1px solid rgba(153,27,27,0.30)' }}>
          <Trash2 size={18} color="#f87171" />
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
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            style={{ background: 'rgba(153,27,27,0.20)', color: '#fca5a5', border: '1px solid rgba(153,27,27,0.40)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(153,27,27,0.35)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(153,27,27,0.20)' }}>
            <Trash2 size={11} />Excluir processo
          </button>
        </div>
        <button onClick={onCancel} className="absolute top-4 right-4 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <X size={13} />
        </button>
      </div>
    </div>
  )
}

export default function ProcessDetailsTab({ process, onSaved, onDeleted }) {
  const [vals, setVals] = useState({
    name: process.name ?? '',
    company: process.companyName ?? '',
    description: process.description ?? '',
    sector: process.sector ?? '',
  })
  const [errs, setErrs] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDel, setShowDel] = useState(false)

  // A sector saved before this select existed (or seeded server-side) must
  // still show up instead of silently falling back to the empty option.
  const sectorOptions = vals.sector && !PROCESS_SECTORS.includes(vals.sector)
    ? [vals.sector, ...PROCESS_SECTORS]
    : PROCESS_SECTORS

  function sf(key, value) {
    setVals((prev) => ({ ...prev, [key]: value }))
    if (errs[key]) setErrs((prev) => ({ ...prev, [key]: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    const next = {}
    if (!vals.name.trim()) next.name = 'Campo obrigatório.'
    if (!vals.company.trim()) next.company = 'Campo obrigatório.'
    if (Object.keys(next).length) { setErrs(next); return }

    setSaving(true)
    setErrs({})
    setError('')
    try {
      const updated = await api.updateProcess(process.id, {
        name: vals.name, companyName: vals.company, description: vals.description, sector: vals.sector,
      })
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setErrs(err.fieldErrors ?? {})
      } else {
        setError('Não foi possível salvar os detalhes do processo.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setShowDel(false)
    try {
      await api.deleteProcess(process.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir este processo.')
    }
  }

  const companyErr = errs.company ?? errs.companyName

  return (
    <div className="flex-1 min-w-0 overflow-y-auto" style={{ background: '#0d1017' }}>
      <div className="p-6">
        <div className="max-w-3xl mx-auto" style={{ display: 'grid', gridTemplateColumns: '1fr 256px', gap: 20, alignItems: 'start' }}>
          <form onSubmit={submit}>
            <div className="rounded-xl border border-border p-5 flex flex-col gap-5" style={{ background: '#111520' }}>
              <div>
                <p className="text-xs font-semibold text-foreground mb-0.5">Informações do processo</p>
                <p className="text-[11px] text-muted-foreground">Defina o nome e os metadados básicos.</p>
              </div>
              <div className="h-px bg-border" />

              {error ? <p className="text-[11px]" style={{ color: '#fca5a5' }}>{error}</p> : null}

              <ProcessFormField label="Nome do processo" required error={errs.name}>
                <input type="text" value={vals.name} onChange={(e) => sf('name', e.target.value)}
                  placeholder="Ex.: Aprovação de compras" maxLength={100}
                  style={errs.name ? pInputErr : pInputBase}
                  onFocus={(e) => { e.target.style.borderColor = errs.name ? 'rgba(220,38,38,0.60)' : 'rgba(255,255,255,0.20)' }}
                  onBlur={(e) => { e.target.style.borderColor = errs.name ? 'rgba(220,38,38,0.60)' : 'rgba(255,255,255,0.09)' }} />
              </ProcessFormField>

              <ProcessFormField label="Nome da empresa" required error={companyErr}>
                <input type="text" value={vals.company} onChange={(e) => sf('company', e.target.value)}
                  placeholder="Ex.: Acme Indústria Ltda." maxLength={255}
                  style={companyErr ? pInputErr : pInputBase}
                  onFocus={(e) => { e.target.style.borderColor = companyErr ? 'rgba(220,38,38,0.60)' : 'rgba(255,255,255,0.20)' }}
                  onBlur={(e) => { e.target.style.borderColor = companyErr ? 'rgba(220,38,38,0.60)' : 'rgba(255,255,255,0.09)' }} />
              </ProcessFormField>

              <ProcessFormField label="Descrição">
                <textarea value={vals.description} onChange={(e) => sf('description', e.target.value)}
                  placeholder="Descreva o objetivo e o escopo deste processo…" rows={4}
                  style={{ ...pInputBase, resize: 'vertical', minHeight: 88, lineHeight: 1.6 }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.20)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }} />
              </ProcessFormField>

              <ProcessFormField label="Setor">
                <select value={vals.sector} onChange={(e) => sf('sector', e.target.value)}
                  style={{
                    ...pInputBase, cursor: 'pointer', appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 32,
                  }}>
                  <option value="">Selecionar setor…</option>
                  {sectorOptions.map((s) => <option key={s} value={s} style={{ background: '#0d1017' }}>{s}</option>)}
                </select>
              </ProcessFormField>

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: 'rgba(255,255,255,0.09)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.14)', opacity: saving ? 0.6 : 1 }}
                  onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'rgba(255,255,255,0.14)' }}
                  onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = 'rgba(255,255,255,0.09)' }}>
                  {saving ? 'Salvando…' : saved ? '✓  Salvo' : 'Salvar'}
                </button>
                {saved && <span className="text-[11px] text-emerald-400">Alterações salvas com sucesso.</span>}
              </div>
            </div>
          </form>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border p-4 flex flex-col gap-3" style={{ background: '#111520' }}>
              <p className="text-xs font-semibold text-foreground">Próximos passos</p>
              <div className="flex flex-col gap-2">
                {NEXT_STEPS.map((s) => (
                  <div key={s} className="flex items-center gap-2" style={{ opacity: 0.4 }}>
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ border: '1px dashed rgba(255,255,255,0.15)' }}>
                      <Lock size={8} color="#64748b" />
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">{s}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Disponíveis após enviar um log.</p>
            </div>

            <div className="rounded-xl border border-border p-4 flex flex-col" style={{ background: '#111520' }}>
              <p className="text-xs font-semibold text-foreground mb-3">Métricas</p>
              {[
                { label: 'Atividades', value: '0' },
                { label: 'Logs de eventos', value: '0' },
                { label: 'Status do mapeamento', value: 'Não iniciado' },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-[11px] text-muted-foreground">{m.label}</span>
                  <span className="text-[11px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</span>
                </div>
              ))}
              <p className="text-[10px] mt-3" style={{ color: '#f59e0b', fontFamily: "'JetBrains Mono',monospace" }}>
                Ainda sem origem real — a API não expõe esses contadores.
              </p>
            </div>

            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: '#111520', border: '1px solid rgba(153,27,27,0.20)' }}>
              <div>
                <p className="text-xs font-semibold" style={{ color: '#fca5a5' }}>Zona de perigo</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ações irreversíveis.</p>
              </div>
              <button onClick={() => setShowDel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors self-start"
                style={{ background: 'rgba(153,27,27,0.15)', color: '#fca5a5', border: '1px solid rgba(153,27,27,0.35)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(153,27,27,0.30)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(153,27,27,0.15)' }}>
                <Trash2 size={11} />Excluir processo
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDel && (
        <ProcessDeleteDialog name={vals.name} onConfirm={handleDelete} onCancel={() => setShowDel(false)} />
      )}
    </div>
  )
}
