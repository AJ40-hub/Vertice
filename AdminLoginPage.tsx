import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAdminAuth } from './adminAuth'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { login } = useAdminAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [glitch, setGlitch] = useState(false)

  async function handleLogin() {
    setLoading(true); setError('')
    await new Promise(r => setTimeout(r, 800))
    const ok = login(password)
    if (ok) {
      setGlitch(true)
      setTimeout(() => navigate('/vertice-admin'), 600)
    } else {
      setError('Acesso negado.')
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen bg-black grain scanlines flex items-center justify-center transition-all ${glitch ? 'invert' : ''}`}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-red/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        <div className="text-center mb-12">
          <div className="font-display text-4xl font-black tracking-widest mb-2">
            VÉ<span className="text-red">R</span>TICE
          </div>
          <div className="font-mono text-[9px] text-white/20 tracking-[0.4em]">ACESSO RESTRITO</div>
        </div>

        <div className="border border-white/10 p-8">
          <div className="font-mono text-[10px] text-white/20 tracking-[0.3em] mb-6">PAINEL ADMINISTRATIVO</div>

          <div className="mb-6">
            <input
              type="password"
              className="input-dark text-center tracking-widest"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
          </div>

          {error && (
            <div className="font-mono text-xs text-red text-center mb-4">{error}</div>
          )}

          <button onClick={handleLogin} disabled={loading || !password} className="btn-primary w-full disabled:opacity-30">
            {loading ? 'A verificar…' : 'Entrar'}
          </button>
        </div>

        <div className="mt-6 text-center font-mono text-[9px] text-white/10 tracking-widest">
          ACESSO NÃO AUTORIZADO SERÁ REGISTADO
        </div>
      </motion.div>
    </div>
  )
}
