import {
  getCurrentAuthUser,
  loginWithGoogle,
  loginWithPassword,
  logoutAuth,
  updateAuthAccount,
} from './auth'
import {
  getProcesses,
  getSession,
  getUsers,
  saveProcesses,
  saveSession,
  saveUsers,
} from './storage'
import { getSupabase, isSupabaseConfigured } from './supabase'
import {
  validateEmail,
  validatePassword,
  validateProcessName,
  validateLanguageCode,
  validateBasedIn,
  validateRequired,
} from './validation'
import { ApiError } from './errors'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const MOCK_OWNER_EMAILS = new Set(['design@alander.io', 'alanderavila@gmail.com'])

function createId() {
  return crypto.randomUUID()
}

function findUserByEmail(email) {
  return getUsers().find((user) => user.email.toLowerCase() === email.toLowerCase())
}

function getCurrentUser() {
  const session = getSession()
  if (!session?.userId) return null
  return getUsers().find((user) => user.id === session.userId) ?? null
}

function validateRegistration(data, existingUserId) {
  const fieldErrors = {}

  const fullNameError = validateRequired(data.fullName, 'Nome completo')
  if (fullNameError) fieldErrors.fullName = fullNameError

  const emailError = validateEmail(data.email)
  if (emailError) fieldErrors.email = emailError

  if (!existingUserId) {
    const passwordError = validatePassword(data.password)
    if (passwordError) fieldErrors.password = passwordError
  } else if (data.password) {
    const passwordError = validatePassword(data.password)
    if (passwordError) fieldErrors.password = passwordError
  }

  const firstLanguageError = validateLanguageCode(data.firstLanguage, 'Idioma principal')
  if (firstLanguageError) fieldErrors.firstLanguage = firstLanguageError

  const targetLanguageError = validateLanguageCode(data.targetLanguage, 'Idioma de interface')
  if (targetLanguageError) fieldErrors.targetLanguage = targetLanguageError

  if (
    data.firstLanguage?.trim()
    && data.targetLanguage?.trim()
    && data.firstLanguage.trim() === data.targetLanguage.trim()
  ) {
    fieldErrors.targetLanguage = 'O idioma de interface deve ser diferente do idioma principal.'
  }

  const locationEnabled = Boolean(data.locationEnabled)
  const basedInError = validateBasedIn(data.basedIn, locationEnabled)
  if (basedInError) fieldErrors.basedIn = basedInError

  const emailOwner = findUserByEmail(data.email)
  if (emailOwner && emailOwner.id !== existingUserId) {
    fieldErrors.email = 'Já existe uma conta com este e-mail.'
  }

  return fieldErrors
}

