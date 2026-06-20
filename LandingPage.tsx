import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function LandingPage() {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [glitchActive, setGlitchActive] = useState(false)

  useEffect(() => {
    // Glitch efeito periódico
    const interval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  async function handleJoin() {
    if (joinCode.length !== 4) return
    setLoading(true); setError('')
    navigate(`/entrar?code=${joinCode.toUpperCase()}`)
    setLoading(false)
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
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex w-full max-w-3xl flex-col items-center text-center"
        >
          {/* Logo */}
          <div className="relative mb-8 flex w-full justify-center">
            <motion.h1
              className={`w-full text-center font-display text-[clamp(4rem,12vw,9rem)] font-black leading-none tracking-tight ${glitchActive ? 'text-red' : 'text-white'}`}
              animate={glitchActive ? { x: [-2, 2, -1, 0], skewX: [-1, 1, 0] } : {}}
              transition={{ duration: 0.3 }}
              data-text="VÉRTICE"
            >
              VÉRTICE
            </motion.h1>
            {glitchActive && (
              <>
                <span className="absolute inset-0 text-center font-display text-[clamp(4rem,12vw,9rem)] font-black leading-none text-blue/60 translate-x-1 -translate-y-0.5">VÉRTICE</span>
                <span className="absolute inset-0 text-center font-display text-[clamp(4rem,12vw,9rem)] font-black leading-none text-red/60 -translate-x-1 translate-y-0.5">VÉRTICE</span>
              </>
            )}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mx-auto text-center font-mono text-sm text-white/40 tracking-[0.3em] mb-4 uppercase"
          >
            A verdade não é o que parece
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mx-auto max-w-md text-center font-sans text-white/60 text-lg mb-16 leading-relaxed"
          >
            Cada jogador tem uma versão. Só um vê o todo.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <button
              onClick={() => navigate('/criar-sala')}
              className="btn-primary w-full min-w-[200px] tracking-[0.15em] sm:w-auto"
            >
              Criar Sala
            </button>

            <button
              onClick={() => setShowJoin(!showJoin)}
              className="btn-ghost w-full min-w-[200px] tracking-[0.15em] sm:w-auto"
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

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-4">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center">
          <span className="font-mono text-[10px] text-white/20 tracking-widest">© 2025 VÉRTICE</span>
          <span className="font-mono text-[10px] text-white/20 tracking-widest">Todos os direitos reservados</span>
        </div>
      </footer>
    </div>
  )
}
