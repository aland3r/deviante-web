function isLocalDev() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

export const GESTALT_PRODUCTS = [
  {
    code: 'deviante',
    name: 'Deviante',
    tagline: 'Industrial maintenance intelligence',
    description: 'Process mining and drift detection for preventive maintenance decisions.',
    port: 5173,
    subdomain: 'deviante.alander.io',
    dashboardPath: '/dashboard',
  },
  {
    code: 'milebrick',
    name: 'Milebrick',
    tagline: 'Context-driven language learning',
    description: 'Vocabulary and guided practice built from real books, films, and series.',
    port: 5174,
    subdomain: 'milebrick.alander.io',
    dashboardPath: '/dashboard',
  },
]

export function getProductByCode(code) {
  return GESTALT_PRODUCTS.find((product) => product.code === code) ?? null
}

function productOrigin(product) {
  if (isLocalDev()) {
    return `http://localhost:${product.port}`
  }
  return `https://${product.subdomain}`
}

export function getProductAppUrl(productCode) {
  const product = getProductByCode(productCode)
  if (!product) return 'https://alander.io/apps'
  return `${productOrigin(product)}${product.dashboardPath}`
}

export function getProductTryUrl(productCode) {
  const product = getProductByCode(productCode)
  if (!product) return 'https://alander.io/apps'
  return `${productOrigin(product)}/login`
}

export function getProductArticlesUrl(productCode) {
  const origin = getPortfolioOrigin()
  const product = getProductByCode(productCode)
  if (!product) return `${origin}/projects`
  return `${origin}/projects?product=${encodeURIComponent(productCode)}`
}

export function getPortfolioOrigin() {
  if (isLocalDev()) {
    return 'http://localhost:3000'
  }
  return 'https://alander.io'
}

export function getAuthCallbackUrl(origin) {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://alander.io')
  return `${base}/auth/callback`
}

export function isOAuthReturn() {
  if (typeof window === 'undefined') return false
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return search.has('code') || search.has('error') || hash.has('access_token')
}
