import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import {
  checkDevianteAccess,
  ensureDevianteAccess,
  subscribeToAuthChanges,
} from '../lib/auth'
import { ensureOwnerBootstrap, getAuthSessionUser } from '@gestalt/auth'
import { isSupabaseConfigured } from '../lib/supabase'

const SESSION_EVENTS = new Set(['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT'])

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accessReady, setAccessReady] = useState(false)
  const [sessionAuthenticated, setSessionAuthenticated] = useState(false)

  async function syncAccess(sessionUser, mappedUser) {
    setAccessReady(false)

    if (!sessionUser) {
      setHasAccess(false)
      setAccessReady(true)
      return
    }

    try {
      await ensureOwnerBootstrap(sessionUser)
    } catch (err) {
      // Bootstrap may need SQL seed; owner e-mail still grants access below.
      console.error('[ensureOwnerBootstrap] failed (non-blocking):', err)
    }

    let allowed = false
    try {
      allowed = await checkDevianteAccess(sessionUser)
      setHasAccess(allowed)
    } catch (err) {
      console.error('[checkDevianteAccess] failed:', err)
      setHasAccess(false)
    }

    if (allowed) {
      try {
        await ensureDevianteAccess(sessionUser)
      } catch (err) {
        // Provisioning is best-effort; access was already confirmed above.
        console.error('[ensureDevianteAccess] failed (non-blocking):', err)
      }

      if (!mappedUser) {
        try {
          const current = await api.getCurrentUser()
          setUser(current)
        } catch (err) {
          console.error('[getCurrentUser] failed:', err)
        }
      }
    }

    setAccessReady(true)
  }

  useEffect(() => {
    let active = true

    if (isSupabaseConfigured()) {
      const unsubscribe = subscribeToAuthChanges(async (currentUser, event, sessionUser) => {
        if (!active) return

        const activeSession = sessionUser ?? await getAuthSessionUser()
        setSessionAuthenticated(Boolean(activeSession))
        setUser(currentUser)

        try {
          await syncAccess(activeSession, currentUser)
        } catch (err) {
          console.error('[syncAccess] unexpected failure:', err)
          setHasAccess(false)
          setAccessReady(true)
        }

        if (SESSION_EVENTS.has(event)) {
          setLoading(false)
        }
      })

      const timeout = window.setTimeout(() => {
        if (active) setLoading(false)
      }, 8000)

      return () => {
        active = false
        window.clearTimeout(timeout)
        unsubscribe()
      }
    }

    api.getCurrentUser()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser)
          setSessionAuthenticated(Boolean(currentUser))
          setHasAccess(Boolean(currentUser))
          setAccessReady(true)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const authReady = !loading && accessReady

  const value = useMemo(() => ({
    user,
    loading,
    accessReady,
    authReady,
    hasAccess,
    isAuthenticated: sessionAuthenticated,
    async login(credentials) {
      const result = await api.login(credentials)
      setUser(result.user)
      setSessionAuthenticated(true)
      const sessionUser = await getAuthSessionUser()
      await syncAccess(sessionUser, result.user)
      return result.user
    },
    async loginWithGoogle() {
      await api.loginWithGoogle()
    },
    async updateAccount(data) {
      const result = await api.updateAccount(data)
      setUser(result.user)
      return result.user
    },
    async logout() {
      await api.logout()
      setUser(null)
      setSessionAuthenticated(false)
      setHasAccess(false)
      setAccessReady(true)
    },
  }), [user, loading, accessReady, authReady, hasAccess, sessionAuthenticated])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}