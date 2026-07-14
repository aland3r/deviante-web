import {
  getProcesses,
  getSession,
  getUsers,
  saveProcesses,
  saveSession,
  saveUsers,
} from './storage'
import {
  validateEmail,
  validatePassword,
  validateProcessName,
  validateCompanyName,
  validateLanguageCode,
  validateBasedIn,
  validateRequired,
} from './validation'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

class ApiError extends Error {
  constructor(message, fieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.fieldErrors = fieldErrors
  }
}

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

  async register(data) {
    const fieldErrors = validateRegistration(data)
    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError('Corrija os campos destacados.', fieldErrors)
    }

    const user = {
      id: createId(),
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      firstLanguage: data.firstLanguage.trim(),
      targetLanguage: data.targetLanguage.trim(),
      locationEnabled: Boolean(data.locationEnabled),
      basedIn: data.locationEnabled ? data.basedIn?.trim() ?? '' : '',
      createdAt: new Date().toISOString(),
    }

    const users = getUsers()
    users.push(user)
    saveUsers(users)
    saveSession({ userId: user.id, createdAt: new Date().toISOString() })

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

  async deleteProcess(processId) {
    const user = getCurrentUser()
    if (!user) throw new ApiError('Você precisa estar autenticado.')

    const processes = getProcesses(user.id)
    const next = processes.filter((item) => item.id !== processId)
    if (next.length === processes.length) throw new ApiError('Processo não encontrado.')
    saveProcesses(user.id, next)
  },
}

function sanitizeUser(user) {
  const { password: _password, ...safeUser } = user
  return safeUser
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
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

export const api = {
  login: (credentials) => isRemoteApiEnabled() ? request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }) : mockApi.login(credentials),
  register: (data) => isRemoteApiEnabled() ? request('/auth/register', { method: 'POST', body: JSON.stringify(data) }) : mockApi.register(data),
  getCurrentUser: () => isRemoteApiEnabled() ? request('/auth/me') : mockApi.getCurrentUser(),
  updateAccount: (data) => isRemoteApiEnabled() ? request('/auth/account', { method: 'PUT', body: JSON.stringify(data) }) : mockApi.updateAccount(data),
  logout: () => isRemoteApiEnabled() ? request('/auth/logout', { method: 'POST' }) : mockApi.logout(),
  listProcesses: () => isRemoteApiEnabled() ? request('/processes') : mockApi.listProcesses(),
  createProcess: () => isRemoteApiEnabled() ? request('/processes', { method: 'POST' }) : mockApi.createProcess(),
  getProcess: (id) => isRemoteApiEnabled() ? request(`/processes/${id}`) : mockApi.getProcess(id),
  updateProcess: (id, data) => isRemoteApiEnabled() ? request(`/processes/${id}`, { method: 'PUT', body: JSON.stringify(data) }) : mockApi.updateProcess(id, data),
  deleteProcess: (id) => isRemoteApiEnabled() ? request(`/processes/${id}`, { method: 'DELETE' }) : mockApi.deleteProcess(id),
}

export { ApiError }

function isRemoteApiEnabled() {
  return import.meta.env.VITE_USE_REMOTE_API === 'true'
}
