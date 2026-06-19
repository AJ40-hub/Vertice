import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAdminAuth } from './adminAuth'

// Landing
import LandingPage from './LandingPage'

// Game flow
import CreateRoomPage from './CreateRoomPage'
import JoinRoomPage from './JoinRoomPage'
import WaitingRoomPage from './WaitingRoomPage'
import GamePage from './GamePage'
import PostGamePage from './PostGamePage'

// Admin
import AdminLoginPage from './AdminLoginPage'
import AdminLayout from './AdminLayout'
import AdminDashboard from './AdminDashboard'
import AdminRooms from './AdminRooms'
import AdminArchives from './AdminArchives'
import AdminPayments from './AdminPayments'
import AdminPrizes from './AdminPrizes'
import AdminNotifications from './AdminNotifications'
import AdminFinancials from './AdminFinancials'
import AdminAssets from './AdminAssets'

function ProtectedAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isChecking, checkSession } = useAdminAuth()

  useEffect(() => {
    checkSession()
  }, [checkSession])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="font-mono text-[10px] text-white/30 tracking-[0.4em]">A VALIDAR ACESSO</div>
      </div>
    )
  }

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

      {/* Admin — rota secreta */}
      <Route path="/vertice-admin/login" element={<AdminLoginPage />} />
      <Route
        path="/vertice-admin"
        element={
          <ProtectedAdmin>
            <AdminLayout />
          </ProtectedAdmin>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="salas" element={<AdminRooms />} />
        <Route path="arquivos" element={<AdminArchives />} />
        <Route path="assets" element={<AdminAssets />} />
        <Route path="pagamentos" element={<AdminPayments />} />
        <Route path="premios" element={<AdminPrizes />} />
        <Route path="notificacoes" element={<AdminNotifications />} />
        <Route path="financeiro" element={<AdminFinancials />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
