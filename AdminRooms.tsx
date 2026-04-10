import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Room } from '../../lib/supabase'
import { motion } from 'framer-motion'

export default function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => { loadRooms() }, [])

  useEffect(() => {
    const channel = supabase.channel('rooms_admin_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => loadRooms())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadRooms() {
    const { data } = await supabase.from('rooms').select('*, archives(title, subtitle)').order('created_at', { ascending: false })
    if (data) setRooms(data as Room[])
  }

  async function endGame(roomId: string) {
    await supabase.from('rooms').update({ status: 'finished', finished_at: new Date().toISOString() }).eq('id', roomId)
  }

  const statusStyle: Record<string, string> = {
    waiting: 'badge-amber', starting: 'badge-blue', playing: 'badge-green', finished: 'badge-red'
  }
  const statusLabel: Record<string, string> = {
    waiting: 'Aguardando', starting: 'A Iniciar', playing: '● Ao Vivo', finished: 'Terminado'
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Salas</h1>
          <div className="font-mono text-[10px] text-white/20 mt-1">{rooms.filter(r => r.status === 'playing').length} ao vivo agora</div>
        </div>
      </div>

      <div className="border border-border bg-surface2 overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 pb-3 pt-4">Código</th><th>Arquivo</th><th>Jogadores</th>
              <th>Pagamento</th><th>Status</th><th>Criada em</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr><td colSpan={7} className="text-center font-mono text-[10px] text-white/15 py-12 px-5">Nenhuma sala ainda</td></tr>
            ) : rooms.map((r, i) => {
              const arch = r as unknown as Record<string, Record<string, string>>
              return (
                <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td className="px-5">
                    <span className="font-display text-xl font-black tracking-widest text-white">{r.code}</span>
                  </td>
                  <td className="text-sm">{arch.archives?.title}: {arch.archives?.subtitle}</td>
                  <td className="font-mono text-center">{r.num_players}</td>
                  <td>
                    <span className={r.payment_status === 'paid' ? 'badge-green' : 'badge-amber'}>
                      {r.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td><span className={statusStyle[r.status]}>{statusLabel[r.status]}</span></td>
                  <td className="font-mono text-[10px] text-white/40">{new Date(r.created_at).toLocaleDateString('pt-AO')}</td>
                  <td>
                    {r.status === 'playing' && (
                      <button onClick={() => endGame(r.id)}
                        className="font-mono text-[9px] text-red/60 hover:text-red border border-red/20 px-2 py-1 transition-all">
                        ENCERRAR
                      </button>
                    )}
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