const mockApi = {
  async login({ email, password }) {
    const user = findUserByEmail(email)
    if (!user || user.password !== password) {
      throw new ApiError('E-mail ou senha inválidos.')
    }

    const session = { userId: user.id, createdAt: new Date().toISOString() }
    saveSession(session)
    return { user: sanitizeUser(user) }
  },

  async getCurrentUser() {
    const user = getCurrentUser()
    if (!user) return null
    return sanitizeUser(user)
  },

  async updateAccount(data) {
    const current = getCurrentUser()
    if (!current) throw new ApiError('Você precisa estar autenticado.')

    const fieldErrors = validateRegistration(data, current.id)
    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError('Corrija os campos destacados.', fieldErrors)
    }

    const users = getUsers()
    const index = users.findIndex((user) => user.id === current.id)
    if (index === -1) throw new ApiError('Conta não encontrada.')

    users[index] = {
      ...users[index],
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      firstLanguage: data.firstLanguage.trim(),
      targetLanguage: data.targetLanguage.trim(),
      locationEnabled: Boolean(data.locationEnabled),
      basedIn: data.locationEnabled ? data.basedIn?.trim() ?? '' : '',
      ...(data.password ? { password: data.password } : {}),
    }

    saveUsers(users)
    return { user: sanitizeUser(users[index]) }
  },

  async logout() {
    saveSession(null)
  },

  async listProcesses() {
    const user = getCurrentUser()
    if (!user) throw new ApiError('Você precisa estar autenticado.')
    return getProcesses(user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async createProcess() {
    const user = getCurrentUser()
    if (!user) throw new ApiError('Você precisa estar autenticado.')

    const process = {
      id: createId(),
      name: 'Processo sem título',
      description: '',
      sector: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const processes = getProcesses(user.id)
    processes.push(process)
    saveProcesses(user.id, processes)
    return process
  },

  async getProcess(processId) {
    const processes = await mockApi.listProcesses()
    const process = processes.find((item) => item.id === processId)
    if (!process) throw new ApiError('Processo não encontrado.')
    return process
  },

  async updateProcess(processId, data) {
    const user = getCurrentUser()
    if (!user) throw new ApiError('Você precisa estar autenticado.')

    const nameError = validateProcessName(data.name)
    if (nameError) throw new ApiError(nameError, { name: nameError })

    const processes = getProcesses(user.id)
    const index = processes.findIndex((item) => item.id === processId)
    if (index === -1) throw new ApiError('Processo não encontrado.')

    processes[index] = {
      ...processes[index],
      name: data.name.trim(),
      description: data.description?.trim() ?? '',
      sector: data.sector?.trim() ?? '',
      updatedAt: new Date().toISOString(),
    }

    saveProcesses(user.id, processes)
    return processes[index]
  },

  async renameProcess(processId, name) {
    const user = getCurrentUser()
    if (!user) throw new ApiError('Você precisa estar autenticado.')

    const nameError = validateProcessName(name)
    if (nameError) throw new ApiError(nameError, { name: nameError })

    const processes = getProcesses(user.id)
    const index = processes.findIndex((item) => item.id === processId)
    if (index === -1) throw new ApiError('Processo não encontrado.')

    processes[index] = {
      ...processes[index],
      name: name.trim(),
      updatedAt: new Date().toISOString(),
    }
    saveProcesses(user.id, processes)
    return processes[index]
  },

  async deleteProcess(processId, confirmation) {
    const user = getCurrentUser()
    if (!user) throw new ApiError('Você precisa estar autenticado.')
    if (mockRole(user) !== 'owner') throw new ApiError('Somente o proprietário pode excluir processos.')

    const processes = getProcesses(user.id)
    const process = processes.find((item) => item.id === processId)
    if (!process) throw new ApiError('Processo não encontrado.')
    if (
      confirmation?.processName !== process.name
      || confirmation?.confirmationPhrase !== 'quero excluir este processo'
    ) {
      throw new ApiError('Confirme a exclusão do processo.')
    }
    const next = processes.filter((item) => item.id !== processId)
    saveProcesses(user.id, next)
  },
}

function sanitizeUser(user) {
  const { password: _password, ...safeUser } = user
  return { ...safeUser, role: mockRole(safeUser) }
}

function mockRole(user) {
  if (user.role) return user.role
  return MOCK_OWNER_EMAILS.has(user.email?.toLowerCase()) ? 'owner' : 'manager'
}

/** Process endpoints are Kotlin-owned persistence — attach the Supabase
 * session token when we have one, so the API can identify the Manager. */
async function authHeader() {
  if (!isSupabaseConfigured()) return {}
  const { data } = await getSupabase().auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader()),
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new ApiError(payload.message ?? 'Falha na requisição.', payload.fieldErrors ?? {})
  }

  if (response.status === 204) return null
  return response.json()
}

/**
 * Multipart upload: the browser must set its own `Content-Type` so the
 * boundary is included, which is why this does not go through `request`.
 */
async function upload(path, file) {
  const body = new FormData()
  body.append('file', file, file.name)

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: await authHeader(),
    body,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new ApiError(payload.message ?? 'Falha no envio do arquivo.', payload.fieldErrors ?? {})
  }

  return response.json()
}

