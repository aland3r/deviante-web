/**
 * Presentation-only helpers for equipment health.
 *
 * Monitoring persistence is API-owned (see lib/api.js). Keeping these pure
 * helpers separate lets cards derive a conservative status without creating a
 * second client-side source of truth.
 */

export const MACHINE_KINDS = [
  { id: 'torno', label: 'Torno CNC' },
  { id: 'fresadora', label: 'Fresadora' },
  { id: 'compressor', label: 'Compressor' },
  { id: 'esteira', label: 'Esteira / Transportador' },
  { id: 'generico', label: 'Equipamento genérico' },
]

export function parameterLatest(parameter) {
  const series = parameter?.series ?? parameter?.readings ?? []
  const last = series[series.length - 1]
  return last?.v ?? last?.value ?? parameter?.latestValue ?? null
}

export function parameterStatus(parameter) {
  if (parameter?.status) return parameter.status
  const value = parameterLatest(parameter)
  if (value == null) return 'unknown'
  if (parameter.crit != null && value >= parameter.crit) return 'critical'
  if (parameter.warn != null && value >= parameter.warn) return 'watch'
  return 'healthy'
}

export function deriveMachineStatus(machine) {
  if (machine?.healthStatus) return machine.healthStatus
  const order = { critical: 3, watch: 2, healthy: 1, unknown: 0 }
  const parameters = machine?.parameters ?? []
  if (!parameters.length) return machine?.status ?? 'unknown'
  return parameters.reduce((worst, parameter) => {
    const status = parameterStatus(parameter)
    return order[status] > order[worst] ? status : worst
  }, 'unknown')
}

