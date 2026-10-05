// Contas de demonstração (login de teste). Cada papel do RF-01/RF-02 tem uma
// conta real no Supabase Auth com os dados sintéticos do projeto, então o
// clique entra pelo mesmo fluxo e mostra os mesmos dados da API que um login
// Google. A senha é pública de propósito: estas contas existem só para a
// demonstração e não têm privilégio de proprietário. Nomes, empresas e cores
// seguem o Figma Make (DEMO_USERS).
export const DEMO_PASSWORD = 'deviante-demo-2026'

export const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    name: 'Ana Carvalho',
    company: 'Deviante',
    email: 'demo-administrador@deviante.alander.io',
    description: 'Acesso total · gerencia tenants',
    color: '#dc2626',
  },
  {
    role: 'gestor',
    name: 'Carlos Ribeiro',
    company: 'Metalúrgica Alfa',
    email: 'demo-gestor@deviante.alander.io',
    description: 'Cria processos, análises e monitoramentos',
    color: '#4d8fc0',
  },
  {
    role: 'operador',
    name: 'Fernanda Souza',
    company: 'Metalúrgica Alfa',
    email: 'demo-operador@deviante.alander.io',
    description: 'Visualiza e opera · sem criação',
    color: '#10b981',
  },
  {
    role: 'tecnico',
    name: 'Diego Martins',
    company: 'Metalúrgica Alfa',
    email: 'demo-tecnico@deviante.alander.io',
    description: 'Registra manutenções em campo',
    color: '#f59e0b',
  },
]

export function findDemoAccount(email) {
  const normalized = email?.trim().toLowerCase() ?? ''
  return DEMO_ACCOUNTS.find((account) => account.email === normalized) ?? null
}
