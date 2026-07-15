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

export function subscribeToAuthChanges(callback) {
  return sharedSubscribeToAuthChanges(async (sessionUser, event) => {
    const user = await mapSessionUser(sessionUser)
    callback(user, event)
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
    await sharedLoginWithGoogle(`${window.location.origin}/auth/callback`)
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
