import { X } from 'lucide-react'

/*
  Moldura reutilizável dos formulários em modal (Equipamento, Agenda e
  Atividade). Antes cada tela repetia o fundo escuro, o cabeçalho com fechar,
  o rodapé com Cancelar/Salvar e as classes de cada campo; agora só declara os
  campos. É a técnica de compactação por reuso da entrega Reuso 03 (item 03).
*/
const inputClass = 'px-3 py-2 rounded-lg border border-border text-xs text-foreground'
const inputStyle = { background: 'var(--surface-base)' }

export function Field({ label, wide = false, children }) {
  return <label className={`flex flex-col gap-1 text-[10px] text-muted-foreground ${wide ? 'sm:col-span-2' : ''}`}>{label}{children}</label>
}

export function TextInput(props) {
  return <input {...props} className={inputClass} style={inputStyle} />
}

export function Select({ children, ...props }) {
  return <select {...props} className={inputClass} style={inputStyle}>{children}</select>
}

export function TextArea(props) {
  return <textarea rows={3} {...props} className={inputClass} style={inputStyle} />
}

export default function FormModal({
  title, subtitle, onClose, onSubmit, busy = false, canSubmit = true,
  submitLabel = 'Salvar', error = '', footerStart = null, columns = 2, children,
}) {
  const submit = (event) => { event.preventDefault(); if (canSubmit && !busy) onSubmit() }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,6,12,.78)' }}>
      <form onSubmit={submit} className="w-full rounded-xl border border-border" style={{ maxWidth: 480, background: 'var(--surface-raised)' }}>
        <div className="flex justify-between px-4 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"><X size={13} /></button>
        </div>
        <div className={`grid gap-3 p-4 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
          {children}
          {error && <p className={`text-[11px] ${columns === 2 ? 'sm:col-span-2' : ''}`} style={{ color: 'var(--crit-soft)' }}>{error}</p>}
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          {footerStart}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs text-muted-foreground">Cancelar</button>
          <button disabled={busy || !canSubmit} className="px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ background: 'var(--ok-strong)' }}>{busy ? 'Salvando…' : submitLabel}</button>
        </div>
      </form>
    </div>
  )
}
