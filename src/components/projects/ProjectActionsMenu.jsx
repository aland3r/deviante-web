import { useEffect, useRef, useState } from 'react'
import { EllipsisVertical, Trash2 } from 'lucide-react'

export default function ProjectActionsMenu({ onDelete, deleteLabel = 'Excluir projeto', disabled = false }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((value) => !value)} disabled={disabled}
        aria-label="Ações do projeto" aria-expanded={open}
        className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40">
        <EllipsisVertical size={15} />
      </button>
      {open && (
        <div className="absolute z-50 top-full right-0 mt-1 min-w-44 rounded-md border border-border p-1"
          style={{ background: '#161c28', boxShadow: '0 12px 30px rgba(0,0,0,.45)' }}>
          <button type="button" onClick={() => { setOpen(false); onDelete?.() }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-left text-xs hover:bg-red-950/40"
            style={{ color: '#fca5a5' }}>
            <Trash2 size={13} />{deleteLabel}
          </button>
        </div>
      )}
    </div>
  )
}
