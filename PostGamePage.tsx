import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useGameStore } from '../../store/gameStore'
import type { Player, Ranking } from '../../lib/supabase'

export default function PostGamePage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { room, player, clearGame } = useGameStore()
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [phase, setPhase] = useState<'loading' | 'postgame' | 'ranking'>('loading')
  const [isPostgameEligible, setIsPostgameEligible] = useState(false)
  const [videoShown, setVideoShown] = useState(false)
  const [glitchText, setGlitchText] = useState(false)

  useEffect(() => {
    if (!room || !player) { navigate('/'); return }
    loadRanking()

    // Postgame eligible check
    setIsPostgameEligible(player.postgame_eligible)

    // Glitch effect
    const interval = setInterval(() => {
      setGlitchText(true)
      setTimeout(() => setGlitchText(false), 200)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  async function loadRanking() {
    if (!room) return

    // Get all players sorted by score
    const { data: players } = await supabase
      .from('players').select('*').eq('room_id', room.id).order('score', { ascending: false })

    if (!players) return
    setAllPlayers(players as Player[])

    const winner = players[0] as Player

    // Create/get ranking
    const { data: existingRanking } = await supabase
      .from('rankings').select('*').eq('room_id', room.id).single()

    if (!existingRanking) {
      const rankingData = players.map((p, i) => ({
        id: p.id, name: p.name, role: p.role_label, score: p.score, rank: i + 1
      }))

      const { data: newRanking } = await supabase.from('rankings').insert({
        room_id: room.id,
        archive_title: 'Arquivo 01: Última Conexão',
        players: rankingData,
        winner_id: winner.id,
      }).select().single()

      if (newRanking) setRanking(newRanking as Ranking)

      // Create prize
      await supabase.from('prizes').insert({
        room_id: room.id,
        winner_player_id: winner.id,
        winner_name: winner.name,
        winner_gender: winner.gender,
        winner_whatsapp: winner.whatsapp,
        winner_score: winner.score,
        amount: 1000,
        status: 'pending',
      })

      // Admin notification: ranking ready
      await supabase.from('notifications').insert({
        type: 'ranking_ready',
        title: 'Ranking disponível',
        message: `Sala ${room.code} terminou. Vencedor: ${winner.name} (${winner.whatsapp})`,
        data: {
          room_id: room.id, room_code: room.code,
          winner_name: winner.name, winner_whatsapp: winner.whatsapp,
          winner_gender: winner.gender, winner_score: winner.score
        },
      })

      await supabase.from('notifications').insert({
        type: 'winner_identified',
        title: 'Melhor jogador identificado',
        message: `${winner.name} — ${winner.whatsapp} — Score: ${winner.score}`,
        data: { winner_name: winner.name, winner_whatsapp: winner.whatsapp, winner_gender: winner.gender, winner_score: winner.score, room_code: room.code },
      })
    } else {
      setRanking(existingRanking as Ranking)
    }

    // Show postgame for eligible players first, then ranking
    if (player?.postgame_eligible) {
      setPhase('postgame')
      setTimeout(() => setPhase('ranking'), 20000) // 20s postgame experience
    } else {
      setPhase('ranking')
    }
  }

  const isHost = player?.is_host
  const isWinner = allPlayers[0]?.id === player?.id

  return (
    <div className="min-h-screen bg-black flex flex-col overflow-hidden">
      {/* Postgame exclusive experience */}
      <AnimatePresence>
        {phase === 'postgame' && isPostgameEligible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            {/* Scanlines */}
            <div className="fixed inset-0 pointer-events-none" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 4px)',
            }} />

            <div className="text-center p-8 max-w-sm">
              {/* Robot smile image placeholder */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="w-32 h-32 mx-auto mb-8 border border-red/30 flex items-center justify-center"
              >
                <div className={`text-6xl ${glitchText ? 'text-red' : ''}`}>🤖</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
              >
                <div className="font-mono text-[9px] text-red/40 tracking-[0.4em] mb-4">TRANSMISSÃO EXCLUSIVA</div>
                <p className={`font-mono text-xs text-white/50 leading-relaxed mb-6 ${glitchText ? 'text-red/70' : ''}`}>
                  O que viste no grupo… era apenas a ponta.<br />
                  Prepara-te. Isto não acabou.
                </p>
              </motion.div>

              {!videoShown && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 6 }}
                  onClick={() => setVideoShown(true)}
                  className="btn-primary text-xs tracking-widest"
                >
                  VER VÍDEO FINAL
                </motion.button>
              )}

              {videoShown && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-red/20 p-6"
                >
                  <div className="font-mono text-[9px] text-red/40 tracking-widest mb-4">EU… EU… O TEMPO TODO…</div>
                  {/* Waveform animation */}
                  <div className="flex items-center justify-center gap-0.5 h-8 mb-4">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <motion.div key={i} className="w-0.5 bg-red/60"
                        animate={{ height: [4, Math.random() * 28 + 4, 4] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                      />
                    ))}
                  </div>
                  <div className={`font-display text-xl font-black mb-2 ${glitchText ? 'text-red' : 'text-white'}`}>
                    BEM-VINDOS AO VÉRTICE
                  </div>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 5 }}
                    onClick={() => setPhase('ranking')}
                    className="font-mono text-[9px] text-white/20 hover:text-white/40 mt-4 block mx-auto"
                  >
                    continuar →
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ranking */}
      {phase === 'ranking' && (
        <div className="flex-1 flex flex-col">
          <header className="px-8 py-6 border-b border-white/5">
            <div className="font-display text-xl font-black tracking-widest">VÉ<span className="text-red">R</span>TICE</div>
            <div className="font-mono text-[9px] text-white/20 tracking-[0.3em] mt-1">ARQUIVO 01 — ÚLTIMA CONEXÃO</div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-10 max-w-2xl mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-12">
                <div className="font-mono text-[10px] text-white/20 tracking-[0.4em] mb-2">INVESTIGAÇÃO CONCLUÍDA</div>
                <h1 className="font-display text-4xl font-black">Ranking Final</h1>
              </div>

              {/* Winner highlight */}
              {allPlayers[0] && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="border border-amber/30 bg-amber/5 p-6 mb-8 text-center glow-blue"
                >
                  <div className="font-mono text-[10px] text-amber/60 tracking-[0.4em] mb-3">🏆 MELHOR INVESTIGADOR</div>
                  <div className="font-display text-3xl font-black mb-1">{allPlayers[0].name}</div>
                  <div className="font-mono text-sm text-white/40 mb-3">{allPlayers[0].role_label}</div>
                  <div className="font-display text-4xl font-black text-amber">{allPlayers[0].score}</div>
                  <div className="font-mono text-[9px] text-white/20 mt-1">PONTOS</div>
                  {isHost && (
                    <div className="mt-4 border-t border-amber/20 pt-4">
                      <div className="font-mono text-[9px] text-amber/40 tracking-widest mb-1">PRÉMIO PENDENTE</div>
                      <div className="font-display text-xl font-bold text-amber">1.000 Kz</div>
                      <div className="font-mono text-[9px] text-white/20 mt-1">A equipa Vértice enviará o prémio em até 25 min</div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Full ranking */}
              <div className="space-y-2 mb-10">
                {allPlayers.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className={`flex items-center gap-4 p-4 border transition-all ${
                      i === 0 ? 'border-amber/30 bg-amber/5' :
                      p.id === player?.id ? 'border-red/20 bg-red/5' :
                      'border-white/5 bg-surface/50'
                    }`}
                  >
                    <div className={`font-display text-2xl font-black w-8 text-center ${i === 0 ? 'text-amber' : 'text-white/20'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-700 text-sm">{p.name}</span>
                        {p.id === player?.id && <span className="font-mono text-[9px] text-red/50 border border-red/20 px-1.5">TU</span>}
                        {p.is_host && <span className="font-mono text-[9px] text-white/20 border border-white/10 px-1.5">HOST</span>}
                      </div>
                      <div className="font-mono text-[10px] text-white/30 mt-0.5">{p.role_label}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl font-black">{p.score}</div>
                      <div className="font-mono text-[9px] text-white/20">pts</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Winner message */}
              {isWinner && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="border border-green/20 bg-green/5 p-5 mb-8 text-center"
                >
                  <div className="font-mono text-[9px] text-green/60 tracking-widest mb-2">PARABÉNS!</div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Foste o melhor investigador desta sessão. A equipa Vértice vai contactar-te no WhatsApp em breve com o teu prémio de <strong className="text-amber">1.000 Kz</strong>.
                  </p>
                </motion.div>
              )}

              <div className="text-center">
                <div className="font-mono text-[10px] text-white/20 tracking-[0.3em] mb-6">
                  "A verdade não é o que parece. Encontra o Vértice."
                </div>
                <button onClick={() => { clearGame(); navigate('/') }} className="btn-ghost">
                  Voltar ao Início
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}
