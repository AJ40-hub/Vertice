import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Room, Player } from './supabase'

export default function WaitingRoomPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [roomClosed, setRoomClosed] = useState(false)
  const [glitch, setGlitch] = useState(false)
  const countdownStartedRef = useRef(false)
  const countdownIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    const r = sessionStorage.getItem('vertice_room')
    const p = sessionStorage.getItem('vertice_player')
    if (!r || !p) { navigate('/'); return }
    setRoom(JSON.parse(r))
    setCurrentPlayer(JSON.parse(p))
  }, [])

  useEffect(() => {
    if (!room?.id || !currentPlayer?.id) return
    let cancelled = false

    async function refreshState() {
      const response = await fetch('/api/player-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: room?.id, player_id: currentPlayer?.id }),
      })
      if (!response.ok || cancelled) return
      const data = await response.json() as { room: Room; player: Player; players: Player[] }
      setRoom(data.room)
      setPlayers(data.players)
      setCurrentPlayer(data.player)
      sessionStorage.setItem('vertice_room', JSON.stringify(data.room))
      sessionStorage.setItem('vertice_player', JSON.stringify(data.player))

      if (data.room.status === 'playing') {
        navigate(`/sala/${code}/jogo`)
        return
      }

      if (data.room.status === 'finished') {
        if (countdownIntervalRef.current !== null) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
        setCountdown(null)
        setRoomClosed(true)
        return
      }

      if (data.room.status === 'waiting' && data.players.length >= data.room.num_players && !countdownStartedRef.current) {
        startCountdown(data.room)
      }
    }

    refreshState()
    const interval = window.setInterval(refreshState, 2500)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [room?.id, currentPlayer?.id, code, navigate])

  // Clear countdown interval if user leaves
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current !== null) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  async function startCountdown(r: Room) {
    countdownStartedRef.current = true
    setCountdown(10)

    // Countdown
    let t = 10
    countdownIntervalRef.current = window.setInterval(() => {
      if (t > 1) {
        t -= 1
        setCountdown(t)

        if (t % 3 === 0) {
          setGlitch(true)
          window.setTimeout(() => setGlitch(false), 200)
        }
        return
      }

      // Final tick: keep showing 1 and start the game without ever displaying 0
      if (countdownIntervalRef.current !== null) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      setGlitch(true)
      window.setTimeout(() => setGlitch(false), 400)
      window.setTimeout(async () => {
        await fetch('/api/start-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: r.id, player_id: currentPlayer?.id }),
        })
      }, 900)
    }, 1000)
  }

  const filled = players.length
  const total = room?.num_players || 6
  const pct = (filled / total) * 100

  if (roomClosed) {
    return (
      <div className="min-h-screen bg-black grain scanlines flex items-center justify-center px-6 text-center">
        <div className="w-full max-w-md border border-red/20 bg-red/5 p-8">
          <div className="font-mono text-[10px] text-red/60 tracking-[0.35em] mb-4">SALA ENCERRADA</div>
          <h1 className="font-display text-3xl font-black mb-3">Ligação terminada</h1>
          <p className="font-mono text-xs text-white/40 leading-relaxed mb-8">
            Esta sala foi encerrada pelo administrador antes do início do jogo.
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem('vertice_room')
              sessionStorage.removeItem('vertice_player')
              navigate('/')
            }}
            className="btn-ghost w-full"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    )
  }

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
        {countdown !== null && (
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
                <span className="font-sans font-semibold text-sm">{p.name}</span>
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
          <div className="font-mono text-xs text-white/20 animate-pulse tracking-widest uppercase">
            FALTAM {total - filled} JOGADOR{total - filled !== 1 ? 'ES' : ''} PARA INICIAR
          </div>
        ) : (
          <div className="font-mono text-xs text-green tracking-widest uppercase">
            SALA COMPLETA — A INICIAR EM BREVE
          </div>
        )}
      </div>
    </div>
  )
}