export const api = {
  login: (credentials) => {
    if (isSupabaseConfigured()) return loginWithPassword(credentials)
    if (isRemoteApiEnabled()) return request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
    return mockApi.login(credentials)
  },
  loginWithGoogle: () => {
    if (!isSupabaseConfigured()) {
      return Promise.reject(new ApiError('Login com Google indisponível.'))
    }
    return loginWithGoogle()
  },
  getCurrentUser: () => {
    if (isSupabaseConfigured()) return getCurrentAuthUser()
    if (isRemoteApiEnabled()) return request('/auth/me')
    return mockApi.getCurrentUser()
  },
  updateAccount: (data) => {
    if (isSupabaseConfigured()) return updateAuthAccount(data)
    if (isRemoteApiEnabled()) return request('/auth/account', { method: 'PUT', body: JSON.stringify(data) })
    return mockApi.updateAccount(data)
  },
  logout: () => {
    if (isSupabaseConfigured()) return logoutAuth()
    if (isRemoteApiEnabled()) return request('/auth/logout', { method: 'POST' })
    return mockApi.logout()
  },
  listProcesses: () => shouldUseRemoteProcesses() ? request('/processes') : mockApi.listProcesses(),
  createProcess: () => shouldUseRemoteProcesses() ? request('/processes', { method: 'POST' }) : mockApi.createProcess(),
  getProcess: (id) => shouldUseRemoteProcesses() ? request(`/processes/${id}`) : mockApi.getProcess(id),
  updateProcess: (id, data) => shouldUseRemoteProcesses()
    ? request(`/processes/${id}`, { method: 'PUT', body: JSON.stringify({ name: data.name, description: data.description, sector: data.sector }) })
    : mockApi.updateProcess(id, data),
  renameProcess: (id, name) => shouldUseRemoteProcesses()
    ? request(`/processes/${id}/name`, { method: 'PATCH', body: JSON.stringify({ name }) })
    : mockApi.renameProcess(id, name),
  deleteProcess: (id, confirmation) => shouldUseRemoteProcesses()
    ? request(`/processes/${id}`, { method: 'DELETE', body: JSON.stringify(confirmation) })
    : mockApi.deleteProcess(id, confirmation),

  listActivities: () => request('/activities'),
  createActivity: (data) => request('/activities', {
    method: 'POST',
    body: JSON.stringify({ name: data.name, description: data.description ?? '' }),
  }),
  updateActivity: (id, data) => request(`/activities/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: data.name, description: data.description ?? '' }),
  }),
  listProcessActivities: (processId) => request(`/processes/${processId}/activities`),
  addProcessActivity: (processId, activityId) => request(`/processes/${processId}/activities/${activityId}`, {
    method: 'PUT',
  }),
  removeProcessActivity: (processId, activityId) => request(`/processes/${processId}/activities/${activityId}`, {
    method: 'DELETE',
  }),

  // UC4/UC5 — no mock counterpart: parsing a real event log is the point,
  // and a fake parse result would teach the UI nothing about real logs.
  uploadEventLog: (processId, file) => upload(`/processes/${processId}/event-logs`, file),
  listEventLogs: (processId) => request(`/processes/${processId}/event-logs`),
  listOperations: (processId) => request(processId ? `/processes/${processId}/operations` : '/operations'),
  // UC7 — graph + variants derived from what was actually ingested. No mock
  // counterpart on purpose: an invented graph is exactly what this replaces.
  getProcessGraph: (processId, eventLogIds = []) => {
    const query = new URLSearchParams(eventLogIds.map((id) => ['eventLogId', id])).toString()
    return request(`/processes/${processId}/graph${query ? `?${query}` : ''}`)
  },
  getProcessTraces: (processId, eventLogIds = []) => {
    const query = new URLSearchParams(eventLogIds.map((id) => ['eventLogId', id])).toString()
    return request(`/processes/${processId}/traces${query ? `?${query}` : ''}`)
  },
  // Analysis parameters carry the run under the subtractive filter:
  //   treatment          — 'raw' feeds ADWIN the series as read from the log
  //                        (synthetic-corpus baseline); 'treated' smooths first
  //                        (the shop-floor pipeline).
  //   delta              — ADWIN's sensitivity.
  //   excludedActivityIds — activities whose per-event duration is filtered out
  //                        of the series (empty = whole-trace duration).
  //   excludedTraceIds    — cases dropped from the series entirely.
  // An empty body reproduces the historical whole-trace behaviour.
  runProcessAnalysis: (processId, analysisId, params = {}) => {
    const query = analysisId ? `?analysisId=${encodeURIComponent(analysisId)}` : ''
    const body = {
      treatment: params.treatment ?? 'treated',
      eventLogIds: params.eventLogIds ?? [],
      excludedActivityIds: params.excludedActivityIds ?? [],
      excludedTraceIds: params.excludedTraceIds ?? [],
    }
    if (params.delta != null && params.delta !== '') body.delta = Number(params.delta)
    return request(`/processes/${processId}/analysis${query}`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  listAnalyses: () => request('/analyses'),
  createAnalysis: (processId, name) => request('/analyses', {
    method: 'POST',
    body: JSON.stringify({ processId, name: name ?? null }),
  }),
  getAnalysis: (id) => request(`/analyses/${id}`),
  deleteAnalysis: (id) => request(`/analyses/${id}`, { method: 'DELETE' }),
  // Persist the Manager's subtractive filter (excluded activities/traces) on a
  // saved run, so reopening restores it without a rerun. `filter` is
  // { excludedActivityIds, excludedTraceIds }.
  updateAnalysisFilter: (id, filter) => request(`/analyses/${id}/filter`, {
    method: 'PUT',
    body: JSON.stringify(filter),
  }),
  resolveMapping: (processId, mappings) => request(`/processes/${processId}/mapping`, {
    method: 'POST',
    body: JSON.stringify({ mappings }),
  }),

  // ── Monitoring, equipment and maintenance ────────────────────────────
  // Persistence belongs to the authenticated API. There is intentionally no
  // localStorage fallback: a health record must never leak between accounts or
  // look durable when it only exists in one browser.
  listMonitorings: () => request('/monitorings'),
  createMonitoring: (name = 'Novo monitoramento') => request('/monitorings', {
    method: 'POST', body: JSON.stringify({ name: name?.trim() || 'Novo monitoramento' }),
  }),
  getMonitoring: async (id) => {
    const [monitoring, machines] = await Promise.all([
      request(`/monitorings/${id}`),
      request(`/monitorings/${id}/equipment`),
    ])
    return { ...monitoring, machines: Array.isArray(machines) ? machines : machines?.items ?? [] }
  },
  updateMonitoring: (id, patch) => request(`/monitorings/${id}`, {
    method: 'PUT', body: JSON.stringify(patch),
  }),
  deleteMonitoring: (id) => request(`/monitorings/${id}`, { method: 'DELETE' }),
  addMachine: (monitoringId, data) => request(`/monitorings/${monitoringId}/equipment`, {
    method: 'POST', body: JSON.stringify(data),
  }),
  linkMonitoringEquipment: (monitoringId, equipmentId) => request(`/monitorings/${monitoringId}/equipment/${equipmentId}`, { method: 'PUT' }),
  unlinkMonitoringEquipment: (monitoringId, equipmentId) => request(`/monitorings/${monitoringId}/equipment/${equipmentId}`, { method: 'DELETE' }),
  getMachine: async (machineId) => {
    const [machine, parameters, analyses, schedules] = await Promise.all([
      request(`/equipment/${machineId}`),
      request(`/equipment/${machineId}/parameters`),
      request(`/equipment/${machineId}/analyses`),
      request(`/schedules?equipmentId=${encodeURIComponent(machineId)}`),
    ])
    const parameterRows = Array.isArray(parameters) ? parameters : parameters?.items ?? []
    const detailedParameters = await Promise.all(parameterRows.map(async (parameter) => {
      const readings = await request(`/monitoring-parameters/${parameter.id}/readings`)
      return { ...parameter, readings: Array.isArray(readings) ? readings : readings?.items ?? [] }
    }))
    const analysisRows = Array.isArray(analyses) ? analyses : analyses?.items ?? []
    const scheduleRows = Array.isArray(schedules) ? schedules : schedules?.items ?? []
    const normalizedAnalyses = analysisRows.map((row) => ({
      ...row,
      method: row.method ?? row.result?.method,
      delta: row.delta ?? row.result?.delta,
      driftCount: row.driftCount ?? row.result?.drifts?.length ?? 0,
      parameterName: row.parameterName ?? detailedParameters.find((item) => item.id === row.parameterId)?.name,
      prediction: {
        rulValue: row.rulValue,
        rulUnit: row.rulUnit,
        failureProbability: row.failureProbability,
        failureHorizonValue: row.failureHorizonValue,
        failureHorizonUnit: row.failureHorizonUnit,
        modelVersion: row.modelVersion,
        recommendation: row.recommendation,
        provenance: row.provenance?.predictionSource,
        computedAt: row.createdAt,
      },
    }))
    return {
      ...machine,
      parameters: detailedParameters,
      analyses: normalizedAnalyses,
      schedules: scheduleRows,
      latestPrediction: normalizedAnalyses[0]?.prediction ?? null,
    }
  },
  updateMachine: (machineId, patch) => request(`/equipment/${machineId}`, {
    method: 'PUT', body: JSON.stringify(patch),
  }),
  deleteMachine: (machineId) => request(`/equipment/${machineId}`, { method: 'DELETE' }),
  addParameter: (machineId, def) => request(`/equipment/${machineId}/parameters`, {
    method: 'POST', body: JSON.stringify(def),
  }),
  deleteParameter: (machineId, parameterId) => request(`/equipment/${machineId}/parameters/${parameterId}`, {
    method: 'DELETE',
  }),
  uploadEquipmentReadings: (machineId, file) => upload(`/equipment/${machineId}/readings`, file),
  saveMachineAnalysis: (machineId, analysis) => request(`/equipment/${machineId}/analyses`, {
    method: 'POST', body: JSON.stringify(analysis),
  }),
  getEquipmentAnalysis: (analysisId) => request(`/equipment-analyses/${analysisId}`),
  listMachinesForProcess: (processId) => request(`/processes/${processId}/equipment`),
  linkProcessEquipment: (processId, equipmentId) => request(`/processes/${processId}/equipment/${equipmentId}`, { method: 'PUT' }),
  unlinkProcessEquipment: (processId, equipmentId) => request(`/processes/${processId}/equipment/${equipmentId}`, { method: 'DELETE' }),
  listAllMachines: () => request('/equipment'),
  createEquipment: (data) => request('/equipment', { method: 'POST', body: JSON.stringify(data) }),
  listSchedules: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== '')).toString()
    return request(`/schedules${query ? `?${query}` : ''}`).then((payload) => {
      const rows = Array.isArray(payload) ? payload : payload?.items ?? []
      const normalized = rows.map((row) => ({
        ...row,
        scheduledStart: row.scheduledStart ?? row.plannedFor ?? null,
        scheduledEnd: row.scheduledEnd ?? null,
      }))
      return Array.isArray(payload) ? normalized : { ...payload, items: normalized }
    })
  },
  createSchedule: (data) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id, patch) => request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  recordMaintenanceOccurrence: (scheduleId, data) => request(`/schedules/${scheduleId}/occurrences`, {
    method: 'POST', body: JSON.stringify(data),
  }),

  // Real IPDD/ADWIN over a machine-parameter series. `values` is the numeric
  // series; the response is the mining service's DetectResponse (snake_case).
  detectMonitoringSeries: (values, params = {}) => request('/monitoring/detect', {
    method: 'POST',
    body: JSON.stringify({
      values,
      delta: params.delta != null && params.delta !== '' ? Number(params.delta) : 0.002,
      treatment: params.treatment ?? 'treated',
    }),
  }),
}

export { ApiError } from './errors'

function isRemoteApiEnabled() {
  return import.meta.env.VITE_USE_REMOTE_API === 'true'
}

/** Processes are Kotlin-owned persistence: use the real API whenever we
 * have a real identity to attach (Supabase) or the explicit remote flag. */
function shouldUseRemoteProcesses() {
  return isSupabaseConfigured() || isRemoteApiEnabled()
}
