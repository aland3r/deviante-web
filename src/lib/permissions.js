// Excluir (processo, atividade, equipamento, agenda) é só do administrador e do
// gestor. A API repete a regra (403); aqui ela só decide se o botão aparece.
export const DELETE_ROLES = new Set(['owner', 'admin', 'manager'])

export const canDelete = (user) => DELETE_ROLES.has(user?.role)

// Operações e o catálogo de atividades são do administrador da empresa. O gestor
// só mapeia eventos para atividades que já existem. A API também responde 403.
export const CATALOG_ROLES = new Set(['owner', 'admin'])

export const canManageCatalog = (user) => CATALOG_ROLES.has(user?.role)
