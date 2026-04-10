import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import type { Room } from '../../lib/supabase'

export default function JoinRoomPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [code, setCode] = useState(params.get('code') || '')
  const [room, setRoom] = useState<Room | null>(null)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'code' | 'data'>(params.get('code') ? 'data' : 'code')

  useEffect(() => {
    if (params.get('code')) lookupRoom(params.get('code')!)
  }, [])

  async function lookupRoom(c: string) {
    setLoading(true); setError('')
    const { data } = await supabase.from('rooms').select('*, archives(*)').eq('code', c.toUpperCase()).single()
    setLoading(false)
    if (!data) { setError('Código inválido.'); return }
    if (data.status === 'finished') { setError('Esta sala já terminou.'); return }

    // Check capacity
    const { count } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('room_id', data.id)
    if ((count || 0) >= data.num_players) { setError('Esta sala está cheia.'); return }

    setRoom(data as Room)
    setStep('data')
  }

  async function joinRoom() {
    if (!room || !name || !gender || !whatsapp) return
    setLoading(true); setError('')

    const { data: player, error: err } = await supabase.from('players').insert({
      room_id: room.id,
      name: name.trim(),
      gender,
      whatsapp: whatsapp.trim(),
      is_host: false,
    }).select().single()

    if (err || !player) { setError('Erro ao entrar. Tenta novamente.'); setLoading(false); return }

    sessionStorage.setItem('vertice_room', JSON.stringify(room))
    sessionStorage.setItem('vertice_player', JSON.stringify(player))
    setLoading(false)
    navigate(`/sala/${room.code}/espera`)
  }

  return (
    <div className="min-h-screen bg-black grain flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/5">
        <button onClick={() => navigate('/')} className="font-display text-xl font-black tracking-widest">
          VÉ<span className="text-red">R</span>TICE
        </button>
        <div className="font-mono text-xs text-white/30 tracking-widest">ENTRAR NA SALA</div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {step === 'code' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="font-display text-4xl font-bold mb-2">Código de Acesso</h2>
              <p className="text-white/40 font-mono text-sm mb-10">Introduz o código de 4 letras que recebeste</p>

              <div className="mb-6">
                <input
                  className="input-dark text-center text-4xl tracking-[1em] font-mono uppercase h-20"
                  placeholder="XXXX"
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && code.length === 4 && lookupRoom(code)}
                />
              </div>

              {error && <p className="font-mono text-xs text-red text-center mb-4">{error}</p>}

              <button
                onClick={() => lookupRoom(code)}
                disabled={loading || code.length !== 4}
                className="btn-primary w-full disabled:opacity-30"
              >
                {loading ? 'A verificar...' : 'Verificar Código →'}
              </button>
            </motion.div>
          )}

          {step === 'data' && room && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="border border-white/10 p-4 mb-8">
                <div className="font-mono text-[10px] text-red/70 tracking-widest mb-1">SALA ENCONTRADA</div>
                <div className="font-display text-lg font-bold">{(room as unknown as Record<string, Record<string, string>>).archives?.title}: {(room as unknown as Record<string, Record<string, string>>).archives?.subtitle}</div>
                <div className="font-mono text-xs text-white/30 mt-1">Código: {room.code}</div>
              </div>

              <h2 className="font-display text-3xl font-bold mb-2">Os teus dados</h2>
              <p className="text-white/40 font-mono text-sm mb-8">Para entrar na sala</p>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="font-mono text-xs text-white/30 tracking-widest block mb-2">NOME</label>
                  <input className="input-dark" placeholder="O teu nome" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="font-mono text-xs text-white/30 tracking-widest block mb-2">GÉNERO</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['masculino', 'feminino', 'outro'].map((g) => (
                      <button key={g} onClick={() => setGender(g)}
                        className={`border py-2.5 text-sm capitalize font-600 transition-all ${gender === g ? 'border-red bg-red/10 text-white' : 'border-white/10 text-white/40 hover:border-white/30'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-mono text-xs text-white/30 tracking-widest block mb-2">WHATSAPP</label>
                  <input className="input-dark" placeholder="+244 9xx xxx xxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </div>
              </div>

              {error && <p className="font-mono text-xs text-red text-center mb-4">{error}</p>}

              <button onClick={joinRoom} disabled={loading || !name || !gender || !whatsapp} className="btn-primary w-full disabled:opacity-30">
                {loading ? 'A entrar...' : 'Entrar na Sala →'}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
