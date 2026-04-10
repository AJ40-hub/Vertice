import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import type { Archive } from './supabase'

export default function LandingPage() {
  const navigate = useNavigate()
  const [archives, setArchives] = useState<Archive[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [glitchActive, setGlitchActive] = useState(false)

  useEffect(() => {
    supabase.from('archives').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setArchives(data as Archive[])
    })
    // Glitch efeito periódico
    const interval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 300)
    }, 7000)
    return () => clearInterval(interval)
  }, [])

  async function handleJoin() {
    if (joinCode.length !== 4) return
    setLoading(true); setError('')
    const { data } = await supabase
      .from('rooms').select('*').eq('code', joinCode.toUpperCase()).single()
    setLoading(false)
    if (!data) { setError('Código inválido. Verifica e tenta novamente.'); return }
    if (data.status === 'finished') { setError('Esta sala já terminou.'); return }
    navigate(`/entrar?code=${joinCode.toUpperCase()}`)
  }

  return (
    <div className="min-h-screen bg-black grain scanlines flex flex-col overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-red/10 to-transparent" />
        <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute bottom-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-red/5 blur-3xl" />
        <div className="absolute bottom-20 left-20 w-48 h-48 rounded-full bg-blue/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div>
          <span className="font-display text-xl font-black tracking-widest text-white">
            VÉ<span className="text-red">R</span>TICE
          </span>
          <div className="font-mono text-[9px] text-white/20 tracking-[0.3em] mt-0.5">
            PLATAFORMA DE INVESTIGAÇÃO
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
          <span className="font-mono text-[10px] text-white/30 tracking-widest">SISTEMA ATIVO</span>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          {/* Logo */}
          <div className="mb-8 relative inline-block">
            <motion.h1
              className={`font-display text-[clamp(4rem,12vw,9rem)] font-black leading-none tracking-tight ${glitchActive ? 'text-red' : 'text-white'}`}
              animate={glitchActive ? { x: [-2, 2, -1, 0], skewX: [-1, 1, 0] } : {}}
              transition={{ duration: 0.3 }}
              data-text="VÉRTICE"
            >
              VÉRTICE
            </motion.h1>
            {glitchActive && (
              <>
                <span className="absolute inset-0 font-display text-[clamp(4rem,12vw,9rem)] font-black text-blue/60 translate-x-1 -translate-y-0.5 leading-none">VÉRTICE</span>
                <span className="absolute inset-0 font-display text-[clamp(4rem,12vw,9rem)] font-black text-red/60 -translate-x-1 translate-y-0.5 leading-none">VÉRTICE</span>
              </>
            )}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-mono text-sm text-white/40 tracking-[0.3em] mb-4 uppercase"
          >
            A verdade não é o que parece
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="font-sans text-white/60 text-lg mb-16 max-w-md mx-auto leading-relaxed"
          >
            Cada jogador tem uma versão. Só um vê o todo.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={() => navigate('/criar-sala')}
              className="btn-primary min-w-[200px] tracking-[0.15em]"
            >
              Criar Sala
            </button>

            <button
              onClick={() => setShowJoin(!showJoin)}
              className="btn-ghost min-w-[200px] tracking-[0.15em]"
            >
              Entrar com Código
            </button>
          </motion.div>

          {/* Join input */}
          <AnimatePresence>
            {showJoin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 max-w-sm mx-auto"
              >
                <div className="flex gap-3">
                  <input
                    className="input-dark flex-1 text-center text-2xl tracking-[0.5em] font-mono uppercase"
                    placeholder="XXXX"
                    maxLength={4}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  />
                  <button
                    onClick={handleJoin}
                    disabled={loading || joinCode.length !== 4}
                    className="btn-primary px-6 disabled:opacity-30"
                  >
                    {loading ? '...' : '→'}
                  </button>
                </div>
                {error && (
                  <p className="mt-3 font-mono text-xs text-red text-center">{error}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Archives */}
        {archives.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-24 w-full max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-white/10" />
              <span className="font-mono text-xs text-white/30 tracking-[0.3em] uppercase">Casos Disponíveis</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {archives.map((archive, i) => (
                <motion.div
                  key={archive.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 + i * 0.1 }}
                  className="group relative border border-white/10 bg-surface/50 p-6 cursor-pointer hover:border-red/40 transition-all duration-300"
                  onClick={() => navigate('/criar-sala')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-mono text-[10px] text-red/70 tracking-[0.3em] uppercase mb-1">{archive.title}</div>
                        <h3 className="font-display text-xl font-bold text-white">{archive.subtitle}</h3>
                      </div>
                      <div className="font-mono text-xs text-white/30 border border-white/10 px-2 py-1">
                        {archive.duration_minutes}min
                      </div>
                    </div>
                    <p className="text-white/50 text-sm leading-relaxed mb-4">{archive.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-xs text-white/30">{archive.min_players}–{archive.max_players} jogadores</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-white">{archive.price_per_player} Kz<span className="text-white/30 font-normal">/jogador</span></span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-white/20 tracking-widest">© 2025 VÉRTICE</span>
          <span className="font-mono text-[10px] text-white/20 tracking-widest">Todos os direitos reservados</span>
        </div>
      </footer>
    </div>
  )
}
