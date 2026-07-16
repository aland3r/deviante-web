import { ApiError } from './errors'
import {
  ensureProductAccess,
  getAuthSessionUser,
  hasProductAccess,
  isOAuthReturn,
  loginWithGoogle as sharedLoginWithGoogle,
  logoutAuth as sharedLogoutAuth,
  subscribeToAuthChanges as sharedSubscribeToAuthChanges,
} from '@gestalt/auth'
import { getSupabase } from './supabase'

const PRODUCT_CODE = 'deviante'
const DEVIANTE_PRODUCTION_ORIGIN = 'https://deviante.alander.io'

/** OAuth callback host: production subdomain, or current origin on staging/dev. */
export function resolveDevianteOAuthCallbackUrl() {
  if (typeof window === 'undefined') {
    return `${DEVIANTE_PRODUCTION_ORIGIN}/auth/callback`
  }

  const { hostname, origin, protocol } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${origin}/auth/callback`
  }
  if (protocol === 'http:' && /^192\.168\./.test(hostname)) {
    return `${origin}/auth/callback`
  }
  if (hostname === 'deviante.alander.io') {
    return `${DEVIANTE_PRODUCTION_ORIGIN}/auth/callback`
  }
  return `${origin}/auth/callback`
}

function mapAuthError(message) {
  const normalized = message?.toLowerCase() ?? ''
  if (normalized.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.'
  }
  return message || 'Não foi possível entrar agora.'
}

function profileFromMetadata(metadata = {}) {
  return {
    fullName: metadata.full_name ?? metadata.fullName ?? metadata.name ?? '',
    firstLanguage: metadata.first_language ?? metadata.firstLanguage ?? 'pt',
    targetLanguage: metadata.target_language ?? metadata.targetLanguage ?? 'en',
    locationEnabled: Boolean(metadata.location_enabled ?? metadata.locationEnabled),
    basedIn: metadata.based_in ?? metadata.basedIn ?? '',
  }
}

function metadataFromProfile(data) {
  return {
    full_name: data.fullName?.trim() ?? '',
    first_language: data.firstLanguage?.trim() ?? 'pt',
    target_language: data.targetLanguage?.trim() ?? 'en',
    location_enabled: Boolean(data.locationEnabled),
    based_in: data.locationEnabled ? data.basedIn?.trim() ?? '' : '',
  }
}

async function loadManagerProfile(userId) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .schema('deviante')
    .from('managers')
    .select('full_name, first_language, target_language, location_enabled, based_in')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null

  return {
    fullName: data.full_name,
    firstLanguage: data.first_language,
    targetLanguage: data.target_language,
    locationEnabled: data.location_enabled,
    basedIn: data.based_in ?? '',
  }
}

async function mapSessionUser(sessionUser) {
  if (!sessionUser) return null

  const fromDb = await loadManagerProfile(sessionUser.id)
  const fromMeta = profileFromMetadata(sessionUser.user_metadata)
  const email = sessionUser.email ?? ''

  return {
    id: sessionUser.id,
    email,
    fullName: fromDb?.fullName || fromMeta.fullName || email.split('@')[0] || 'Usuário',
    firstLanguage: fromDb?.firstLanguage ?? fromMeta.firstLanguage,
    targetLanguage: fromDb?.targetLanguage ?? fromMeta.targetLanguage,
    locationEnabled: fromDb?.locationEnabled ?? fromMeta.locationEnabled,
    basedIn: fromDb?.basedIn ?? fromMeta.basedIn,
  }
}

export async function getCurrentAuthUser() {
  const sessionUser = await getAuthSessionUser()
  return mapSessionUser(sessionUser)
}

export async function checkDevianteAccess(userId) {
  return hasProductAccess(userId, PRODUCT_CODE)
}

export async function ensureDevianteAccess(sessionUser) {
  if (!sessionUser) return false
  return ensureProductAccess(sessionUser, PRODUCT_CODE)
}

export { isOAuthReturn }

/** Exchange PKCE ?code= on /auth/callback (mobile browsers often miss detectSessionInUrl). */
export async function completeOAuthCallback() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (!code) return { session: null, error: null }

  const supabase = getSupabase()
  const { data: existing, error: existingError } = await supabase.auth.getSession()
  if (existingError) return { session: null, error: existingError }
  if (existing.session) return { session: existing.session, error: null }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return { session: null, error }

  // Drop ?code= from the URL so refresh does not retry a consumed code.
  const cleanUrl = `${window.location.origin}${window.location.pathname}`
  window.history.replaceState({}, document.title, cleanUrl)

  return { session: data.session, error: null }
}

export function subscribeToAuthChanges(callback) {
  return sharedSubscribeToAuthChanges(async (sessionUser, event) => {
    const user = await mapSessionUser(sessionUser)
    callback(user, event, sessionUser)
  })
}

export async function loginWithPassword({ email, password }) {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) throw new ApiError(mapAuthError(error.message))

  const user = await mapSessionUser(data.user)
  if (!user) throw new ApiError('Não foi possível carregar sua sessão.')
  return { user }
}

export async function loginWithGoogle() {
  try {
    await sharedLoginWithGoogle(resolveDevianteOAuthCallbackUrl())
  } catch (error) {
    throw new ApiError(mapAuthError(error instanceof Error ? error.message : undefined))
  }
}

export async function logoutAuth() {
  try {
    await sharedLogoutAuth()
  } catch (error) {
    throw new ApiError(mapAuthError(error instanceof Error ? error.message : undefined))
  }
}

export async function updateAuthAccount(data) {
  const supabase = getSupabase()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new ApiError(mapAuthError(sessionError.message))

  const current = sessionData.session?.user
  if (!current) throw new ApiError('Você precisa estar autenticado.')

  const payload = {
    data: metadataFromProfile(data),
  }

  const nextEmail = data.email?.trim().toLowerCase()
  if (nextEmail && nextEmail !== current.email) {
    payload.email = nextEmail
  }
  if (data.password) {
    payload.password = data.password
  }

  const { data: updated, error } = await supabase.auth.updateUser(payload)
  if (error) throw new ApiError(mapAuthError(error.message))

  const user = await mapSessionUser(updated.user)
  if (!user) throw new ApiError('Conta não encontrada.')
  return { user }
}
