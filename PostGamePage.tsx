import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from './gameStore'
import type { Player, Ranking } from './supabase'

type MostSuspected = {
  id: string
  name: string
  role: string | null
  role_label: string | null
  vote_count: number
}

export default function PostGamePage() {
  const navigate = useNavigate()
  const { room, player, clearGame } = useGameStore()
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [mostSuspected, setMostSuspected] = useState<MostSuspected | null>(null)
  const [phase, setPhase] = useState<'loading' | 'postgame' | 'ranking'>('loading')
  const [isPostgameEligible, setIsPostgameEligible] = useState(false)
  const [rankingGenerated, setRankingGenerated] = useState(false)
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
    if (!room || !player) return

    const response = await fetch('/api/finish-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: room.id, player_id: player.id, report_only: true }),
    })
    const data = await response.json()
    if (!response.ok) {
      navigate(`/sala/${room.code}/jogo`)
      return
    }

    setAllPlayers(data.players as Player[])
    setRanking((data.ranking || null) as Ranking | null)
    setRankingGenerated(Boolean(data.ranking))
    setMostSuspected((data.most_suspected || null) as MostSuspected | null)

    // Show postgame for eligible players first, then ranking
    if (player?.postgame_eligible && data.ranking) {
      setPhase('postgame')
      setTimeout(() => setPhase('ranking'), 20000) // 20s postgame experience
    } else {
      setPhase('ranking')
    }
  }

  const isHost = player?.is_host
  const isWinner = rankingGenerated && allPlayers[0]?.id === player?.id

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
              {/* Exclusive corrupted signal */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className={`relative mx-auto mb-8 h-36 w-36 overflow-hidden border border-red/30 bg-red/5 shadow-[0_0_60px_rgba(255,47,54,0.14)] ${glitchText ? 'translate-x-0.5' : ''}`}
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,47,54,0.14),transparent)]" />
                <div className="absolute inset-4 border border-white/10" />
                <div className="absolute left-1/2 top-8 -translate-x-1/2 font-mono text-[9px] tracking-[0.35em] text-red/55">KAIRO.SYS</div>
                <div className="absolute inset-x-0 top-16 text-center font-mono text-[10px] tracking-[0.2em] text-white/45">
                  01001110
                </div>
                <motion.div
                  className="absolute left-0 right-0 h-px bg-red/70"
                  animate={{ top: ['18%', '82%', '18%'] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute bottom-8 left-1/2 h-5 w-16 -translate-x-1/2 rounded-full border border-red/50 bg-black">
                  <div className="mx-auto mt-2 h-px w-10 bg-red/80" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
              >
                <div className="font-mono text-[9px] text-red/40 tracking-[0.4em] mb-4">TRANSMISSÃO EXCLUSIVA</div>
                <p className={`font-mono text-xs text-white/50 leading-relaxed mb-6 ${glitchText ? 'text-red/70' : ''}`}>
                  O que viste no grupo… era apenas a ponta.<br />
                  O canal não terminou. Só mudou de dono.
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

              {!rankingGenerated && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 border border-white/10 bg-white/5 p-6 text-center"
                >
                  <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.32em] text-white/35">Sessão encerrada cedo</div>
                  <p className="font-sans text-sm leading-relaxed text-white/58">
                    Esta sala terminou antes de haver jogo suficiente para calcular desempenho real. Nenhum ranking, vencedor ou prêmio foi gerado.
                  </p>
                </motion.div>
              )}

              {rankingGenerated && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-6 border border-red/25 bg-red/5 p-5"
              >
                <div className="mb-2 font-mono text-[10px] tracking-[0.32em] text-red/70">VETO SECRETO DO GRUPO</div>
                {mostSuspected ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate font-display text-2xl font-black text-white">{mostSuspected.name}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/32">{mostSuspected.role_label || 'Papel desconhecido'}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-display text-3xl font-black text-red">{mostSuspected.vote_count}</div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/28">votos</div>
                    </div>
                  </div>
                ) : (
                  <p className="font-sans text-sm leading-relaxed text-white/50">Ninguém registou voto secreto nesta sessão.</p>
                )}
              </motion.div>
              )}

              {/* Winner highlight */}
              {rankingGenerated && allPlayers[0] && (
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
              {rankingGenerated && (
              <div className="space-y-2 mb-10">
                {allPlayers.map((p, i) => {
                  const details = p.score_details || {}
                  const messages = Number(details.messagesSent ?? details.messages_sent ?? 0)
                  const votesReceived = Number(details.votesReceived ?? details.votes_received ?? 0)
                  const vetoTarget = String(details.veto_target_name || '')
                  const investigation = Number(details.investigationScore ?? 0)
                  const participation = Number(details.participationScore ?? 0)
                  const decisions = Number(details.decisionScore ?? 0)
                  const roleObjective = Number(details.roleObjectiveScore ?? 0)
                  const social = Number(details.socialScore ?? 0)
                  return (
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
                          <span className="font-sans font-bold text-sm">{p.name}</span>
                          {p.id === player?.id && <span className="font-mono text-[9px] text-red/50 border border-red/20 px-1.5">TU</span>}
                          {p.is_host && <span className="font-mono text-[9px] text-white/20 border border-white/10 px-1.5">HOST</span>}
                        </div>
                        <div className="font-mono text-[10px] text-white/30 mt-0.5">{p.role_label}</div>
                        <div className="mt-2 flex flex-wrap gap-2 font-mono text-[9px] text-white/28">
                          <span>investigação {investigation}/30</span>
                          <span>participação {participation}/20</span>
                          <span>decisões {decisions}/20</span>
                          <span>objetivo {roleObjective}/15</span>
                          <span>social {social}/15</span>
                          <span>{messages} msg</span>
                          <span>{votesReceived} votos recebidos</span>
                          {vetoTarget && <span>votou: {vetoTarget}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-xl font-black">{p.score}</div>
                        <div className="font-mono text-[9px] text-white/20">pts</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              )}

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
                {ranking && (
                  <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-white/16">
                    Relatório {ranking.id.slice(0, 8)}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}
