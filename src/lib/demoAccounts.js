// Contas de demonstração (login de teste). Cada papel do RF-01/RF-02 tem uma
// conta real no Supabase Auth com os dados sintéticos do projeto, então o
// clique entra pelo mesmo fluxo e mostra os mesmos dados da API que um login
// Google. A senha é pública de propósito: estas contas existem só para a
// demonstração e não têm privilégio de proprietário.
export const DEMO_PASSWORD = 'deviante-demo-2026'

export const DEMO_ACCOUNTS = [
  {
    role: 'administrador',
    label: 'Administrador',
    email: 'demo-administrador@deviante.alander.io',
    description: 'Acesso total à plataforma',
    color: '#c2410c',
  },
  {
    role: 'gestor',
    label: 'Gestor',
    email: 'demo-gestor@deviante.alander.io',
    description: 'Cria processos, análises e monitoramentos',
    color: '#4d5b78',
  },
  {
    role: 'operador',
    label: 'Operador',
    email: 'demo-operador@deviante.alander.io',
    description: 'Acompanha processos e monitoramentos',
    color: '#0f766e',
  },
  {
    role: 'tecnico',
    label: 'Técnico',
    email: 'demo-tecnico@deviante.alander.io',
    description: 'Registra e executa manutenções',
    color: '#a16207',
  },
]

export function findDemoAccount(email) {
  const normalized = email?.trim().toLowerCase() ?? ''
  return DEMO_ACCOUNTS.find((account) => account.email === normalized) ?? null
}
