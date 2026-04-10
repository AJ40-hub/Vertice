import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import { useGameStore } from './gameStore'
import { useRoomRealtime } from './useRealtime'
import { deliverPendingEvents, calculateScore } from './gameEngine'
import type { Room, Player, Clue } from './supabase'

type AppView = 'home' | 'messages' | 'gallery' | 'email' | 'notes' | 'calls' | 'browser' | 'clue'

export default function GamePage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { room, player, clues, setRoom, setPlayer, setClues, addClue, expireClue, incrementElapsed, gameElapsedSeconds } = useGameStore()
  const [activeApp, setActiveApp] = useState<AppView>('home')
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null)
  const [betrayalPrompt, setBetrayalPrompt] = useState(false)
  const [kairoMessage, setKairoMessage] = useState<string | null>(null)
  const [glitch, setGlitch] = useState(false)
  const [newClueAlert, setNewClueAlert] = useState<Clue | null>(null)

  useRoomRealtime(room?.id)

  // Init from session
  useEffect(() => {
    const r = sessionStorage.getItem('vertice_room')
    const p = sessionStorage.getItem('vertice_player')
    if (!r || !p) { navigate('/'); return }
    const roomData = JSON.parse(r) as Room
    const playerData = JSON.parse(p) as Player
    setRoom(roomData)
    setPlayer(playerData)

    // Load existing clues
    supabase.from('clues').select('*').eq('player_id', playerData.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setClues(data as Clue[]) })
  }, [])

  // Game timer
  useEffect(() => {
    if (!room || !player) return
    const timer = setInterval(() => {
      incrementElapsed()
    }, 1000)
    return () => clearInterval(timer)
  }, [room?.id, player?.id])

  // Deliver events every 30s
  useEffect(() => {
    if (!room || !player) return
    const elapsedMinutes = Math.floor(gameElapsedSeconds / 60)

    if (room.archive_id) {
      deliverPendingEvents(room.id, room.archive_id, elapsedMinutes)
    }

    // Betrayal prompt at 40min
    if (elapsedMinutes === 40 && !betrayalPrompt && player.betrayal_choice === null) {
      const betrayalRoles = ['detetive', 'amigo', 'jornalista', 'testemunha']
      if (betrayalRoles.includes(player.role || '')) setBetrayalPrompt(true)
    }
  }, [Math.floor(gameElapsedSeconds / 30)])

  // Expire clues
  useEffect(() => {
    const now = new Date()
    clues.forEach((c) => {
      if (c.expires_at && !c.expired && new Date(c.expires_at) < now) {
        expireClue(c.id)
        supabase.from('clues').update({ expired: true }).eq('id', c.id)
      }
    })
  }, [gameElapsedSeconds])

  // New clue notification from realtime
  useEffect(() => {
    if (!player) return
    const channel = supabase.channel(`clues:${player.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clues', filter: `player_id=eq.${player.id}` },
        (payload) => {
          const clue = payload.new as Clue
          addClue(clue)
          setNewClueAlert(clue)
          setGlitch(true)
          setTimeout(() => setGlitch(false), 400)
          setTimeout(() => setNewClueAlert(null), 4000)

          // Kairo appears
          if (clue.clue_type === 'kairo_appears') {
            setKairoMessage((clue.content as Record<string, string>).text)
            setTimeout(() => setKairoMessage(null), 5000)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [player?.id])

  // Room finished
  useEffect(() => {
    if (room?.status === 'finished') {
      // Calculate final score
      if (player) {
        const score = calculateScore(player, gameElapsedSeconds)
        supabase.from('players').update({ score }).eq('id', player.id)
      }
      setTimeout(() => navigate(`/sala/${code}/pos-jogo`), 2000)
    }
  }, [room?.status])

  async function handleBetrayal(choice: 'reveal' | 'keep') {
    if (!player) return
    await supabase.from('players').update({ betrayal_choice: choice, betrayal_at: new Date().toISOString() }).eq('id', player.id)
    setBetrayalPrompt(false)
  }

  async function openClue(clue: Clue) {
    if (!clue.opened_at) {
      await supabase.from('clues').update({ opened_at: new Date().toISOString() }).eq('id', clue.id)
      // Score: clue opened
      if (player) {
        const details = { ...player.score_details, clues_opened: (player.score_details?.clues_opened as number || 0) + 1 }
        await supabase.from('players').update({ score_details: details }).eq('id', player.id)
      }
    }
    setSelectedClue(clue)
    setActiveApp('clue')
  }

  const elapsedMin = Math.floor(gameElapsedSeconds / 60)
  const elapsedSec = gameElapsedSeconds % 60
  const activeClues = clues.filter(c => !c.expired)
  const batteryLevel = Math.max(5, 100 - Math.floor(gameElapsedSeconds / 54))

  const apps = [
    { id: 'messages', icon: '💬', label: 'Mensagens', count: clues.filter(c => c.clue_type === 'message' && !c.opened_at).length },
    { id: 'gallery', icon: '📸', label: 'Galeria', count: clues.filter(c => c.clue_type === 'photo' && !c.opened_at).length },
    { id: 'email', icon: '📧', label: 'Email', count: clues.filter(c => c.clue_type === 'document' && !c.opened_at).length },
    { id: 'notes', icon: '📝', label: 'Notas', count: 0 },
    { id: 'calls', icon: '📞', label: 'Chamadas', count: 0 },
    { id: 'browser', icon: '🌐', label: 'Browser', count: 0 },
  ]

  return (
    <div className={`min-h-screen bg-black flex flex-col items-center justify-center transition-all ${glitch ? 'hue-rotate-180' : ''}`}>
      {/* Phone frame */}
      <div className="relative w-full max-w-sm mx-auto h-screen max-h-[780px] bg-surface border border-white/10 overflow-hidden flex flex-col">

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 bg-surface">
          <div className="font-mono text-[10px] text-white/60">
            {String(elapsedMin).padStart(2,'0')}:{String(elapsedSec).padStart(2,'0')}
          </div>
          <div className="font-mono text-[9px] text-white/20 tracking-widest">KAIRO.SYS</div>
          <div className="flex items-center gap-1">
            <div className="font-mono text-[10px] text-white/60">{batteryLevel}%</div>
            <div className="w-6 h-3 border border-white/30 rounded-sm p-0.5">
              <div className="h-full bg-green rounded-sm transition-all" style={{ width: `${batteryLevel}%` }} />
            </div>
          </div>
        </div>

        {/* Kairo appears overlay */}
        <AnimatePresence>
          {kairoMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center"
            >
              <div className="text-center p-8">
                <div className="font-mono text-xs text-red/60 tracking-widest mb-4">NOVA MENSAGEM</div>
                <div className="font-mono text-xs text-white/30 mb-2">kairo_real:</div>
                <div className="font-display text-2xl font-bold text-white">{kairoMessage}</div>
                <div className="font-mono text-[9px] text-white/15 mt-6 animate-pulse">conta removida</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New clue toast */}
        <AnimatePresence>
          {newClueAlert && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              className="absolute top-12 left-3 right-3 z-40 bg-surface3 border border-red/30 px-4 py-3 flex items-center gap-3 cursor-pointer"
              onClick={() => openClue(newClueAlert)}
            >
              <div className="w-2 h-2 rounded-full bg-red animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[9px] text-red/60 tracking-widest">NOVA PISTA</div>
                <div className="font-sans text-xs text-white font-600 truncate">{newClueAlert.title}</div>
              </div>
              {newClueAlert.expires_at && (
                <div className="font-mono text-[9px] text-amber">3:30</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Betrayal prompt */}
        <AnimatePresence>
          {betrayalPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/90 flex items-end"
            >
              <div className="w-full bg-surface border-t border-white/10 p-6">
                <div className="font-mono text-[10px] text-red/60 tracking-widest mb-3">DECISÃO SECRETA</div>
                <p className="text-white font-sans text-sm leading-relaxed mb-6">
                  Encontraste algo importante. O que vais fazer?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleBetrayal('reveal')} className="btn-primary text-xs py-4">
                    Revelar ao grupo
                  </button>
                  <button onClick={() => handleBetrayal('keep')} className="btn-ghost text-xs py-4">
                    Guardar segredo
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeApp === 'home' && (
            <div className="flex-1 flex flex-col p-5">
              {/* Player role */}
              <div className="border border-white/10 bg-surface3 p-4 mb-6">
                <div className="font-mono text-[9px] text-white/20 tracking-widest mb-1">O TEU PAPEL</div>
                <div className="font-display text-xl font-bold">{player?.role_label || '...'}</div>
                {activeClues.length > 0 && (
                  <div className="font-mono text-[10px] text-red mt-2 animate-pulse">{activeClues.length} pista{activeClues.length !== 1 ? 's' : ''} ativa{activeClues.length !== 1 ? 's' : ''}</div>
                )}
              </div>

              {/* Apps grid */}
              <div className="grid grid-cols-3 gap-4">
                {apps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setActiveApp(app.id as AppView)}
                    className="flex flex-col items-center gap-2 p-3 border border-white/5 bg-surface3 hover:border-red/30 transition-all relative"
                  >
                    {app.count > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red rounded-full flex items-center justify-center">
                        <span className="text-[8px] font-bold">{app.count}</span>
                      </div>
                    )}
                    <span className="text-2xl">{app.icon}</span>
                    <span className="font-mono text-[9px] text-white/40 tracking-wide">{app.label}</span>
                  </button>
                ))}
              </div>

              {/* Recent clues */}
              {activeClues.length > 0 && (
                <div className="mt-6">
                  <div className="font-mono text-[9px] text-white/20 tracking-widest mb-3">PISTAS RECENTES</div>
                  <div className="space-y-2">
                    {activeClues.slice(0, 3).map((c) => (
                      <ClueRow key={c.id} clue={c} onClick={() => openClue(c)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(activeApp === 'messages' || activeApp === 'gallery' || activeApp === 'email') && (
            <AppView
              title={activeApp === 'messages' ? 'Mensagens' : activeApp === 'gallery' ? 'Galeria' : 'Email'}
              clues={clues.filter(c =>
                activeApp === 'messages' ? c.clue_type === 'message' || c.clue_type === 'ia_message' :
                activeApp === 'gallery' ? c.clue_type === 'photo' :
                c.clue_type === 'document'
              )}
              onBack={() => setActiveApp('home')}
              onOpen={openClue}
            />
          )}

          {activeApp === 'clue' && selectedClue && (
            <ClueDetailView clue={selectedClue} onBack={() => setActiveApp('home')} />
          )}

          {(activeApp === 'notes' || activeApp === 'calls' || activeApp === 'browser') && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <button onClick={() => setActiveApp('home')} className="text-white/40 hover:text-white">←</button>
                <span className="font-mono text-xs text-white/40 capitalize">{activeApp}</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="font-mono text-xs text-white/20">Sem conteúdo disponível</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-around px-4 py-3 border-t border-white/5 bg-surface">
          <button onClick={() => setActiveApp('home')} className={`p-2 ${activeApp === 'home' ? 'text-red' : 'text-white/30'}`}>
            <span className="text-lg">⊞</span>
          </button>
          <div className="font-mono text-[9px] text-white/20 tracking-widest">
            {String(elapsedMin).padStart(2,'0')}:{String(elapsedSec).padStart(2,'0')}
          </div>
          <button onClick={() => setActiveApp('messages')} className={`p-2 relative ${activeApp === 'messages' ? 'text-red' : 'text-white/30'}`}>
            <span className="text-lg">💬</span>
            {activeClues.filter(c => c.clue_type === 'message' && !c.opened_at).length > 0 && (
              <div className="absolute -top-0 -right-0 w-2 h-2 bg-red rounded-full" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function ClueRow({ clue, onClick }: { clue: Clue; onClick: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!clue.expires_at) return
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(clue.expires_at!).getTime() - Date.now()) / 1000))
      setTimeLeft(diff)
    }
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [clue.expires_at])

  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 border border-white/5 bg-surface3 hover:border-red/20 transition-all text-left">
      <div className="w-1.5 h-1.5 rounded-full bg-red flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-sans text-xs font-600 text-white truncate">{clue.title}</div>
        <div className="font-mono text-[9px] text-white/30 mt-0.5 capitalize">{clue.clue_type}</div>
      </div>
      {timeLeft !== null && (
        <div className={`font-mono text-[9px] flex-shrink-0 ${timeLeft < 60 ? 'text-red animate-pulse' : 'text-amber'}`}>
          {String(Math.floor(timeLeft / 60)).padStart(2,'0')}:{String(timeLeft % 60).padStart(2,'0')}
        </div>
      )}
    </button>
  )
}

function AppView({ title, clues, onBack, onOpen }: { title: string; clues: Clue[]; onBack: () => void; onOpen: (c: Clue) => void }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button onClick={onBack} className="text-white/40 hover:text-white text-lg">←</button>
        <span className="font-mono text-xs text-white/40">{title}</span>
        <span className="ml-auto font-mono text-[9px] text-white/20">{clues.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {clues.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="font-mono text-xs text-white/15">Sem conteúdo</span>
          </div>
        ) : clues.map((c) => (
          <ClueRow key={c.id} clue={c} onClick={() => onOpen(c)} />
        ))}
      </div>
    </div>
  )
}

function ClueDetailView({ clue, onBack }: { clue: Clue; onBack: () => void }) {
  const content = clue.content as Record<string, string>
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button onClick={onBack} className="text-white/40 hover:text-white">←</button>
        <span className="font-sans text-sm font-600 text-white truncate">{clue.title}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {clue.clue_type === 'photo' && content.file && (
          <div className="w-full aspect-video bg-surface3 border border-white/10 flex items-center justify-center mb-4">
            <span className="font-mono text-xs text-white/20">[{content.file}]</span>
          </div>
        )}
        {content.caption && (
          <div className="border border-white/10 p-3 mb-4">
            <div className="font-mono text-[9px] text-white/30 tracking-widest mb-1">LEGENDA</div>
            <div className="font-mono text-xs text-white/70 leading-relaxed whitespace-pre-line">{content.caption}</div>
          </div>
        )}
        {content.text && (
          <div className="font-sans text-sm text-white/70 leading-relaxed whitespace-pre-line mb-4">{content.text}</div>
        )}
        {content.transcript && (
          <div className="border border-white/10 p-4 mb-4">
            <div className="font-mono text-[9px] text-white/30 tracking-widest mb-2">TRANSCRIÇÃO</div>
            <div className="font-mono text-sm text-white/60 italic">"{content.transcript}"</div>
            {content.duration && <div className="font-mono text-[9px] text-white/20 mt-2">{content.duration}s</div>}
          </div>
        )}
        {content.file && (
          <div className="font-mono text-[9px] text-white/15 mt-4">arquivo: {content.file}</div>
        )}
        {clue.expires_at && (
          <ExpiryTimer expiresAt={clue.expires_at} />
        )}
      </div>
    </div>
  )
}

function ExpiryTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState(0)
  useEffect(() => {
    const update = () => setTimeLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)))
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [expiresAt])
  return (
    <div className={`border p-3 mt-4 ${timeLeft < 60 ? 'border-red/40 bg-red/5' : 'border-amber/20 bg-amber/5'}`}>
      <div className="font-mono text-[9px] text-white/30 tracking-widest mb-1">ESTA PISTA EXPIRA EM</div>
      <div className={`font-mono text-lg font-bold ${timeLeft < 60 ? 'text-red' : 'text-amber'}`}>
        {String(Math.floor(timeLeft / 60)).padStart(2,'0')}:{String(timeLeft % 60).padStart(2,'0')}
      </div>
    </div>
  )
}
