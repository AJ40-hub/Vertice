import { useState, useEffect } from 'react'
import type { Notification } from './supabase'
import { motion } from 'framer-motion'
import { adminApi } from './adminApi'

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadNotifications() {
    const data = await adminApi<{ notifications: Notification[] }>('notifications')
    setNotifications(data.notifications)
  }

  async function markAllRead() {
    await adminApi('mark-all-notifications-read')
    setNotifications(n => n.map(x => ({ ...x, read: true })))
  }

  async function markRead(id: string) {
    await adminApi('mark-notification-read', { notification_id: id })
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x))
  }

  const types = ['all', 'room_created', 'game_finished', 'ranking_ready', 'winner_identified', 'payment_received', 'prize_delivered']
  const typeLabels: Record<string, string> = {
    all: 'Todas', room_created: 'Salas', game_finished: 'Jogos', ranking_ready: 'Rankings', winner_identified: 'Vencedores', payment_received: 'Pagamentos', prize_delivered: 'Prémios'
  }
  const typeIcons: Record<string, string> = {
    room_created: '🎮', game_finished: '🏁', ranking_ready: '🏆', winner_identified: '🥇', payment_received: '💰', prize_delivered: '◆'
  }

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter)
  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Notificações</h1>
          <div className="font-mono text-[10px] text-white/20 mt-1">{unread} não lidas</div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="w-full border border-white/10 px-4 py-2 font-mono text-xs text-white/30 transition-colors hover:text-white md:w-auto">
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`font-mono text-[9px] tracking-widest px-3 py-1.5 border transition-all ${filter === t ? 'border-red bg-red/10 text-white' : 'border-white/10 text-white/30 hover:border-white/30'}`}>
            {typeLabels[t]}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="admin-panel admin-empty">Sem notificações</div>
        ) : filtered.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => markRead(n.id)}
            className={`cursor-pointer border p-4 transition-all ${!n.read ? 'border-red/20 bg-red/5' : 'border-border bg-surface2'} hover:border-white/20`}
          >
            <div className="grid items-start gap-4 md:grid-cols-[2rem_minmax(0,1fr)_6rem]">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center border border-white/10 bg-black/40 text-base">{typeIcons[n.type] || '◉'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-sans font-bold text-sm">{n.title}</span>
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-red flex-shrink-0" />}
                </div>
                <div className="font-mono text-xs text-white/40 leading-relaxed">{n.message}</div>
              </div>
              <div className="font-mono text-[9px] text-white/20 md:text-right">
                {new Date(n.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                <br />
                {new Date(n.created_at).toLocaleDateString('pt-AO')}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
