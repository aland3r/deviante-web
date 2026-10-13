import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { maintenanceSubject } from '../../lib/maintenanceSubject'

// Observador do maintenanceSubject: contador de manutenções planejadas no menu.
export default function PlannedMaintenanceBadge() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const refresh = () => api.listSchedules({ status: 'planned' }).then((rows) => setCount(rows.filter((row) => row.status === 'planned').length)).catch(() => setCount(0))
    refresh()
    return maintenanceSubject.subscribe({ update: refresh })
  }, [])
  if (!count) return null
  return <span className="ml-1.5 px-1.5 rounded-full text-[9px] font-semibold text-white" style={{ background: 'var(--ok-strong)' }}>{count}</span>
}
