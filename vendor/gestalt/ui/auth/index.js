export {
  createGestaltAuthStorage,
  isGestaltProductionHost,
} from './cookie-storage.js'

export {
  getSupabase,
  isSupabaseConfigured,
  readSupabaseEnv,
  getGestaltOwnerEmail,
  getGestaltOwnerEmails,
  isGestaltOwnerEmail,
  getGestaltMentorEmails,
  isGestaltMentorEmail,
  resetSupabaseClient,
} from './supabase.js'

export {
  GESTALT_PRODUCTS,
  getProductByCode,
  getProductAppUrl,
  getProductTryUrl,
  getProductArticlesUrl,
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
  hasGestaltProductAccess,
  provisionProductUser,
  grantProductAccess,
  ensureOwnerBootstrap,
  submitAccessRequest,
  listPendingAccessRequests,
  resolveAccessRequest,
  searchAuthUsersByEmail,
  ensureProductAccess,
} from './access.js'

export {
  fetchAllQuests,
  fetchProductsMeta,
  fetchGestaltVersion,
} from './quests.js'
