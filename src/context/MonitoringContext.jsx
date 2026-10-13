import { createContext, useContext, useEffect, useState } from 'react'
import { driftSubject } from '../lib/driftSubject'

const MonitoringContext = createContext({})

/**
 * Observer: guarda, para o app inteiro, o último estado de drift de cada
 * processo. Telas fora da análise (o cabeçalho do processo) leem daqui.
 */
export function MonitoringProvider({ children }) {
  const [byProcess, setByProcess] = useState({})

  useEffect(() => driftSubject.subscribe({
    update: (event) => setByProcess((current) => ({
      ...current,
      [event.processId]: { hasDrift: event.type === 'drift-detected', drifts: event.drifts.length, at: new Date().toISOString() },
    })),
  }), [])

  return <MonitoringContext.Provider value={byProcess}>{children}</MonitoringContext.Provider>
}

export function useProcessDriftStatus(processId) {
  return useContext(MonitoringContext)[processId] ?? null
}
