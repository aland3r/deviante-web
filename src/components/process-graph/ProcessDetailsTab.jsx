import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronRight, Link2, Lock, RadioTower, Trash2, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api, ApiError } from '../../lib/api'
import { deriveMachineStatus } from '../../lib/monitoring'

/*
  "Processos" tab — process metadata form + danger zone.

  Ported from the Figma Make export "Process Mining Canvas Design"
  (ZZKdwxgmeCNJFG64zGbADe), Version 20, `ProcessDetailView`. In the
  export this form lives inside
  the canvas shell as a tab, not as a standalone route — which is why the
  old `/processes/:id` ProcessDetailPage was removed in favour of this.

  Wired to the real Kotlin-backed API: Figma's mock field `company` maps
  to the persisted process metadata. Figma's `activities`/`eventLogs`/
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
  border: '1px solid var(--hairline-strong)',
  background: 'var(--surface-base)', color: 'var(--text-strong)',
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

const DELETE_PHRASE = 'quero excluir este processo'

function ProcessDeleteDialog({ name, onConfirm, onCancel }) {
  const [processName, setProcessName] = useState('')
  const [confirmationPhrase, setConfirmationPhrase] = useState('')
  const canDelete = processName === name && confirmationPhrase === DELETE_PHRASE

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0" style={{ background: 'rgba(3,5,9,0.82)' }} onClick={onCancel} />
      <div className="relative rounded-2xl border border-border p-7 max-w-sm w-full flex flex-col gap-5"
        style={{ background: 'var(--surface)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(153,27,27,0.15)', border: '1px solid rgba(153,27,27,0.30)' }}>
          <Trash2 size={18} color="#f87171" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-foreground" style={{ letterSpacing: '-0.01em' }}>Excluir processo?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O processo <strong className="text-foreground">&ldquo;{name}&rdquo;</strong>, seus logs, mapeamentos, traços e análises serão excluídos permanentemente. O catálogo global de atividades será preservado.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Digite o nome exato do processo
            <input
              autoFocus
              value={processName}
              onChange={(event) => setProcessName(event.target.value)}
              style={pInputBase}
              aria-label="Nome do processo para confirmação"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Digite <strong className="text-foreground">{DELETE_PHRASE}</strong>
            <input
              value={confirmationPhrase}
              onChange={(event) => setConfirmationPhrase(event.target.value)}
              style={pInputBase}
              aria-label="Frase para confirmação"
            />
          </label>
        </div>
        <div className="flex gap-2.5 justify-end">
          <button onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ border: '1px solid var(--overlay-strong)', color: 'var(--text)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--overlay)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
            Cancelar
          </button>
          <button
            onClick={() => onConfirm({ processName, confirmationPhrase })}
            disabled={!canDelete}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            style={{ background: 'rgba(153,27,27,0.20)', color: 'var(--crit-soft)', border: '1px solid rgba(153,27,27,0.40)', opacity: canDelete ? 1 : 0.45, cursor: canDelete ? 'pointer' : 'not-allowed' }}
            onMouseEnter={(e) => { if (canDelete) e.currentTarget.style.background = 'rgba(153,27,27,0.35)' }}
            onMouseLeave={(e) => { if (canDelete) e.currentTarget.style.background = 'rgba(153,27,27,0.20)' }}>
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

const MACHINE_STATUS_COLOR = { healthy: 'var(--success)', watch: 'var(--warn)', critical: 'var(--danger)', unknown: 'var(--muted-foreground)' }

/**
 * Machines linked to this process — the process side of the bidirectional
 * link the monitoring feature owns. Association is stored on the machine
 * (`relatedProcessId`); here the Manager attaches an existing machine and
 * jumps straight to its monitoring detail.
 */
