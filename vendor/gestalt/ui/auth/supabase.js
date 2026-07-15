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

export function getGestaltOwnerEmail(env = import.meta.env) {
  return (
    env.VITE_GESTALT_OWNER_EMAIL
    ?? env.NEXT_PUBLIC_GESTALT_OWNER_EMAIL
    ?? ''
  ).trim().toLowerCase()
}

export function getSupabase(env = import.meta.env) {
  const { url, publishableKey } = readSupabaseEnv(env)
  if (!url || !publishableKey) {
    throw new Error('Supabase não configurado. Defina URL e anon/publishable key em .env')
  }

  if (!client) {
    client = createClient(url, publishableKey, {
      auth: {
        storage: createGestaltAuthStorage(),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return client
}

export function resetSupabaseClient() {
  client = null
}
