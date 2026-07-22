import { createClient } from '@supabase/supabase-js'
import { createGestaltAuthStorage } from './cookie-storage.js'

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null

export function readSupabaseEnv(env = import.meta.env) {
  const url = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey =
    env.VITE_SUPABASE_ANON_KEY
    ?? env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  return { url, publishableKey }
}

export function isSupabaseConfigured(env = import.meta.env) {
  const { url, publishableKey } = readSupabaseEnv(env)
  return Boolean(url && publishableKey)
}

const DEFAULT_OWNER_EMAILS = ['design@alander.io', 'alanderavila@gmail.com']

export function getGestaltOwnerEmails(env = import.meta.env) {
  const raw =
    env.VITE_GESTALT_OWNER_EMAILS
    ?? env.NEXT_PUBLIC_GESTALT_OWNER_EMAILS
    ?? env.VITE_GESTALT_OWNER_EMAIL
    ?? env.NEXT_PUBLIC_GESTALT_OWNER_EMAIL
    ?? ''

  const fromEnv = String(raw)
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  return [...new Set([...DEFAULT_OWNER_EMAILS, ...fromEnv])]
}

export function getGestaltOwnerEmail(env = import.meta.env) {
  return getGestaltOwnerEmails(env)[0] ?? ''
}

export function isGestaltOwnerEmail(email, env = import.meta.env) {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return false
  return getGestaltOwnerEmails(env).includes(normalized)
}

export function getSupabase(env = import.meta.env) {
  const { url, publishableKey } = readSupabaseEnv(env)
  if (!url || !publishableKey) {
    throw new Error('Supabase não configurado. Defina URL e anon/publishable key em .env')
  }

  if (!client) {
    client = createClient(url, publishableKey, {
      auth: {
        flowType: 'pkce',
        storage: createGestaltAuthStorage(),
        persistSession: true,
        autoRefreshToken: true,
        // The app owns the PKCE exchange explicitly (AuthCallbackPage ->
        // completeOAuthCallback). Letting the client also auto-detect and
        // exchange the ?code= on init races the same single-use code
        // verifier against itself — the loser fails with a "session
        // expired" / fetch error even on a fresh login attempt.
        detectSessionInUrl: false,
      },
    })
  }

  return client
}

export function resetSupabaseClient() {
  client = null
}
