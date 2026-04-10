import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { usePlayersRealtime } from '../../hooks/useRealtime'
import { assignRoles } from '../../lib/gameEngine'
import type { Room, Player } from '../../lib/supabase'

export default function WaitingRoomPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [glitch, setGlitch] = useState(false)

  useEffect(() => {
    const r = sessionStorage.getItem('vertice_room')
    const p = sessionStorage.getItem('vertice_player')
    if (!r || !p) { navigate('/'); return }
    setRoom(JSON.parse(r))
    setCurrentPlayer(JSON.parse(p))
  }, [])

  usePlayersRealtime(room?.id, (updated) => {
    setPlayers(updated)

    // Check if full
    if (room && updated.length >= room.num_players && countdown === null) {
      startCountdown(room, updated)
    }
  })

  // Watch room status changes
  useEffect(() => {
    if (!room?.id) return
    const channel = supabase.channel(`room_status:${room.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          const updated = payload.new as Room
          setRoom(updated)
          if (updated.status === 'playing') {
            navigate(`/sala/${code}/jogo`)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [room?.id])

  async function startCountdown(r: Room, allPlayers: Player[]) {
    setCountdown(10)

    // Assign roles
    const roles = assignRoles(r.num_players)
    for (let i = 0; i < allPlayers.length; i++) {
      const role = roles[i]
      await supabase.from('players').update({
        role: role.key,
        role_label: role.label,
        postgame_eligible: role.postgame,
      }).eq('id', allPlayers[i].id)
    }

    // Countdown
    let t = 10
    const interval = setInterval(() => {
      t--
      setCountdown(t)
      if (t % 3 === 0) { setGlitch(true); setTimeout(() => setGlitch(false), 200) }
      if (t <= 0) {
        clearInterval(interval)
        // Start game
        supabase.from('rooms').update({ status: 'playing', started_at: new Date().toISOString() }).eq('id', r.id)
      }
    }, 1000)
  }

  const filled = players.length
  const total = room?.num_players || 6
  const pct = (filled / total) * 100

  return (
    <div className="min-h-screen bg-black grain scanlines flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,45,45,0.04)_0%,transparent_70%)]" />
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute w-px bg-white/5"
            style={{ left: `${5 + i * 5}%`, top: 0, height: '100%', animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/80"
          >
            <div className="text-center">
              <div className="font-mono text-xs text-white/30 tracking-[0.5em] mb-4">JOGO INICIA EM</div>
              <motion.div
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`font-display text-[8rem] font-black leading-none ${glitch ? 'text-red' : 'text-white'}`}
              >
                {countdown}
              </motion.div>
              <div className="font-mono text-xs text-white/20 mt-4 tracking-widest">PREPARA-TE</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-12">
          <div className={`font-display text-5xl font-black tracking-tight mb-2 ${glitch ? 'text-red' : 'text-white'}`}>
            VÉRTICE
          </div>
          <div className="font-mono text-[10px] text-white/20 tracking-[0.4em]">LIGAÇÃO ESTABELECIDA</div>
        </div>

        {/* Room code */}
        <div className="border border-white/10 p-6 mb-8">
          <div className="font-mono text-[10px] text-white/30 tracking-[0.3em] mb-3">CÓDIGO DA SALA</div>
          <div className="font-display text-5xl font-black tracking-[0.5em] text-white">{code}</div>
          <div className="font-mono text-[10px] text-white/20 mt-3">Partilha este código com os teus jogadores</div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between font-mono text-xs text-white/30 mb-3">
            <span>JOGADORES NA SALA</span>
            <span>{filled} / {total}</span>
          </div>
          <div className="h-0.5 bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-red"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Players list */}
        <div className="space-y-2 mb-8">
          {players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center justify-between px-4 py-3 border ${p.id === currentPlayer?.id ? 'border-red/40 bg-red/5' : 'border-white/10 bg-surface/50'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                <span className="font-sans font-600 text-sm">{p.name}</span>
                {p.is_host && <span className="font-mono text-[9px] text-white/30 border border-white/10 px-1.5 py-0.5">HOST</span>}
                {p.id === currentPlayer?.id && <span className="font-mono text-[9px] text-red/60 border border-red/20 px-1.5 py-0.5">TU</span>}
              </div>
              <span className="font-mono text-[10px] text-white/20 capitalize">{p.gender}</span>
            </motion.div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: total - filled }).map((_, i) => (
            <div key={i} className="flex items-center px-4 py-3 border border-white/5 border-dashed">
              <div className="w-1.5 h-1.5 rounded-full bg-white/10 mr-3" />
              <span className="font-mono text-xs text-white/15">A aguardar jogador…</span>
            </div>
          ))}
        </div>

        {filled < total ? (
          <div className="font-mono text-xs text-white/20 animate-pulse tracking-widest">
            A aguardar {total - filled} jogador{total - filled !== 1 ? 'es' : ''}…
          </div>
        ) : (
          <div className="font-mono text-xs text-green tracking-widest">
            SALA COMPLETA — A INICIAR…
          </div>
        )}
      </div>
    </div>
  )
}
