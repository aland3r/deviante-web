export {
  createGestaltAuthStorage,
  isGestaltProductionHost,
} from './cookie-storage.js'

export {
  getSupabase,
  isSupabaseConfigured,
  readSupabaseEnv,
  getGestaltOwnerEmail,
  resetSupabaseClient,
} from './supabase.js'

export {
  GESTALT_PRODUCTS,
  getProductByCode,
  getProductAppUrl,
  getProductLandingUrl,
  getPortfolioOrigin,
  getAuthCallbackUrl,
  isOAuthReturn,
} from './products.js'

export {
  loginWithGoogle,
  logoutAuth,
  getAuthSessionUser,
  subscribeToAuthChanges,
  fetchPortfolioUser,
  fetchProductAccess,
  hasProductAccess,
  provisionProductUser,
  grantProductAccess,
  ensureOwnerBootstrap,
  submitAccessRequest,
  listPendingAccessRequests,
  resolveAccessRequest,
  searchAuthUsersByEmail,
  ensureProductAccess,
} from './access.js'
