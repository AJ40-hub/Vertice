import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from './supabase'
import type { Archive } from './supabase'
import { generateRoomCode } from './gameEngine'

type Step = 'archive' | 'players' | 'payment' | 'data'

export default function CreateRoomPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('archive')
  const [archives, setArchives] = useState<Archive[]>([])
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null)
  const [numPlayers, setNumPlayers] = useState(6)
  const [paymentMode, setPaymentMode] = useState<'host' | 'individual'>('host')
  const [loading, setLoading] = useState(false)
  const [roomCode, setRoomCode] = useState('')

  // Host data
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  useEffect(() => {
    supabase.from('archives').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setArchives(data as Archive[])
    })
  }, [])

  const totalAmount = selectedArchive ? selectedArchive.price_per_player * numPlayers : 0

  async function createRoom() {
    if (!selectedArchive || !name || !gender || !whatsapp) return
    setLoading(true)

    let code = generateRoomCode()
    // Garantir unicidade
    let exists = true
    while (exists) {
      const { data } = await supabase.from('rooms').select('id').eq('code', code).single()
      if (!data) exists = false
      else code = generateRoomCode()
    }

    setRoomCode(code)

    // Create room
    const { data: room, error: roomErr } = await supabase.from('rooms').insert({
      code,
      archive_id: selectedArchive.id,
      num_players: numPlayers,
      payment_mode: paymentMode,
      total_amount: totalAmount,
      payment_status: 'paid', // Simulado - integrar gateway real
      status: 'waiting',
    }).select().single()

    if (roomErr || !room) { setLoading(false); return }

    // Create host player
    const { data: player } = await supabase.from('players').insert({
      room_id: room.id,
      name: name.trim(),
      gender,
      whatsapp: whatsapp.trim(),
      is_host: true,
    }).select().single()

    // Register payment
    await supabase.from('payments').insert({
      room_id: room.id,
      payer_name: name.trim(),
      payer_whatsapp: whatsapp.trim(),
      archive_title: `${selectedArchive.title}: ${selectedArchive.subtitle}`,
      num_players: numPlayers,
      amount: totalAmount,
      payment_mode: paymentMode,
      status: 'confirmed',
      reference: `VRT-${code}`,
    })

    // Update room with host
    await supabase.from('rooms').update({ host_player_id: player?.id }).eq('id', room.id)

    // Save to session
    sessionStorage.setItem('vertice_room', JSON.stringify(room))
    sessionStorage.setItem('vertice_player', JSON.stringify(player))

    setLoading(false)
    navigate(`/sala/${code}/espera`)
  }

  return (
    <div className="min-h-screen bg-black grain flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/5">
        <button onClick={() => navigate('/')} className="font-display text-xl font-black tracking-widest">
          VÉ<span className="text-red">R</span>TICE
        </button>
        <div className="font-mono text-xs text-white/30 tracking-widest">CRIAR SALA</div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-10">
            {(['archive', 'players', 'payment', 'data'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 flex items-center justify-center font-mono text-xs border transition-all ${
                  step === s ? 'border-red bg-red text-white' :
                  (['archive', 'players', 'payment', 'data'].indexOf(step) > i) ? 'border-red/40 text-red/60' :
                  'border-white/20 text-white/20'
                }`}>{i + 1}</div>
                {i < 3 && <div className={`flex-1 h-px transition-all ${(['archive', 'players', 'payment', 'data'].indexOf(step) > i) ? 'bg-red/40' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>

          {/* Step: Archive */}
          {step === 'archive' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="font-display text-3xl font-bold mb-2">Escolhe o Caso</h2>
              <p className="text-white/40 font-mono text-sm mb-8">Seleciona o arquivo que queres jogar</p>
              <div className="space-y-4">
                {archives.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedArchive(a)}
                    className={`border p-5 cursor-pointer transition-all ${selectedArchive?.id === a.id ? 'border-red bg-red/5' : 'border-white/10 hover:border-white/30'}`}
                  >
                    <div className="font-mono text-[10px] text-red/70 tracking-widest mb-1">{a.title}</div>
                    <div className="font-display text-lg font-bold mb-1">{a.subtitle}</div>
                    <div className="text-white/40 text-sm mb-3">{a.description}</div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs text-white/30">{a.min_players}–{a.max_players} jogadores · {a.duration_minutes}min</span>
                      <span className="font-mono text-sm font-bold">{a.price_per_player} Kz/jogador</span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep('players')}
                disabled={!selectedArchive}
                className="btn-primary w-full mt-8 disabled:opacity-30"
              >
                Continuar →
              </button>
            </motion.div>
          )}

          {/* Step: Players */}
          {step === 'players' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="font-display text-3xl font-bold mb-2">Número de Jogadores</h2>
              <p className="text-white/40 font-mono text-sm mb-8">Quantos vão jogar? (mínimo {selectedArchive?.min_players}, máximo {selectedArchive?.max_players})</p>

              {/* Selector */}
              <div className="flex items-center justify-center gap-6 mb-10">
                <button
                  onClick={() => setNumPlayers(Math.max(selectedArchive?.min_players || 5, numPlayers - 1))}
                  className="w-12 h-12 border border-white/20 text-xl hover:border-red transition-colors"
                >−</button>
                <div className="text-center">
                  <div className="font-display text-6xl font-black text-white">{numPlayers}</div>
                  <div className="font-mono text-xs text-white/30 mt-1">JOGADORES</div>
                </div>
                <button
                  onClick={() => setNumPlayers(Math.min(selectedArchive?.max_players || 8, numPlayers + 1))}
                  className="w-12 h-12 border border-white/20 text-xl hover:border-red transition-colors"
                >+</button>
              </div>

              {/* Payment mode */}
              <div className="mb-8">
                <div className="font-mono text-xs text-white/30 tracking-widest mb-4">MODO DE PAGAMENTO</div>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setPaymentMode('host')}
                    className={`border p-4 cursor-pointer transition-all ${paymentMode === 'host' ? 'border-red bg-red/5' : 'border-white/10 hover:border-white/30'}`}
                  >
                    <div className="font-bold text-sm mb-1">Host paga tudo</div>
                    <div className="text-white/40 text-xs">Um pagamento único pelo grupo</div>
                  </div>
                  <div
                    onClick={() => setPaymentMode('individual')}
                    className={`border p-4 cursor-pointer transition-all ${paymentMode === 'individual' ? 'border-red bg-red/5' : 'border-white/10 hover:border-white/30'}`}
                  >
                    <div className="font-bold text-sm mb-1">Cada um paga</div>
                    <div className="text-white/40 text-xs">Link individual por jogador</div>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="border border-white/10 p-5 mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/50 text-sm font-mono">{numPlayers} jogadores × {selectedArchive?.price_per_player} Kz</span>
                  <span className="font-display text-2xl font-bold">{totalAmount.toLocaleString()} <span className="text-sm text-white/40">Kz</span></span>
                </div>
                <div className="h-px bg-white/10 my-3" />
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-white/30">TOTAL A PAGAR</span>
                  <span className="font-mono text-xs text-white/30">{paymentMode === 'host' ? 'Pagamento único' : `${selectedArchive?.price_per_player} Kz × ${numPlayers} links`}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('archive')} className="btn-ghost flex-1">← Voltar</button>
                <button onClick={() => setStep('payment')} className="btn-primary flex-1">Continuar →</button>
              </div>
            </motion.div>
          )}

          {/* Step: Payment */}
          {step === 'payment' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="font-display text-3xl font-bold mb-2">Pagamento</h2>
              <p className="text-white/40 font-mono text-sm mb-8">Confirma e efetua o pagamento</p>

              <div className="border border-white/10 p-6 mb-6">
                <div className="flex justify-between mb-4">
                  <span className="text-white/50 text-sm">{selectedArchive?.title}: {selectedArchive?.subtitle}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-white/40 font-mono text-xs">Jogadores</span>
                  <span className="font-mono text-sm">{numPlayers}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-white/40 font-mono text-xs">Preço por jogador</span>
                  <span className="font-mono text-sm">{selectedArchive?.price_per_player} Kz</span>
                </div>
                <div className="h-px bg-white/10 my-4" />
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-white/30">TOTAL</span>
                  <span className="font-display text-3xl font-black">{totalAmount.toLocaleString()} <span className="text-sm text-white/30">Kz</span></span>
                </div>
              </div>

              {/* Payment instructions */}
              <div className="border border-amber/20 bg-amber/5 p-4 mb-8">
                <div className="font-mono text-xs text-amber tracking-widest mb-2">INSTRUÇÕES DE PAGAMENTO</div>
                <p className="text-white/60 text-sm leading-relaxed">
                  Método de pagamento será configurado em breve. Por agora, após confirmar, a sala será criada automaticamente.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('players')} className="btn-ghost flex-1">← Voltar</button>
                <button onClick={() => setStep('data')} className="btn-primary flex-1">Confirmar Pagamento →</button>
              </div>
            </motion.div>
          )}

          {/* Step: Host Data */}
          {step === 'data' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="font-display text-3xl font-bold mb-2">Os teus dados</h2>
              <p className="text-white/40 font-mono text-sm mb-8">Para entrar na sala como anfitrião</p>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="font-mono text-xs text-white/30 tracking-widest block mb-2">NOME</label>
                  <input
                    className="input-dark"
                    placeholder="O teu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-mono text-xs text-white/30 tracking-widest block mb-2">GÉNERO</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['masculino', 'feminino', 'outro'].map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`border py-2.5 text-sm capitalize font-sans font-semibold transition-all ${gender === g ? 'border-red bg-red/10 text-white' : 'border-white/10 text-white/40 hover:border-white/30'}`}
                      >{g}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-mono text-xs text-white/30 tracking-widest block mb-2">WHATSAPP</label>
                  <input
                    className="input-dark"
                    placeholder="+244 9xx xxx xxx"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('payment')} className="btn-ghost flex-1">← Voltar</button>
                <button
                  onClick={createRoom}
                  disabled={loading || !name || !gender || !whatsapp}
                  className="btn-primary flex-1 disabled:opacity-30"
                >
                  {loading ? 'A criar sala...' : 'Entrar na Sala →'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
