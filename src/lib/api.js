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
  validateCompanyName,
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
      companyName: '',
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

    const companyError = validateCompanyName(data.companyName)
    if (companyError) throw new ApiError(companyError, { companyName: companyError })

    const processes = getProcesses(user.id)
    const index = processes.findIndex((item) => item.id === processId)
    if (index === -1) throw new ApiError('Processo não encontrado.')

    processes[index] = {
      ...processes[index],
      name: data.name.trim(),
      companyName: data.companyName.trim(),
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
    ? request(`/processes/${id}`, { method: 'PUT', body: JSON.stringify({ name: data.name, companyName: data.companyName, description: data.description, sector: data.sector }) })
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
  listOperations: (processId) => request(`/processes/${processId}/operations`),
  // UC7 — graph + variants derived from what was actually ingested. No mock
  // counterpart on purpose: an invented graph is exactly what this replaces.
  getProcessGraph: (processId) => request(`/processes/${processId}/graph`),
  getProcessTraces: (processId) => request(`/processes/${processId}/traces`),
  runProcessAnalysis: (processId, analysisId) => {
    const q = analysisId ? `?analysisId=${encodeURIComponent(analysisId)}` : ''
    return request(`/processes/${processId}/analysis${q}`, { method: 'POST' })
  },
  listAnalyses: () => request('/analyses'),
  createAnalysis: (processId, name) => request('/analyses', {
    method: 'POST',
    body: JSON.stringify({ processId, name: name ?? null }),
  }),
  getAnalysis: (id) => request(`/analyses/${id}`),
  resolveMapping: (processId, mappings) => request(`/processes/${processId}/mapping`, {
    method: 'POST',
    body: JSON.stringify({ mappings }),
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
