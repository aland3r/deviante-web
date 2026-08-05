import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronRight, Cpu, Gauge, MapPin, Plus, RadioTower, X,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { MACHINE_KINDS, deriveMachineStatus } from '../lib/monitoring'
import MachineIllustration from '../components/monitoring/MachineIllustration'
import ProjectActionsMenu from '../components/projects/ProjectActionsMenu'

const STATUS = {
  healthy: { label: 'Saudável', color: 'var(--success)', soft: 'rgba(16,185,129,0.14)' },
  watch: { label: 'Atenção', color: 'var(--warn)', soft: 'rgba(245,158,11,0.14)' },
  critical: { label: 'Crítico', color: 'var(--danger)', soft: 'rgba(220,38,38,0.14)' },
  unknown: { label: 'Sem dados', color: 'var(--muted-foreground)', soft: 'rgba(100,116,139,0.14)' },
}

const inputBase = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--hairline-strong)', background: 'var(--surface-base)', color: 'var(--text-strong)',
  fontFamily: "'Inter',sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

function StatusPill({ status }) {
  const meta = STATUS[status] ?? STATUS.unknown
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ background: meta.soft, color: meta.color }}>
      <i className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />{meta.label}
    </span>
  )
}

function AddMachineModal({ onClose, onCreate }) {
  const [vals, setVals] = useState({ name: '', kind: 'torno', manufacturer: '', model: '', tag: '', location: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key, value) => setVals((prev) => ({ ...prev, [key]: value }))

  async function submit(event) {
    event.preventDefault()
    if (!vals.name.trim()) return
    setBusy(true)
    setError('')
    try {
      await onCreate(vals)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível cadastrar a máquina.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,6,12,0.78)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form onSubmit={submit} className="w-full border border-border" role="dialog" aria-modal="true"
        style={{ maxWidth: 460, borderRadius: 8, background: 'var(--surface-raised)', boxShadow: '0 24px 70px rgba(0,0,0,0.55)' }}>
        <div className="flex items-start justify-between gap-4 px-4 py-3.5 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Adicionar máquina</h2>
            <p className="text-[11px] text-muted-foreground mt-1">Cadastro simples do equipamento e sua identificação.</p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary"><X size={13} /></button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {error && <p className="rounded-lg border px-3 py-2 text-[11px]" style={{ color: 'var(--crit-soft)', borderColor: 'rgba(220,38,38,.25)', background: 'rgba(220,38,38,.10)' }}>{error}</p>}
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Nome da máquina *
            <input autoFocus value={vals.name} onChange={(e) => set('name', e.target.value)} style={inputBase} placeholder="Ex.: Torno CNC Prod1" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Tipo
            <select value={vals.kind} onChange={(e) => set('kind', e.target.value)} style={{ ...inputBase, cursor: 'pointer' }}>
              {MACHINE_KINDS.map((k) => <option key={k.id} value={k.id} style={{ background: 'var(--surface-base)' }}>{k.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Fabricante
              <input value={vals.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} style={inputBase} placeholder="Ex.: Romi" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Modelo
              <input value={vals.model} onChange={(e) => set('model', e.target.value)} style={inputBase} placeholder="Ex.: GL 240" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              TAG / Patrimônio
              <input value={vals.tag} onChange={(e) => set('tag', e.target.value)} style={inputBase} placeholder="Ex.: TRN-01" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Localização
              <input value={vals.location} onChange={(e) => set('location', e.target.value)} style={inputBase} placeholder="Ex.: Célula 01" />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--overlay-strong)', color: 'var(--text)', background: 'transparent' }}>Cancelar</button>
          <button type="submit" disabled={busy || !vals.name.trim()} className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            style={{ background: 'var(--ok-strong)', color: 'white', opacity: busy || !vals.name.trim() ? 0.5 : 1 }}>
            <Plus size={14} />{busy ? 'Adicionando…' : 'Adicionar máquina'}
          </button>
        </div>
      </form>
    </div>
  )
}

function LinkEquipmentModal({ rows, onClose, onPick }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,6,12,0.78)' }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="w-full rounded-lg border border-border overflow-hidden" style={{ maxWidth: 460, background: 'var(--surface-raised)' }}><div className="flex items-center justify-between px-4 py-3 border-b border-border"><div><h2 className="text-sm font-semibold text-foreground">Associar equipamento</h2><p className="text-[11px] text-muted-foreground mt-1">O equipamento continua independente e pode estar em outros monitoramentos.</p></div><button onClick={onClose} className="text-muted-foreground"><X size={13} /></button></div><div className="p-2 max-h-96 overflow-y-auto">{rows.map((row) => <button key={row.id} onClick={() => onPick(row)} className="w-full px-3 py-2.5 rounded text-left hover:bg-secondary/40"><span className="block text-xs text-foreground">{row.name}</span><span className="block text-[10px] text-muted-foreground">{row.tag || row.location || 'Sem TAG'}</span></button>)}{!rows.length && <p className="p-6 text-center text-xs text-muted-foreground">Nenhum equipamento disponível.</p>}</div></div></div>
}

function MachineCard({ machine, focused }) {
  const status = deriveMachineStatus(machine)
  return (
    <Link to={`/equipment/${machine.id}`}
      data-machine-id={machine.id}
      style={{ display: 'block', background: focused ? 'linear-gradient(180deg,#072227,#0f2b34)' : 'linear-gradient(180deg,#071017,var(--surface-panel))', border: focused ? '1px solid var(--success)' : '1px solid var(--overlay)', borderRadius: 10, overflow: 'hidden', textDecoration: 'none', transition: 'transform 0.12s, box-shadow 0.12s', boxShadow: focused ? '0 8px 30px rgba(16,185,129,0.08)' : '0 8px 20px rgba(2,6,10,0.4)' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.35)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--overlay)' }}>
      <div style={{ height: 140, background: 'linear-gradient(180deg, rgba(2,6,10,0.04), transparent)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 12, top: 12, zIndex: 2, width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
          <RadioTower size={22} color={focused ? 'var(--success)' : '#7dd3fc'} />
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8 }}><StatusPill status={status} /></div>
        <div style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 1, opacity: 0.06 }}>
          <MachineIllustration kind={machine.kind} />
        </div>
      </div>
      <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--overlay-soft)' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-strong)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{machine.name}</span>
          <span style={{ fontSize: 11, color: 'var(--text)', background: 'var(--surface-inset)', padding: '4px 8px', borderRadius: 999 }}>{machine.tag || '—'}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: '#9fb0bd', fontFamily: "'JetBrains Mono',monospace" }}>
          <span className="flex items-center gap-1"><Gauge size={11} />{machine.parameters?.length ?? 0} parâm.</span>
          {machine.location && <span className="flex items-center gap-1 truncate"><MapPin size={11} />{machine.location}</span>}
        </div>
        {machine.relatedProcessName && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded text-[11px]" style={{ background: 'rgba(16,185,129,0.08)', color: '#60a5fa' }}>
            <Cpu size={12} />{machine.relatedProcessName}
          </div>
        )}
      </div>
    </Link>
  )
}

