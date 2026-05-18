import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminAuth } from './adminAuth'
import { useAdminRealtime } from './useRealtime'
import { supabase } from './supabase'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAdminAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingPrizes, setPendingPrizes] = useState(0)
  const [liveUsers, setLiveUsers] = useState(0)
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message: string }>>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchCounts() {
    const [{ count: unread }, { count: prizes }, { count: playing }] = await Promise.all([
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('read', false),
      supabase.from('prizes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'playing'),
    ])
    setUnreadCount(unread || 0)
    setPendingPrizes(prizes || 0)
    setLiveUsers(playing || 0)
  }

  const handleRealtime = useCallback((notification: unknown) => {
    const n = notification as { type: string; title?: string; message?: string }
    const id = Date.now().toString()
    const toastMap: Record<string, { title: string; message: string }> = {
      room_created:       { title: '🎮 Nova Sala',         message: 'Sala criada com sucesso' },
      game_finished:      { title: '🏁 Jogo Terminado',    message: n.message || 'Uma sala terminou' },
      ranking_ready:      { title: '🏆 Ranking Pronto',    message: n.message || 'Ranking disponível' },
      winner_identified:  { title: '🥇 Vencedor',          message: n.message || 'Vencedor identificado' },
      payment_received:   { title: '💰 Pagamento',         message: 'Novo pagamento recebido' },
    }
    const toast = toastMap[n.type]
    if (toast) {
      setToasts(t => [...t, { id, ...toast }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000)
      fetchCounts()
    }
  }, [])

  useAdminRealtime(handleRealtime)

  const navItems = [
    { path: '/vertice-admin',              label: 'Dashboard',      icon: '◈', badge: 0 },
    { path: '/vertice-admin/salas',        label: 'Salas',          icon: '⊞', badge: liveUsers },
    { path: '/vertice-admin/arquivos',     label: 'Arquivos',       icon: '◉', badge: 0 },
    { path: '/vertice-admin/assets',       label: 'Assets',         icon: '🗂', badge: 0 },
    { path: '/vertice-admin/pagamentos',   label: 'Pagamentos',     icon: '◎', badge: 0 },
    { path: '/vertice-admin/premios',      label: 'Prémios',        icon: '◆', badge: pendingPrizes },
    { path: '/vertice-admin/financeiro',   label: 'Financeiro',     icon: '◇', badge: 0 },
    { path: '/vertice-admin/notificacoes', label: 'Notificações',   icon: '◐', badge: unreadCount },
  ]

  const isActive = (path: string) =>
    path === '/vertice-admin'
      ? location.pathname === path
      : location.pathname.startsWith(path)

  return (
    <div className="min-h-screen bg-black flex">

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} bg-surface border-r border-border flex flex-col transition-all duration-300 fixed h-screen z-30`}>

        {/* Logo */}
        <div className="px-4 py-5 border-b border-border flex items-center gap-3">
          <div className="w-6 h-6 bg-red flex items-center justify-center flex-shrink-0">
            <span className="font-display text-xs font-black">V</span>
          </div>
          {sidebarOpen && (
            <div>
              <div className="font-display text-sm font-black tracking-widest">VÉRTICE</div>
              <div className="font-mono text-[8px] text-white/20 tracking-widest">ADMIN</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-white/20 hover:text-white/60 text-xs transition-colors"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Live indicator */}
        {sidebarOpen && liveUsers > 0 && (
          <div className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 bg-green/5 border border-green/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <span className="font-mono text-[9px] text-green">
              {liveUsers} sala{liveUsers > 1 ? 's' : ''} ao vivo
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-2 py-2.5 text-left transition-all relative border-l-2 ${
                isActive(item.path)
                  ? 'bg-red/10 text-white border-red'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5 border-transparent'
              }`}
            >
              <span className="text-sm flex-shrink-0 w-5 text-center">{item.icon}</span>
              {sidebarOpen && (
                <span className="font-sans text-xs font-600">{item.label}</span>
              )}
              {item.badge > 0 && (
                <span className={`${sidebarOpen ? 'ml-auto' : 'absolute top-1 right-1'} bg-red text-white text-[9px] font-bold px-1.5 py-0.5 min-w-[16px] text-center leading-tight`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => { logout(); navigate('/') }}
            className="w-full flex items-center gap-3 px-2 py-2 text-white/20 hover:text-red transition-colors"
          >
            <span className="text-sm">⏻</span>
            {sidebarOpen && (
              <span className="font-mono text-[9px] tracking-widest">SAIR</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-56' : 'ml-14'} transition-all duration-300 min-h-screen overflow-auto`}>
        <Outlet />
      </main>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              className="bg-surface2 border border-border p-4 shadow-2xl"
            >
              <div className="font-sans text-sm font-700 mb-1">{t.title}</div>
              <div className="font-mono text-[10px] text-white/40 leading-relaxed">{t.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}