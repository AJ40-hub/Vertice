import { Routes, Route, Navigate } from 'react-router-dom'
import { useAdminAuth } from './store/adminAuth'

// Landing
import LandingPage from './pages/landing/LandingPage'

// Game flow
import CreateRoomPage from './pages/game/CreateRoomPage'
import JoinRoomPage from './pages/game/JoinRoomPage'
import WaitingRoomPage from './pages/game/WaitingRoomPage'
import GamePage from './pages/game/GamePage'
import PostGamePage from './pages/game/PostGamePage'

// Admin
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminRooms from './pages/admin/AdminRooms'
import AdminArchives from './pages/admin/AdminArchives'
import AdminPayments from './pages/admin/AdminPayments'
import AdminPrizes from './pages/admin/AdminPrizes'
import AdminNotifications from './pages/admin/AdminNotifications'
import AdminFinancials from './pages/admin/AdminFinancials'

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth()
  if (!isAuthenticated) return <Navigate to="/vertice-admin/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/criar-sala" element={<CreateRoomPage />} />
      <Route path="/entrar" element={<JoinRoomPage />} />
      <Route path="/sala/:code/espera" element={<WaitingRoomPage />} />
      <Route path="/sala/:code/jogo" element={<GamePage />} />
      <Route path="/sala/:code/pos-jogo" element={<PostGamePage />} />

      {/* Admin (secret route) */}
      <Route path="/vertice-admin/login" element={<AdminLoginPage />} />
      <Route path="/vertice-admin" element={
        <ProtectedAdmin><AdminLayout /></ProtectedAdmin>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="salas" element={<AdminRooms />} />
        <Route path="arquivos" element={<AdminArchives />} />
        <Route path="pagamentos" element={<AdminPayments />} />
        <Route path="premios" element={<AdminPrizes />} />
        <Route path="notificacoes" element={<AdminNotifications />} />
        <Route path="financeiro" element={<AdminFinancials />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
