import { getGestaltOwnerEmail, getSupabase } from './supabase.js'
import { getProductByCode } from './products.js'

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

export async function loginWithGoogle(redirectTo) {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw new Error(mapAuthError(error.message))
}

export async function logoutAuth() {
  const supabase = getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(mapAuthError(error.message))
}

export async function getAuthSessionUser() {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(mapAuthError(error.message))
  return data.session?.user ?? null
}

export function subscribeToAuthChanges(callback) {
  const supabase = getSupabase()
  const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null, _event)
  })

  return () => subscription.subscription.unsubscribe()
}

export async function fetchPortfolioUser(userId) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .schema('portfolio')
    .from('users')
    .select('id, email, role')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function fetchProductAccess(userId) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .schema('portfolio')
    .from('product_access')
    .select('product_code, role')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function hasProductAccess(userId, productCode) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .schema('portfolio')
    .from('product_access')
    .select('product_code')
    .eq('user_id', userId)
    .eq('product_code', productCode)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return Boolean(data)
}

async function provisionDevianteUser(user) {
  const supabase = getSupabase()
  const email = user.email?.toLowerCase() ?? ''
  const fullName = user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? email.split('@')[0]
    ?? 'Usuário'

  const { data: existingUser } = await supabase
    .schema('deviante')
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existingUser) {
    const { error: userError } = await supabase
      .schema('deviante')
      .from('users')
      .insert({ id: user.id, email, password_hash: null })

    if (userError) throw new Error(userError.message)
  }

  const { data: existingManager } = await supabase
    .schema('deviante')
    .from('managers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existingManager) {
    const { error: managerError } = await supabase
      .schema('deviante')
      .from('managers')
      .insert({
        user_id: user.id,
        full_name: fullName,
        first_language: 'pt',
        target_language: 'en',
        location_enabled: false,
      })

    if (managerError) throw new Error(managerError.message)
  }
}

async function provisionMilebrickUser(user, role = 'member') {
  const supabase = getSupabase()
  const email = user.email?.toLowerCase() ?? ''
  const name = user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? email.split('@')[0]
    ?? 'Usuário'

  const { data: existing } = await supabase
    .schema('milebrick')
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) return

  const { error } = await supabase
    .schema('milebrick')
    .from('users')
    .insert({
      id: user.id,
      name,
      email,
      roles: role,
      ui_language_code: 'pt',
    })

  if (error) throw new Error(error.message)
}

export async function provisionProductUser(user, productCode, role = 'member') {
  const product = getProductByCode(productCode)
  if (!product || product.comingSoon) return

  if (productCode === 'deviante') {
    await provisionDevianteUser(user)
    return
  }

  if (productCode === 'milebrick') {
    await provisionMilebrickUser(user, role)
  }
}

export async function grantProductAccess({ userId, productCode, role = 'member', grantedBy }) {
  const supabase = getSupabase()
  const { error } = await supabase
    .schema('portfolio')
    .from('product_access')
    .upsert({
      user_id: userId,
      product_code: productCode,
      role,
      granted_by: grantedBy ?? null,
    }, { onConflict: 'user_id,product_code' })

  if (error) throw new Error(error.message)
}

export async function ensureOwnerBootstrap(user) {
  const ownerEmail = getGestaltOwnerEmail()
  const email = user.email?.toLowerCase() ?? ''
  if (!ownerEmail || email !== ownerEmail) return fetchPortfolioUser(user.id)

  const supabase = getSupabase()
  const existing = await fetchPortfolioUser(user.id)
  if (existing?.role === 'owner') {
    return existing
  }

  const { error: userError } = await supabase
    .schema('portfolio')
    .from('users')
    .upsert({
      id: user.id,
      email,
      role: 'owner',
    }, { onConflict: 'id' })

  if (userError) throw new Error(userError.message)

  const products = ['deviante', 'milebrick']
  for (const productCode of products) {
    await grantProductAccess({
      userId: user.id,
      productCode,
      role: 'owner',
      grantedBy: user.id,
    })
    await provisionProductUser(user, productCode, 'owner')
  }

  return fetchPortfolioUser(user.id)
}

export async function submitAccessRequest(user, message = '') {
  const supabase = getSupabase()
  const email = user.email?.toLowerCase() ?? ''

  const { data: existing, error: existingError } = await supabase
    .schema('portfolio')
    .from('access_requests')
    .select('id, status')
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing) return existing

  const { data, error } = await supabase
    .schema('portfolio')
    .from('access_requests')
    .insert({
      user_id: user.id,
      email,
      message: message.trim() || null,
      status: 'pending',
    })
    .select('id, status')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function listPendingAccessRequests() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .schema('portfolio')
    .from('access_requests')
    .select('id, email, message, status, created_at, user_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function resolveAccessRequest({ requestId, approve, grantedBy, productCodes = [] }) {
  const supabase = getSupabase()

  const { data: request, error: requestError } = await supabase
    .schema('portfolio')
    .from('access_requests')
    .select('id, email, user_id, status')
    .eq('id', requestId)
    .single()

  if (requestError) throw new Error(requestError.message)
  if (request.status !== 'pending') throw new Error('Solicitação já foi processada.')

  const nextStatus = approve ? 'approved' : 'denied'
  const { error: updateError } = await supabase
    .schema('portfolio')
    .from('access_requests')
    .update({ status: nextStatus })
    .eq('id', requestId)

  if (updateError) throw new Error(updateError.message)

  if (!approve || !request.user_id) return

  const { error: userError } = await supabase
    .schema('portfolio')
    .from('users')
    .upsert({
      id: request.user_id,
      email: request.email,
      role: 'member',
    }, { onConflict: 'id' })

  if (userError) throw new Error(userError.message)

  const authUser = { id: request.user_id, email: request.email, user_metadata: {} }

  for (const productCode of productCodes) {
    await grantProductAccess({
      userId: request.user_id,
      productCode,
      role: 'member',
      grantedBy,
    })
    await provisionProductUser(authUser, productCode, 'member')
  }
}

export async function searchAuthUsersByEmail(emailQuery) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .schema('portfolio')
    .from('users')
    .select('id, email, role')
    .ilike('email', `%${emailQuery.trim()}%`)
    .limit(10)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function ensureProductAccess(user, productCode) {
  const allowed = await hasProductAccess(user.id, productCode)
  if (!allowed) return false
  await provisionProductUser(user, productCode)
  return true
}
