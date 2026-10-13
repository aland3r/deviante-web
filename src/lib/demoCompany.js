// Variabilidade (Reuso 03): no login de demonstração, as setas escolhem a
// empresa cliente. Cada empresa é uma variante do produto, definida no
// application.yaml da API (plano + funções exclusivas). A escolha vai em todas
// as requisições no cabeçalho X-Deviante-Company; a API só aceita o cabeçalho
// de contas demo e responde com os recursos e os dados daquela empresa.
export const COMPANIES = [
  { name: 'Deviante', plan: 'Manutenção', exclusive: ['CSV'] },
  { name: 'Metalúrgica Alfa', plan: 'Manutenção', exclusive: ['CSV'] },
  { name: 'Metalúrgica Beta', plan: 'Essencial', exclusive: [] },
  { name: 'Metalúrgica Gama', plan: 'Manutenção', exclusive: [] },
]

const KEY = 'deviante.demoCompany'

export function getDemoCompany() {
  try { return window.localStorage.getItem(KEY) } catch { return null }
}

export function setDemoCompany(name) {
  try { window.localStorage.setItem(KEY, name) } catch { /* sem armazenamento: vale a empresa padrão da conta */ }
}

export function clearDemoCompany() {
  try { window.localStorage.removeItem(KEY) } catch { /* nada a limpar */ }
}

export function companyHeader() {
  const name = getDemoCompany()
  // Cabeçalhos HTTP só aceitam ASCII: o nome vai codificado.
  return name ? { 'X-Deviante-Company': encodeURIComponent(name) } : {}
}
