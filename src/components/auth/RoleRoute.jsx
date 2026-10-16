import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { homePath } from '../../lib/permissions'

/** Rota por papel: quem não pode vê-la volta para a página inicial do seu papel. */
export default function RoleRoute({ allow }) {
  const { user } = useAuth()
  return allow(user) ? <Outlet /> : <Navigate to={homePath(user)} replace />
}
