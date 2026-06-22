import { useState, useEffect } from 'react'
import type { Room } from './supabase'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { adminApi } from './adminApi'

export default function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [confirmRoom, setConfirmRoom] = useState<Room | null>(null)
  const [closing, setClosing] = useState<string | null>(null)

  useEffect(() => {
    loadRooms()
    const interval = setInterval(loadRooms, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadRooms() {
    const data = await adminApi<{ rooms: Room[] }>('rooms')
    setRooms(data.rooms)
  }

  async function closeRoom(room: Room) {
    setClosing(room.id)
    const response = await fetch('/api/finish-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ room_id: room.id }),
    })
    if (response.ok) {
      toast.success('Sala ' + room.code + ' encerrada.')
    } else {
      toast.error('Erro ao encerrar a sala.')
    }
    setClosing(null)
    setConfirmRoom(null)
  }

  const statusStyle: Record<string, string> = {
    waiting: 'badge-amber', starting: 'badge-blue', playing: 'badge-green', finished: 'badge-red'
  }
  const statusLabel: Record<string, string> = {
    waiting: 'Aguardando', starting: 'A Iniciar', playing: 'Ao Vivo', finished: 'Terminado'
  }

  const activeRooms = rooms.filter(r => r.status !== 'finished')
  const finishedRooms = rooms.filter(r => r.status === 'finished')
  const closingBeforeStart = confirmRoom?.status === 'waiting' || confirmRoom?.status === 'starting'

  return (
    <div className="p-6 max-w-7xl">
      <AnimatePresence>
        {confirmRoom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface2 border border-border p-8 max-w-sm w-full mx-4"
            >
              <div className="font-mono text-[9px] text-red/60 tracking-widest mb-4">CONFIRMAR AÇÃO</div>
              <h3 className="font-display text-xl font-bold mb-2">Encerrar Sala {confirmRoom.code}?</h3>
              <p className="font-mono text-xs text-white/40 leading-relaxed mb-8">
                {closingBeforeStart
                  ? 'Esta ação vai encerrar a sala imediatamente. Como o jogo ainda não começou, não será gerado ranking, vencedor ou prémio.'
                  : 'Esta ação vai encerrar a sala imediatamente. O ranking só será gerado se já houver tempo suficiente de jogo real. Não pode ser desfeita.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmRoom(null)}
                  className="flex-1 py-3 border border-white/10 font-mono text-xs text-white/40 hover:text-white hover:border-white/30 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => closeRoom(confirmRoom)}
                  disabled={closing === confirmRoom.id}
                  className="flex-1 py-3 bg-red font-mono text-xs text-white font-bold tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {closing === confirmRoom.id ? 'A encerrar...' : 'ENCERRAR'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Salas</h1>
        <div className="font-mono text-[10px] text-white/20 mt-1">
          {rooms.filter(r => r.status === 'playing').length} ao vivo · {activeRooms.length} activas · {finishedRooms.length} terminadas
        </div>
      </div>

      {activeRooms.length > 0 && (
        <div className="mb-6">
          <div className="font-mono text-[9px] text-white/20 tracking-widest mb-3">SALAS ACTIVAS</div>
          <div className="admin-panel admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Arquivo</th>
                  <th className="text-center">Jogadores</th>
                  <th>Pagamento</th>
                  <th>Status</th>
                  <th>Criada em</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {activeRooms.map((r, i) => {
                  const arch = r as unknown as Record<string, Record<string, string>>
                  return (
                    <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <td>
                        <span className="font-display text-xl font-black tracking-widest">{r.code}</span>
                      </td>
                      <td className="text-sm">{arch.archives?.title}: {arch.archives?.subtitle}</td>
                      <td className="font-mono text-center">{r.num_players}</td>
                      <td className="text-right">
                        <span className={r.payment_status === 'paid' ? 'badge-green' : 'badge-amber'}>
                          {r.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td><span className={statusStyle[r.status]}>{statusLabel[r.status]}</span></td>
                      <td className="font-mono text-[10px] text-white/40">{new Date(r.created_at).toLocaleDateString('pt-AO')}</td>
                      <td className="text-right">
                        <button
                          onClick={() => setConfirmRoom(r)}
                          disabled={closing === r.id}
                          className="font-mono text-[9px] text-red/70 hover:text-white hover:bg-red border border-red/30 hover:border-red px-3 py-1.5 transition-all disabled:opacity-30"
                        >
                          {closing === r.id ? '...' : 'ENCERRAR'}
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <div className="font-mono text-[9px] text-white/20 tracking-widest mb-3">HISTÓRICO</div>
        <div className="admin-panel admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Arquivo</th>
                <th className="text-center">Jogadores</th>
                <th>Status</th>
                <th>Criada em</th>
                <th>Encerrada em</th>
              </tr>
            </thead>
            <tbody>
              {finishedRooms.length === 0 ? (
                <tr><td colSpan={6} className="admin-empty">Nenhuma sala terminada ainda</td></tr>
              ) : finishedRooms.map((r, i) => {
                const arch = r as unknown as Record<string, Record<string, string>>
                return (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} style={{ opacity: 0.5 }}>
                    <td>
                      <span className="font-display text-lg font-black tracking-widest text-white/50">{r.code}</span>
                    </td>
                    <td className="text-sm text-white/40">{arch.archives?.title}: {arch.archives?.subtitle}</td>
                    <td className="font-mono text-center text-white/40">{r.num_players}</td>
                    <td><span className="badge-red">Terminado</span></td>
                    <td className="font-mono text-[10px] text-white/30">{new Date(r.created_at).toLocaleDateString('pt-AO')}</td>
                    <td className="font-mono text-[10px] text-white/30">{r.finished_at ? new Date(r.finished_at).toLocaleDateString('pt-AO') : '—'}</td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
