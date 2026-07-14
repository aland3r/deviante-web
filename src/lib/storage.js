const USERS_KEY = 'deviante_users'
const SESSION_KEY = 'deviante_session'
const PROCESSES_KEY = 'deviante_processes'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getUsers() {
  return read(USERS_KEY, [])
}

export function saveUsers(users) {
  write(USERS_KEY, users)
}

export function getSession() {
  return read(SESSION_KEY, null)
}

export function saveSession(session) {
  if (session) {
    write(SESSION_KEY, session)
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

export function getProcesses(userId) {
  const all = read(PROCESSES_KEY, {})
  return all[userId] ?? []
}

export function saveProcesses(userId, processes) {
  const all = read(PROCESSES_KEY, {})
  all[userId] = processes
  write(PROCESSES_KEY, all)
}