function MachinesPanel({ processId }) {
  const navigate = useNavigate()
  const [linked, setLinked] = useState([])
  const [all, setAll] = useState([])
  const [picking, setPicking] = useState(false)

  async function reload() {
    const [linkedRows, allRows] = await Promise.all([
      api.listMachinesForProcess(processId).catch(() => []),
      api.listAllMachines().catch(() => []),
    ])
    setLinked(linkedRows)
    setAll(allRows)
  }

  useEffect(() => { reload() }, [processId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function link(machine) {
    await api.linkProcessEquipment(processId, machine.id)
    setPicking(false)
    reload()
  }

  const available = all.filter((machine) => !linked.some((item) => item.id === machine.id))

  return (
    <div className="rounded-xl border border-border p-4 flex flex-col gap-3" style={{ background: 'var(--surface-raised)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><RadioTower size={12} color="var(--ok-strong)" />Máquinas</p>
        <button type="button" onClick={() => setPicking((open) => !open)} className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1" style={{ background: 'transparent', border: 0, cursor: 'pointer' }}>
          <Link2 size={11} />Vincular
        </button>
      </div>

      {picking && (
        <div className="rounded-lg border border-border overflow-hidden" style={{ background: 'var(--surface-base)' }}>
          {available.length ? available.map((machine) => (
            <button key={machine.id} type="button" onClick={() => link(machine)} className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-secondary/40 text-left" style={{ background: 'transparent', border: 0, cursor: 'pointer' }}>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-foreground truncate">{machine.name}</span>
                <span className="block text-[9px] text-muted-foreground truncate" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{machine.monitoringName}{machine.relatedProcessName ? ` · ${machine.relatedProcessName}` : ''}</span>
              </span>
              <Link2 size={11} className="text-muted-foreground shrink-0" />
            </button>
          )) : <p className="px-3 py-3 text-[10px] text-muted-foreground text-center">Nenhuma máquina disponível. Crie um monitoramento primeiro.</p>}
        </div>
      )}

      {linked.length ? (
        <div className="flex flex-col gap-1.5">
          {linked.map((machine) => (
            <button key={machine.id} type="button" onClick={() => navigate(`/equipment/${machine.id}`)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors" style={{ background: 'var(--surface-base)', border: '1px solid var(--hairline)', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--hairline)' }}>
              <i className="rounded-full shrink-0" style={{ width: 7, height: 7, background: MACHINE_STATUS_COLOR[deriveMachineStatus(machine)] }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-foreground truncate">{machine.name}</span>
                <span className="block text-[9px] text-muted-foreground truncate" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{machine.tag || machine.monitoringName}</span>
              </span>
              <ChevronRight size={12} className="text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      ) : !picking ? (
        <p className="text-[10px] text-muted-foreground">Nenhuma máquina vinculada. Associe uma máquina monitorada a este processo.</p>
      ) : null}
    </div>
  )
}

export default function ProcessDetailsTab({ process, onSaved, onDeleted }) {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'
  const [vals, setVals] = useState({
    name: process.name ?? '',
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
    if (Object.keys(next).length) { setErrs(next); return }

    setSaving(true)
    setErrs({})
    setError('')
    try {
      const updated = await api.updateProcess(process.id, {
        name: vals.name, description: vals.description, sector: vals.sector,
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

  async function handleDelete(confirmation) {
    try {
      await api.deleteProcess(process.id, confirmation)
      setShowDel(false)
      onDeleted()
    } catch (err) {
      setShowDel(false)
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir este processo.')
    }
  }

  return (
    <div className="flex-1 min-w-0 overflow-y-auto" style={{ background: 'var(--surface-base)' }}>
      <div className="p-6">
        <div className="max-w-3xl mx-auto" style={{ display: 'grid', gridTemplateColumns: '1fr 256px', gap: 20, alignItems: 'start' }}>
          <form onSubmit={submit}>
            <div className="rounded-xl border border-border p-5 flex flex-col gap-5" style={{ background: 'var(--surface-raised)' }}>
              <div>
                <p className="text-xs font-semibold text-foreground mb-0.5">Informações do processo</p>
                <p className="text-[11px] text-muted-foreground">Defina o nome e os metadados básicos.</p>
              </div>
              <div className="h-px bg-border" />

              {error ? <p className="text-[11px]" style={{ color: 'var(--crit-soft)' }}>{error}</p> : null}

              <ProcessFormField label="Nome do processo" required error={errs.name}>
                <input type="text" value={vals.name} onChange={(e) => sf('name', e.target.value)}
                  placeholder="Ex.: Aprovação de compras" maxLength={100}
                  style={errs.name ? pInputErr : pInputBase}
                  onFocus={(e) => { e.target.style.borderColor = errs.name ? 'rgba(220,38,38,0.60)' : 'var(--hairline-strong)' }}
                  onBlur={(e) => { e.target.style.borderColor = errs.name ? 'rgba(220,38,38,0.60)' : 'var(--hairline-strong)' }} />
              </ProcessFormField>

              <ProcessFormField label="Descrição">
                <textarea value={vals.description} onChange={(e) => sf('description', e.target.value)}
                  placeholder="Descreva o objetivo e o escopo deste processo…" rows={4}
                  style={{ ...pInputBase, resize: 'vertical', minHeight: 88, lineHeight: 1.6 }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--hairline-strong)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--hairline-strong)' }} />
              </ProcessFormField>

              <ProcessFormField label="Setor">
                <select value={vals.sector} onChange={(e) => sf('sector', e.target.value)}
                  style={{
                    ...pInputBase, cursor: 'pointer', appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 32,
                  }}>
                  <option value="">Selecionar setor…</option>
                  {sectorOptions.map((s) => <option key={s} value={s} style={{ background: 'var(--surface-base)' }}>{s}</option>)}
                </select>
              </ProcessFormField>

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: 'var(--hairline-strong)', color: 'var(--text-strong)', border: '1px solid var(--hairline-strong)', opacity: saving ? 0.6 : 1 }}
                  onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'var(--hairline-strong)' }}
                  onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = 'var(--hairline-strong)' }}>
                  {saving ? 'Salvando…' : saved ? '✓  Salvo' : 'Salvar'}
                </button>
                {saved && <span className="text-[11px] text-emerald-400">Alterações salvas com sucesso.</span>}
              </div>
            </div>
          </form>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border p-4 flex flex-col gap-3" style={{ background: 'var(--surface-raised)' }}>
              <p className="text-xs font-semibold text-foreground">Próximos passos</p>
              <div className="flex flex-col gap-2">
                {NEXT_STEPS.map((s) => (
                  <div key={s} className="flex items-center gap-2" style={{ opacity: 0.4 }}>
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ border: '1px dashed var(--hairline-strong)' }}>
                      <Lock size={8} color="var(--muted-foreground)" />
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-tight">{s}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>Disponíveis após enviar um log.</p>
            </div>

            <MachinesPanel processId={process.id} />

            <div className="rounded-xl border border-border p-4 flex flex-col" style={{ background: 'var(--surface-raised)' }}>
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
              <p className="text-[10px] mt-3" style={{ color: 'var(--warn)', fontFamily: "'JetBrains Mono',monospace" }}>
                Ainda sem origem real — a API não expõe esses contadores.
              </p>
            </div>

            {isOwner && (
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface-raised)', border: '1px solid rgba(153,27,27,0.20)' }}>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--crit-soft)' }}>Zona de perigo</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Ações irreversíveis.</p>
                </div>
                <button onClick={() => setShowDel(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors self-start"
                  style={{ background: 'rgba(153,27,27,0.15)', color: 'var(--crit-soft)', border: '1px solid rgba(153,27,27,0.35)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(153,27,27,0.30)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(153,27,27,0.15)' }}>
                  <Trash2 size={11} />Excluir processo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDel && (
        <ProcessDeleteDialog name={vals.name} onConfirm={handleDelete} onCancel={() => setShowDel(false)} />
      )}
    </div>
  )
}
