import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import { AuthProvider } from './context/AuthContext'
import HomePage from './pages/HomePage'
import AccountSettingsPage from './pages/AccountSettingsPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import ProcessCanvasPage from './pages/ProcessCanvasPage'
import MonitoringPage from './pages/MonitoringPage'
import MachineDetailPage from './pages/MachineDetailPage'
import OperationsPage from './pages/OperationsPage'
import EquipmentPage from './pages/EquipmentPage'
import SchedulesPage from './pages/SchedulesPage'
import ProtectedRoute, { NoAccessRedirect } from './routes/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />

          <Route path="/no-access" element={<NoAccessRedirect />} />

          <Route element={<ProtectedRoute />}>
            {/* The canvas owns its full-screen header (Figma Make v20), so it
                sits outside AppLayout. /mining was the old preview split. */}
            <Route path="/processes/:processId" element={<ProcessCanvasPage />} />
            <Route path="/processes/:processId/mining" element={<Navigate to=".." relative="path" replace />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/monitoring/:monitoringId" element={<MonitoringPage />} />
              <Route path="/monitoring/:monitoringId/machines/:machineId" element={<MachineDetailPage />} />
              <Route path="/operations" element={<OperationsPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/equipment/:machineId" element={<MachineDetailPage />} />
              <Route path="/schedules" element={<SchedulesPage />} />
              <Route path="/account" element={<AccountSettingsPage />} />
            </Route>
          </Route>

          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
