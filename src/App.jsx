import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import {
  DevQuestHud,
  DevQuestProvider,
} from '@gestalt/dev-quest'
import '@gestalt/dev-quest/dev-quest.css'
import { GamifierHud } from '@gestalt/gamifier'
import '@gestalt/gamifier/gamifier.css'
import { useGamifierProducts } from './lib/gamifier'
import AppLayout from './components/layout/AppLayout'
import { AuthProvider } from './context/AuthContext'
import HomePage from './pages/HomePage'
import AccountSettingsPage from './pages/AccountSettingsPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import ProcessCanvasPage from './pages/ProcessCanvasPage'
import ProtectedRoute, { NoAccessRedirect } from './routes/ProtectedRoute'
import { LOADING_LINES, ROADMAP_PHASES } from './lib/roadmap'

export default function App() {
  const { products: gamifierProducts, gestaltVersion } = useGamifierProducts()

  return (
    <DevQuestProvider
      productName="Deviante"
      roadmapDoc="deviante/docs/roadmap.md"
      phases={ROADMAP_PHASES}
      loadingLines={LOADING_LINES}
    >
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
                <Route path="/account" element={<AccountSettingsPage />} />
              </Route>
            </Route>

            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <DevQuestHud />
          <GamifierHud products={gamifierProducts} gestaltVersion={gestaltVersion} />
        </BrowserRouter>
      </AuthProvider>
    </DevQuestProvider>
  )
}
