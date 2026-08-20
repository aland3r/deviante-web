import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import AppLayout from './components/layout/AppLayout'
import { AuthProvider } from './context/AuthContext'
import AccountSettingsPage from './pages/AccountSettingsPage'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import DocsView from './pages/DocsView'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import ProcessCanvasPage from './pages/ProcessCanvasPage'
import MonitoringPage from './pages/MonitoringPage'
import MachineDetailPage from './pages/MachineDetailPage'
import OperationsPage from './pages/OperationsPage'
import EquipmentPage from './pages/EquipmentPage'
import SchedulesPage from './pages/SchedulesPage'
import NoAccessPage from './pages/NoAccessPage'
import ProtectedRoute from './routes/ProtectedRoute'

// The public site (landing + the three docs views) is always rendered in the
// light theme (owner 19/08); the app honors the persisted 'dv-theme' toggle,
// defaulting to dark. This keeps <html>.theme-light in sync across client-side
// navigation — the pre-paint script in index.html covers the initial load.
// The public site AND the pre-dashboard auth flow (login / callback / no-access)
// render in the light theme — the "first flow" stays visually consistent with
// the landing. Only the authenticated app keeps the dark default.
const PUBLIC_PATHS = new Set([
  '/',
  '/documentacao',
  '/casos-de-uso',
  '/objetos',
  '/login',
  '/register',
  '/auth/callback',
  '/no-access',
])

function ThemeSync() {
  const { pathname } = useLocation()

  useEffect(() => {
    const el = document.documentElement
    if (PUBLIC_PATHS.has(pathname)) {
      el.classList.add('theme-light')
      return
    }
    let pref = 'dark'
    try {
      pref = localStorage.getItem('dv-theme') || 'dark'
    } catch {
      // storage blocked — fall back to the dark default
    }
    el.classList.toggle('theme-light', pref === 'light')
  }, [pathname])

  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
        <ThemeSync />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />

          <Route path="/no-access" element={<NoAccessPage />} />

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

          <Route path="/" element={<LandingPage />} />
          <Route path="/documentacao" element={<DocsView />} />
          <Route path="/casos-de-uso" element={<DocsView />} />
          <Route path="/objetos" element={<DocsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
