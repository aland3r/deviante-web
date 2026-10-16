import { FEATURES, hasFeature } from './features'

// Excluir (processo, atividade, equipamento, agenda) é só do administrador e do
// gestor. A API repete a regra (403); aqui ela só decide se o botão aparece.
export const DELETE_ROLES = new Set(['owner', 'admin', 'manager'])

export const canDelete = (user) => DELETE_ROLES.has(user?.role)

// Operações e o catálogo de atividades são do administrador da empresa. O gestor
// só mapeia eventos para atividades que já existem. A API também responde 403.
export const CATALOG_ROLES = new Set(['owner', 'admin'])

export const canManageCatalog = (user) => CATALOG_ROLES.has(user?.role)

// Criar e editar (processo, upload de log, equipamento, agenda, análise) é do
// administrador e do gestor. Operador e técnico só leem o que lhes cabe.
export const EDIT_ROLES = new Set(['owner', 'admin', 'manager'])

export const canEdit = (user) => EDIT_ROLES.has(user?.role)

// O operador não edita o processo, mas anota o detalhe de um trace numa atividade.
export const TRACE_NOTE_ROLES = new Set([...EDIT_ROLES, 'operator'])

export const canWriteTraceNotes = (user) => TRACE_NOTE_ROLES.has(user?.role)

export const isOperator = (user) => user?.role === 'operator'

export const isTechnician = (user) => user?.role === 'technician'

// Quem decide o que operador e técnico enxergam é quem edita.
export const canManageVisibility = canEdit

/**
 * Página inicial do papel: o técnico trabalha na agenda; os demais, no painel.
 * Técnico de empresa sem o módulo de agenda vai para a conta (senão o painel e a
 * agenda se redirecionariam um para o outro).
 */
export const homePath = (user) => {
  if (!isTechnician(user)) return '/dashboard'
  return hasFeature(user, FEATURES.schedules) ? '/schedules' : '/account'
}

// Menu por papel: o operador só vê Projetos e o técnico só Agendamentos.
// Os outros papéis seguem só as regras de plano (features) e de catálogo.
const NAV_BY_ROLE = { operator: ['/dashboard'], technician: ['/schedules'] }

export const canSeeNav = (user, path) => !NAV_BY_ROLE[user?.role] || NAV_BY_ROLE[user.role].includes(path)

// Rotas: equipamentos ficam fora para operador e técnico; a agenda, para o operador.
export const canSeeEquipment = (user) => !isOperator(user) && !isTechnician(user)

export const canSeeSchedules = (user) => !isOperator(user)

export const canSeeDashboard = (user) => !isTechnician(user)
