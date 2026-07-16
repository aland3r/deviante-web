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

  async function syncAccess(sessionUser, mappedUser) {
    if (!sessionUser) {
      setHasAccess(false)
      return
    }

    await ensureOwnerBootstrap(sessionUser)

    const allowed = await checkDevianteAccess(sessionUser.id)
    setHasAccess(allowed)

    if (allowed) {
      await ensureDevianteAccess(sessionUser)
      if (!mappedUser) {
        const current = await api.getCurrentUser()
        setUser(current)
      }
    }
  }

  useEffect(() => {
    let active = true

    if (isSupabaseConfigured()) {
      const unsubscribe = subscribeToAuthChanges(async (currentUser, event) => {
        if (!active) return
        setUser(currentUser)

        try {
          const sessionUser = await getAuthSessionUser()
          await syncAccess(sessionUser, currentUser)
        } catch {
          setHasAccess(false)
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
          setHasAccess(Boolean(currentUser))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    hasAccess,
    isAuthenticated: Boolean(user),
    async login(credentials) {
      const result = await api.login(credentials)
      setUser(result.user)
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
      setHasAccess(false)
    },
  }), [user, loading, hasAccess])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
