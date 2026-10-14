import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { canManageCatalog } from '../../lib/permissions'

/** Operações e Atividades: só o administrador; os demais voltam para o painel. */
export default function CatalogRoute() {
  const { user } = useAuth()
  return canManageCatalog(user) ? <Outlet /> : <Navigate to="/dashboard" replace />
}