export default function MonitoringPage() {
  const { monitoringId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const focusMachineId = searchParams.get('focusMachine')
  const [monitoring, setMonitoring] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const [equipmentCatalog, setEquipmentCatalog] = useState([])
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  async function reload() {
    try {
      const data = await api.getMonitoring(monitoringId)
      if (!data) { setError('Monitoramento não encontrado.'); return }
      setMonitoring(data)
      setNameDraft(data.name)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o monitoramento.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [monitoringId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreateMachine(data) {
    await api.addMachine(monitoringId, data)
    setShowAdd(false)
    reload()
  }

  async function openLinkEquipment() {
    const rows = await api.listAllMachines()
    const linked = new Set((monitoring?.machines ?? []).map((item) => item.id))
    setEquipmentCatalog((Array.isArray(rows) ? rows : rows?.items ?? []).filter((item) => !linked.has(item.id)))
    setShowLink(true)
  }

  async function handleLinkEquipment(machine) {
    await api.linkMonitoringEquipment(monitoringId, machine.id)
    setShowLink(false)
    reload()
  }

  async function saveName() {
    setEditingName(false)
    if (nameDraft.trim() && nameDraft.trim() !== monitoring.name) {
      await api.updateMonitoring(monitoringId, { name: nameDraft })
      reload()
    }
  }

  async function deleteMonitoring() {
    if (!window.confirm(`Excluir o monitoramento “${monitoring.name}”? Esta ação não pode ser desfeita.`)) return
    try {
      await api.deleteMonitoring(monitoringId)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível excluir o monitoramento.')
    }
  }

  const machines = useMemo(() => monitoring?.machines ?? [], [monitoring])
  useEffect(() => {
    if (!loading && focusMachineId) {
      const el = document.querySelector(`[data-machine-id="${focusMachineId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [loading, focusMachineId, monitoring])
  const worstCount = useMemo(() => {
    const counts = { critical: 0, watch: 0, healthy: 0, unknown: 0 }
    for (const machine of machines) counts[deriveMachineStatus(machine)] += 1
    return counts
  }, [machines])

  if (loading) {
    return <div style={{ background: 'var(--surface-base)', minHeight: 'calc(100vh - 52px)', padding: 32 }}><p className="text-sm text-muted-foreground">Carregando…</p></div>
  }
  if (error) {
    return (
      <div style={{ background: 'var(--surface-base)', minHeight: 'calc(100vh - 52px)', padding: 32 }}>
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4" style={{ textDecoration: 'none' }}><ArrowLeft size={12} />Projetos</Link>
        <p className="text-sm" style={{ color: 'var(--crit-soft)' }}>{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ background: 'var(--surface-base)', margin: '-2rem calc(-50vw + 50%)', padding: '0 calc(50vw - 50%)', minHeight: 'calc(100vh - 52px)' }}>
      {showAdd && <AddMachineModal onClose={() => setShowAdd(false)} onCreate={handleCreateMachine} />}
      {showLink && <LinkEquipmentModal rows={equipmentCatalog} onClose={() => setShowLink(false)} onPick={handleLinkEquipment} />}
      <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8" style={{ maxWidth: 1120, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        <button type="button" onClick={() => navigate('/dashboard')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-5" style={{ background: 'transparent', border: 0, cursor: 'pointer' }}>
          <ArrowLeft size={12} />Projetos<ChevronRight size={12} color="var(--text-slate)" /><span className="text-foreground">Monitoramento</span>
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(5,150,105,0.12)', border: '1px solid rgba(16,185,129,0.24)', color: 'var(--ok-strong)' }}><RadioTower size={17} /></span>
              {editingName ? (
                <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onBlur={saveName}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameDraft(monitoring.name); setEditingName(false) } }}
                  style={{ ...inputBase, fontSize: 20, fontWeight: 700, maxWidth: 420, padding: '4px 8px' }} />
              ) : (
                <button type="button" onClick={() => setEditingName(true)} className="text-left" style={{ background: 'transparent', border: 0, cursor: 'text' }}>
                  <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 20, color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>{monitoring.name}</h1>
                </button>
              )}
              <ProjectActionsMenu onDelete={deleteMonitoring} deleteLabel="Excluir monitoramento" />
            </div>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              {machines.length} máquina{machines.length !== 1 ? 's' : ''}
              {worstCount.critical > 0 && <span style={{ color: 'var(--danger)' }}> · {worstCount.critical} crítica{worstCount.critical !== 1 ? 's' : ''}</span>}
              {worstCount.watch > 0 && <span style={{ color: 'var(--warn)' }}> · {worstCount.watch} em atenção</span>}
            </p>
          </div>
          <div className="flex gap-2"><button type="button" onClick={openLinkEquipment} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0" style={{ background: 'var(--surface-raised)', color: 'var(--text)', border: '1px solid var(--overlay-strong)' }}><Cpu size={16} />Associar existente</button><button type="button" onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0" style={{ background: 'var(--ok-strong)', color: 'white' }}><Plus size={16} />Novo equipamento</button></div>
        </div>

        {machines.length === 0 ? (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <RadioTower size={26} className="mx-auto mb-3" color="var(--text-slate)" />
            <p className="text-sm text-muted-foreground">Nenhuma máquina neste monitoramento ainda.</p>
            <button type="button" onClick={() => setShowAdd(true)} className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold" style={{ background: 'var(--ok-strong)', color: 'white' }}>
              <Plus size={16} />Adicionar a primeira máquina
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {machines.map((machine) => <MachineCard key={machine.id} focused={machine.id === focusMachineId} machine={{ ...machine, monitoringId }} />)}
          </div>
        )}
      </div>
    </div>
  )
}
