import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Battery,
  Bell,
  Bot,
  Clock3,
  Download,
  FileText,
  Globe2,
  Image as ImageIcon,
  Lock,
  Mail,
  MessageCircle,
  Paperclip,
  Phone,
  Power,
  Search,
  Signal,
  Users,
  Wifi,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useGameStore } from './gameStore'
import { useRoomRealtime } from './useRealtime'
import { deliverPendingEvents } from './gameEngine'
import type { Clue, Player, Room } from './supabase'

type AppView = 'home' | 'messages' | 'gallery' | 'email' | 'notes' | 'calls' | 'browser' | 'clue'
type DeviceVariant = 'ios' | 'android'
type ThreadId = 'vertice' | 'group' | 'kairo' | 'system'

type AppDefinition = {
  id: AppView
  label: string
  short: string
  icon: LucideIcon
  count: number
  accent: string
}

type Thread = {
  id: ThreadId
  label: string
  subtitle: string
  icon: LucideIcon
  clues: Clue[]
}

function detectDeviceVariant(): DeviceVariant {
  if (typeof navigator === 'undefined') return 'ios'
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string }
  }
  const platform = `${nav.userAgentData?.platform || nav.platform || ''}`.toLowerCase()
  const userAgent = nav.userAgent.toLowerCase()
  const touchPoints = nav.maxTouchPoints || 0

  if (userAgent.includes('android') || platform.includes('android')) return 'android'
  if (
    userAgent.includes('iphone') ||
    userAgent.includes('ipad') ||
    platform.includes('iphone') ||
    platform.includes('ipad') ||
    (platform.includes('mac') && touchPoints > 1)
  ) return 'ios'

  return 'ios'
}

function useDeviceVariant() {
  const [variant, setVariant] = useState<DeviceVariant>('ios')

  useEffect(() => {
    setVariant(detectDeviceVariant())
  }, [])

  return variant
}

function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 10000)
    return () => window.clearInterval(interval)
  }, [])

  return now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

function clueContent(clue: Clue) {
  return clue.content as Record<string, unknown>
}

function asText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function clueFileName(clue: Clue) {
  const content = clueContent(clue)
  return asText(content.file) || asText(content.asset_name)
}

function clueFileUrl(clue: Clue) {
  const content = clueContent(clue)
  const candidates = [
    clue.file_url,
    asText(content.signed_url),
    asText(content.file_url),
    asText(content.asset_url),
    asText(content.download_url),
    asText(content.url),
  ].filter(Boolean) as string[]

  return candidates.find((url) => url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/')) || ''
}

function clueText(clue: Clue) {
  const content = clueContent(clue)
  return asText(content.text) || asText(content.caption) || asText(content.transcript) || ''
}

function isPhoto(clue: Clue) {
  return clue.clue_type === 'photo'
}

function isAudio(clue: Clue) {
  return clue.clue_type === 'audio'
}

function isDocument(clue: Clue) {
  const fileName = clueFileName(clue).toLowerCase()
  return clue.clue_type === 'document' || clue.clue_type === 'clue' || clue.clue_type === 'webapp_unlock' || fileName.endsWith('.pdf')
}

function isTextNote(clue: Clue) {
  return !isPhoto(clue) && !isAudio(clue) && !isDocument(clue) && Boolean(clueText(clue))
}

function getThreadId(clue: Clue): ThreadId {
  if (clue.clue_type === 'kairo_appears') return 'kairo'
  if (clue.clue_type === 'ia_message') return 'group'
  if (clue.clue_type === 'message' || clue.clue_type === 'document' || clue.clue_type === 'photo' || clue.clue_type === 'audio' || clue.clue_type === 'clue') {
    return 'vertice'
  }
  return 'system'
}

function sortedClues(clues: Clue[], ascending = false) {
  return [...clues].sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return ascending ? diff : -diff
  })
}

function unreadCount(clues: Clue[]) {
  return clues.filter((clue) => !clue.opened_at && !clue.expired).length
}

export default function GamePage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const variant = useDeviceVariant()
  const clock = useClock()
  const { room, player, clues, setRoom, setPlayer, expireClue, setElapsed, incrementElapsed, gameElapsedSeconds } = useGameStore()
  const [activeApp, setActiveApp] = useState<AppView>('home')
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null)
  const [betrayalPrompt, setBetrayalPrompt] = useState(false)
  const [finishPrompt, setFinishPrompt] = useState(false)
  const [finishingRoom, setFinishingRoom] = useState(false)
  const [finishError, setFinishError] = useState('')
  const [kairoMessage, setKairoMessage] = useState<string | null>(null)
  const [glitch, setGlitch] = useState(false)
  const [newClueAlert, setNewClueAlert] = useState<Clue | null>(null)
  const finishRequestedRef = useRef(false)
  const knownClueIdsRef = useRef<Set<string>>(new Set())
  const cluesInitializedRef = useRef(false)

  useRoomRealtime(room?.id)

  useEffect(() => {
    const savedRoom = sessionStorage.getItem('vertice_room')
    const savedPlayer = sessionStorage.getItem('vertice_player')
    if (!savedRoom || !savedPlayer) {
      navigate('/')
      return
    }

    const roomData = JSON.parse(savedRoom) as Room
    const playerData = JSON.parse(savedPlayer) as Player
    setRoom(roomData)
    setPlayer(playerData)
    if (roomData.started_at) {
      setElapsed(Math.floor((Date.now() - new Date(roomData.started_at).getTime()) / 1000))
    }
  }, [])

  useEffect(() => {
    if (!room || !player) return
    const timer = window.setInterval(() => {
      incrementElapsed()
    }, 1000)
    return () => window.clearInterval(timer)
  }, [room?.id, player?.id])

  useEffect(() => {
    if (!room || !player) return
    const elapsedMinutes = Math.floor(gameElapsedSeconds / 60)

    deliverPendingEvents(room.id, player.id)

    if (elapsedMinutes === 40 && !betrayalPrompt && player.betrayal_choice === null) {
      const betrayalRoles = ['detetive', 'amigo', 'jornalista', 'testemunha']
      if (betrayalRoles.includes(player.role || '')) setBetrayalPrompt(true)
    }
  }, [Math.floor(gameElapsedSeconds / 30)])

  useEffect(() => {
    const now = new Date()
    clues.forEach((clue) => {
      if (clue.expires_at && !clue.expired && new Date(clue.expires_at) < now) {
        expireClue(clue.id)
        if (room && player) {
          fetch('/api/player-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'expire_clue', room_id: room.id, player_id: player.id, clue_id: clue.id }),
          }).catch(() => undefined)
        }
      }
    })
  }, [gameElapsedSeconds])

  useEffect(() => {
    if (!player) return
    const known = knownClueIdsRef.current
    if (!cluesInitializedRef.current) {
      clues.forEach((clue) => known.add(clue.id))
      cluesInitializedRef.current = true
      return
    }

    const fresh = sortedClues(clues.filter((clue) => !known.has(clue.id)), true)
    fresh.forEach((clue) => known.add(clue.id))
    const clue = fresh.at(-1)
    if (!clue) return

    setNewClueAlert(clue)
    setGlitch(true)
    window.setTimeout(() => setGlitch(false), 400)
    window.setTimeout(() => setNewClueAlert(null), 4500)

    if (clue.clue_type === 'kairo_appears') {
      setKairoMessage(asText(clueContent(clue).text))
      window.setTimeout(() => setKairoMessage(null), 5000)
    }
  }, [player?.id, clues])

  useEffect(() => {
    if (room?.status === 'finished') {
      window.setTimeout(() => navigate(`/sala/${code}/pos-jogo`), 2000)
    }
  }, [room?.status])

  useEffect(() => {
    if (!selectedClue) return
    const latest = clues.find((clue) => clue.id === selectedClue.id)
    if (latest && latest !== selectedClue) setSelectedClue(latest)
  }, [clues, selectedClue])

  useEffect(() => {
    if (!room || !player || finishRequestedRef.current || room.status !== 'playing') return
    if (gameElapsedSeconds < 90 * 60) return
    finishRequestedRef.current = true
    fetch('/api/finish-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: room.id, player_id: player.id }),
    }).catch(() => {
      finishRequestedRef.current = false
    })
  }, [room?.id, room?.status, player?.id, gameElapsedSeconds])

  async function handleBetrayal(choice: 'reveal' | 'keep') {
    if (!player || !room) return
    await fetch('/api/player-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'betrayal', room_id: room.id, player_id: player.id, choice }),
    })
    setBetrayalPrompt(false)
  }

  async function finishRoomManually() {
    if (!room || !player || !player.is_host || finishingRoom) return

    setFinishingRoom(true)
    setFinishError('')
    try {
      const response = await fetch('/api/finish-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: room.id, player_id: player.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setFinishError(data?.error || 'Não foi possível encerrar a sala.')
        return
      }
      if (data?.room) {
        setRoom(data.room)
        sessionStorage.setItem('vertice_room', JSON.stringify(data.room))
      }
      setFinishPrompt(false)
    } catch {
      setFinishError('A ligação falhou. Tenta novamente.')
    } finally {
      setFinishingRoom(false)
    }
  }

  async function openClue(clue: Clue) {
    if (!clue.opened_at && room && player) {
      await fetch('/api/player-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open_clue', room_id: room.id, player_id: player.id, clue_id: clue.id }),
      })
    }
    setSelectedClue(clue)
    setActiveApp('clue')
  }

  const elapsedMin = Math.floor(gameElapsedSeconds / 60)
  const elapsedSec = gameElapsedSeconds % 60
  const activeClues = clues.filter((clue) => !clue.expired)
  const batteryLevel = Math.max(5, 100 - Math.floor(gameElapsedSeconds / 54))
  const unread = unreadCount(clues)
  const archive = (room as (Room & { archives?: { title?: string; subtitle?: string } }) | null)?.archives
  const archiveName = archive ? `${archive.title || 'Arquivo'}: ${archive.subtitle || 'Sessão ativa'}` : 'Arquivo em execução'

  const apps: AppDefinition[] = [
    { id: 'messages', icon: MessageCircle, short: 'WA', label: 'Mensagens', count: unread, accent: 'bg-emerald-900/80 border-emerald-400/20' },
    { id: 'gallery', icon: ImageIcon, short: 'IMG', label: 'Galeria', count: unreadCount(clues.filter(isPhoto)), accent: 'bg-zinc-800 border-white/10' },
    { id: 'email', icon: Mail, short: '@', label: 'Email', count: unreadCount(clues.filter(isDocument)), accent: 'bg-blue-950/80 border-blue-300/15' },
    { id: 'notes', icon: FileText, short: 'TXT', label: 'Notas', count: unreadCount(clues.filter(isTextNote)), accent: 'bg-amber-950/80 border-amber-300/15' },
    { id: 'calls', icon: Phone, short: 'CALL', label: 'Chamadas', count: unreadCount(clues.filter(isAudio)), accent: 'bg-cyan-950/70 border-cyan-300/15' },
    { id: 'browser', icon: Globe2, short: 'WWW', label: 'Browser', count: unreadCount(clues.filter((clue) => clue.clue_type === 'webapp_unlock')), accent: 'bg-zinc-900 border-white/10' },
  ]

  return (
    <div className={`min-h-dvh overflow-hidden bg-black text-white transition-all duration-300 ${glitch ? 'hue-rotate-180' : ''}`}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,45,45,0.12),transparent_28%),radial-gradient(circle_at_18%_82%,rgba(0,96,110,0.14),transparent_28%)]" />
      <div className="relative flex min-h-dvh items-center justify-center px-3 py-4">
        <DeviceFrame variant={variant}>
          <PhoneStatusBar clock={clock} batteryLevel={batteryLevel} variant={variant} />

          <NotificationDock
            clue={newClueAlert}
            variant={variant}
            onOpen={openClue}
          />

          <AnimatePresence>
            {kairoMessage && <KairoOverlay message={kairoMessage} />}
          </AnimatePresence>

          <AnimatePresence>
            {betrayalPrompt && (
              <BetrayalSheet
                onReveal={() => handleBetrayal('reveal')}
                onKeep={() => handleBetrayal('keep')}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {finishPrompt && (
              <HostFinishSheet
                loading={finishingRoom}
                error={finishError}
                onCancel={() => {
                  if (!finishingRoom) {
                    setFinishError('')
                    setFinishPrompt(false)
                  }
                }}
                onConfirm={finishRoomManually}
              />
            )}
          </AnimatePresence>

          <div className="min-h-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {activeApp === 'home' && (
                <PhoneHome
                  key="home"
                  variant={variant}
                  player={player}
                  archiveName={archiveName}
                  apps={apps}
                  activeClues={activeClues}
                  elapsedMin={elapsedMin}
                  elapsedSec={elapsedSec}
                  onOpenApp={setActiveApp}
                  onOpenClue={openClue}
                  onRequestFinish={player?.is_host ? () => setFinishPrompt(true) : undefined}
                />
              )}

              {activeApp === 'messages' && (
                <MessagesApp
                  key="messages"
                  clues={clues}
                  onBack={() => setActiveApp('home')}
                  onOpenClue={openClue}
                />
              )}

              {activeApp === 'gallery' && (
                <ClueCollectionApp
                  key="gallery"
                  title="Galeria"
                  emptyText="Sem fotos desbloqueadas"
                  clues={sortedClues(clues.filter(isPhoto))}
                  onBack={() => setActiveApp('home')}
                  onOpenClue={openClue}
                />
              )}

              {activeApp === 'email' && (
                <ClueCollectionApp
                  key="email"
                  title="Email"
                  emptyText="Sem documentos recebidos"
                  clues={sortedClues(clues.filter(isDocument))}
                  onBack={() => setActiveApp('home')}
                  onOpenClue={openClue}
                />
              )}

              {activeApp === 'notes' && (
                <ClueCollectionApp
                  key="notes"
                  title="Notas"
                  emptyText="Sem notas disponíveis"
                  clues={sortedClues(clues.filter(isTextNote))}
                  onBack={() => setActiveApp('home')}
                  onOpenClue={openClue}
                />
              )}

              {activeApp === 'calls' && (
                <ClueCollectionApp
                  key="calls"
                  title="Chamadas"
                  emptyText="Sem áudios ou chamadas"
                  clues={sortedClues(clues.filter(isAudio))}
                  onBack={() => setActiveApp('home')}
                  onOpenClue={openClue}
                />
              )}

              {activeApp === 'browser' && (
                <ClueCollectionApp
                  key="browser"
                  title="Browser"
                  emptyText="Sem páginas desbloqueadas"
                  clues={sortedClues(clues.filter((clue) => clue.clue_type === 'webapp_unlock' || clue.clue_type === 'kairo_appears'))}
                  onBack={() => setActiveApp('home')}
                  onOpenClue={openClue}
                />
              )}

              {activeApp === 'clue' && selectedClue && (
                <ClueDetailView
                  key="clue"
                  clue={selectedClue}
                  onBack={() => setActiveApp('messages')}
                />
              )}
            </AnimatePresence>
          </div>

          <PhoneHomeIndicator />
        </DeviceFrame>
      </div>
    </div>
  )
}

function DeviceFrame({ variant, children }: { variant: DeviceVariant; children: React.ReactNode }) {
  const isIos = variant === 'ios'
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative bg-zinc-950 shadow-[0_32px_100px_rgba(0,0,0,0.78),inset_0_0_0_2px_rgba(255,255,255,0.14)] ${
        isIos ? 'p-[9px] rounded-[46px]' : 'p-2 rounded-[32px]'
      }`}
      style={{
        width: 'min(calc(100vw - 24px), 390px)',
        height: 'min(92dvh, 780px)',
      }}
    >
      {isIos ? (
        <div className="absolute left-1/2 top-4 z-30 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]" />
      ) : (
        <div className="absolute left-1/2 top-[17px] z-30 h-3 w-3 -translate-x-1/2 rounded-full border border-white/10 bg-black shadow-[0_0_0_2px_rgba(0,0,0,0.55)]" />
      )}
      <div
        className={`relative flex h-full flex-col overflow-hidden border border-white/5 ${
          isIos ? 'rounded-[38px]' : 'rounded-[25px]'
        }`}
        style={{
          backgroundImage: isIos
            ? 'radial-gradient(circle at 65% 12%, rgba(160,12,12,.45), transparent 28%), radial-gradient(circle at 15% 75%, rgba(0,70,80,.32), transparent 34%), linear-gradient(145deg,#090909,#010101 55%,#140505)'
            : 'radial-gradient(circle at 50% 8%, rgba(255,52,52,.35), transparent 23%), linear-gradient(155deg,#090909,#050505 62%,#101a1c)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[length:100%_42px,42px_100%]" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </motion.div>
  )
}

function PhoneStatusBar({ clock, batteryLevel, variant }: { clock: string; batteryLevel: number; variant: DeviceVariant }) {
  const isIos = variant === 'ios'
  return (
    <div className={`flex h-11 shrink-0 items-center justify-between ${isIos ? 'px-7 pt-1' : 'px-5 pt-1'} font-mono text-[10px] font-bold text-white`}>
      <span>{clock}</span>
      <div className={`flex items-center gap-1.5 ${isIos ? 'pr-1' : ''}`}>
        <Signal size={12} strokeWidth={2.2} />
        <Wifi size={12} strokeWidth={2.2} />
        <span>{batteryLevel}%</span>
        <Battery size={16} strokeWidth={2.2} className={batteryLevel < 20 ? 'text-red' : 'text-white'} />
      </div>
    </div>
  )
}

function NotificationDock({ clue, variant, onOpen }: { clue: Clue | null; variant: DeviceVariant; onOpen: (clue: Clue) => void }) {
  return (
    <AnimatePresence>
      {clue && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          onClick={() => onOpen(clue)}
          className={`mx-4 mb-3 mt-1 flex shrink-0 items-center gap-3 border border-white/12 bg-zinc-950/88 px-3 py-3 text-left shadow-[0_16px_38px_rgba(0,0,0,0.42)] backdrop-blur-md ${
            variant === 'ios' ? 'rounded-2xl' : 'rounded-[22px]'
          }`}
          aria-label={`Abrir pista ${clue.title}`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red/30 bg-red/10 text-red">
            <Bell size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-sans text-[11px] font-bold text-white">VÉRTICE</div>
            <div className="truncate font-sans text-xs text-white/76">Nova pista privada recebida.</div>
          </div>
          {clue.expires_at && <ExpiryPill clue={clue} compact />}
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function KairoOverlay({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/96 px-8"
    >
      <div className="text-center">
        <div className="mb-4 font-mono text-[10px] tracking-[0.3em] text-red/70">NOVA MENSAGEM</div>
        <div className="mb-2 font-mono text-xs text-white/30">Kairo Mendes:</div>
        <div className="font-display text-2xl font-black text-white">{message}</div>
        <div className="mt-6 animate-pulse font-mono text-[9px] text-white/20">contacto removido</div>
      </div>
    </motion.div>
  )
}

function BetrayalSheet({ onReveal, onKeep }: { onReveal: () => void; onKeep: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-end bg-black/86"
    >
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        className="w-full border-t border-white/10 bg-zinc-950/95 p-6 backdrop-blur-md"
      >
        <div className="mb-3 font-mono text-[10px] tracking-[0.25em] text-red/70">DECISÃO SECRETA</div>
        <p className="mb-6 font-sans text-sm leading-relaxed text-white/78">
          Encontraste algo importante. O que vais fazer?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onReveal} className="btn-primary px-3 py-4 text-xs">
            Revelar
          </button>
          <button type="button" onClick={onKeep} className="btn-ghost px-3 py-4 text-xs">
            Guardar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function HostFinishSheet({
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  loading: boolean
  error: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-end bg-black/88"
    >
      <motion.div
        initial={{ y: 90 }}
        animate={{ y: 0 }}
        exit={{ y: 90 }}
        className="w-full border-t border-red/25 bg-zinc-950/96 p-6 backdrop-blur-md"
      >
        <div className="mb-3 font-mono text-[10px] tracking-[0.25em] text-red/70">CONTROLO DO HOST</div>
        <h3 className="mb-3 font-display text-xl font-black text-white">Encerrar sala?</h3>
        <p className="mb-5 font-sans text-sm leading-relaxed text-white/66">
          A sala será encerrada para todos os jogadores. Se o jogo já estiver em andamento, o ranking será calculado com o progresso atual.
        </p>
        {error && (
          <div className="mb-4 rounded-2xl border border-red/35 bg-red/10 p-3 font-sans text-xs leading-relaxed text-red/90">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} disabled={loading} className="btn-ghost px-3 py-4 text-xs disabled:opacity-40">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="btn-primary px-3 py-4 text-xs disabled:opacity-50">
            {loading ? 'A encerrar...' : 'Encerrar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function PhoneHome({
  variant,
  player,
  archiveName,
  apps,
  activeClues,
  elapsedMin,
  elapsedSec,
  onOpenApp,
  onOpenClue,
  onRequestFinish,
}: {
  variant: DeviceVariant
  player: Player | null
  archiveName: string
  apps: AppDefinition[]
  activeClues: Clue[]
  elapsedMin: number
  elapsedSec: number
  onOpenApp: (app: AppView) => void
  onOpenClue: (clue: Clue) => void
  onRequestFinish?: () => void
}) {
  const isIos = variant === 'ios'
  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      className="flex h-full flex-col overflow-y-auto px-5 pb-5 pt-4"
    >
      <section className={isIos ? 'pt-8' : 'pt-4'}>
        <div className="mb-1 font-mono text-[10px] tracking-[0.28em] text-white/35">VÉRTICE</div>
        <h1 className={`${isIos ? 'text-xl' : 'text-2xl'} font-display font-black leading-tight text-white`}>
          {archiveName}
        </h1>
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-white/45">
          <Clock3 size={12} />
          <span>{String(elapsedMin).padStart(2, '0')}:{String(elapsedSec).padStart(2, '0')}</span>
          <span className="h-1 w-1 rounded-full bg-emerald-400" />
          <span>Dispositivo seguro ativo</span>
        </div>
      </section>

      <section className={`mt-5 border border-white/10 bg-black/26 p-4 ${isIos ? 'rounded-2xl' : 'rounded-[22px]'}`}>
        <div className="mb-1 font-mono text-[9px] tracking-[0.26em] text-white/28">O TEU PAPEL</div>
        <div className="font-sans text-lg font-bold text-white">{player?.role_label || 'A carregar...'}</div>
        {activeClues.length > 0 && (
          <div className="mt-2 font-mono text-[10px] text-red">
            {activeClues.length} pista{activeClues.length !== 1 ? 's' : ''} ativa{activeClues.length !== 1 ? 's' : ''}
          </div>
        )}
        {onRequestFinish && (
          <button
            type="button"
            onClick={onRequestFinish}
            className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-red/35 bg-red/10 px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-red/20 active:scale-[0.99]"
          >
            <Power size={14} />
            Encerrar sala
          </button>
        )}
      </section>

      <section className="mt-6 grid grid-cols-4 gap-x-3 gap-y-5">
        {apps.map((app) => (
          <PhoneAppIcon key={app.id} app={app} variant={variant} onOpen={() => onOpenApp(app.id)} />
        ))}
      </section>

      {activeClues.length > 0 && (
        <section className="mt-7">
          <div className="mb-3 font-mono text-[9px] tracking-[0.26em] text-white/25">PISTAS RECENTES</div>
          <div className="space-y-2">
            {sortedClues(activeClues).slice(0, 3).map((clue) => (
              <ClueListItem key={clue.id} clue={clue} onClick={() => onOpenClue(clue)} />
            ))}
          </div>
        </section>
      )}

      {isIos && (
        <section className="mt-auto pt-6">
          <div className="grid grid-cols-4 gap-3 rounded-[26px] border border-white/10 bg-white/8 p-3 backdrop-blur-md">
            {apps.slice(0, 4).map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => onOpenApp(app.id)}
                className={`relative flex h-12 items-center justify-center rounded-2xl border ${app.accent} transition-transform active:scale-95`}
                aria-label={app.label}
              >
                <app.icon size={20} />
                {app.count > 0 && <Badge count={app.count} />}
              </button>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  )
}

function PhoneAppIcon({ app, variant, onOpen }: { app: AppDefinition; variant: DeviceVariant; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group relative flex min-h-[74px] flex-col items-center gap-2 text-center" aria-label={app.label}>
      <div
        className={`relative flex h-12 w-12 items-center justify-center border ${app.accent} text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition-all group-active:scale-95 ${
          variant === 'ios' ? 'rounded-2xl' : 'rounded-[18px]'
        }`}
      >
        <app.icon size={20} strokeWidth={2.2} />
        {app.count > 0 && <Badge count={app.count} />}
      </div>
      <span className="max-w-[70px] break-words font-sans text-[10px] leading-tight text-white/78">{app.label}</span>
    </button>
  )
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red px-1 text-[10px] font-black leading-none text-white shadow-[0_0_18px_rgba(255,45,45,0.45)]">
      {Math.min(count, 9)}
    </span>
  )
}

function MessagesApp({ clues, onBack, onOpenClue }: { clues: Clue[]; onBack: () => void; onOpenClue: (clue: Clue) => void }) {
  const threads = useMemo(() => buildThreads(clues), [clues])
  const [activeThreadId, setActiveThreadId] = useState<ThreadId>('vertice')
  const activeThread = threads.find((thread) => thread.id === activeThreadId) || threads[0]

  return (
    <PhoneAppView title="Mensagens" onBack={onBack}>
      <div className="flex h-full flex-col">
        <div className="shrink-0 space-y-2 border-b border-white/8 p-3">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setActiveThreadId(thread.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all ${
                activeThread.id === thread.id ? 'border-red/35 bg-red/10' : 'border-white/8 bg-black/22'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/7">
                <thread.icon size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-sans text-xs font-bold text-white">{thread.label}</div>
                <div className="truncate font-sans text-[11px] text-white/42">{thread.subtitle}</div>
              </div>
              {unreadCount(thread.clues) > 0 && <Badge count={unreadCount(thread.clues)} />}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {activeThread.clues.length === 0 ? (
            <EmptyPhoneState icon={MessageCircle} title="Sem mensagens" text="Este contacto ainda não enviou nada." />
          ) : (
            <div className="space-y-3">
              {sortedClues(activeThread.clues, true).map((clue) => (
                <MessageBubble key={clue.id} clue={clue} thread={activeThread} onOpen={() => onOpenClue(clue)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PhoneAppView>
  )
}

function buildThreads(clues: Clue[]): Thread[] {
  const byThread: Record<ThreadId, Clue[]> = {
    vertice: [],
    group: [],
    kairo: [],
    system: [],
  }

  clues.forEach((clue) => {
    byThread[getThreadId(clue)].push(clue)
  })

  return [
    {
      id: 'vertice',
      label: 'VÉRTICE',
      subtitle: byThread.vertice[0]?.title || 'Canal privado',
      icon: Bot,
      clues: byThread.vertice,
    },
    {
      id: 'group',
      label: 'Grupo da sala',
      subtitle: byThread.group[0]?.title || 'Mensagens coletivas',
      icon: Users,
      clues: byThread.group,
    },
    {
      id: 'kairo',
      label: 'Kairo Mendes',
      subtitle: byThread.kairo[0]?.title || 'Estado desconhecido',
      icon: Search,
      clues: byThread.kairo,
    },
    {
      id: 'system',
      label: 'Sistema',
      subtitle: byThread.system[0]?.title || 'Alertas e desbloqueios',
      icon: Lock,
      clues: byThread.system,
    },
  ]
}

function MessageBubble({ clue, thread, onOpen }: { clue: Clue; thread: Thread; onOpen: () => void }) {
  const text = clueText(clue)
  const fileName = clueFileName(clue)
  return (
    <article className="max-w-[88%]">
      <button
        type="button"
        onClick={onOpen}
        className={`w-full rounded-2xl border px-3 py-2.5 text-left shadow-[0_12px_28px_rgba(0,0,0,0.25)] transition-all active:scale-[0.99] ${
          clue.expired ? 'border-white/8 bg-zinc-900/50 opacity-65' : thread.id === 'kairo' ? 'border-red/35 bg-red/10' : 'border-white/10 bg-zinc-950/82'
        }`}
      >
        <div className="mb-1 flex items-center gap-2">
          <thread.icon size={13} className={thread.id === 'kairo' ? 'text-red' : 'text-white/50'} />
          <span className="font-sans text-[11px] font-bold text-white">{thread.label}</span>
          {!clue.opened_at && !clue.expired && <span className="h-1.5 w-1.5 rounded-full bg-red" />}
        </div>
        <h3 className="font-sans text-sm font-bold text-white">{clue.title}</h3>
        {text && <p className="mt-1 whitespace-pre-line font-sans text-xs leading-relaxed text-white/68">{text}</p>}
        {fileName && (
          <div className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 ${clue.expired ? 'border-white/8 bg-black/20' : 'border-white/10 bg-black/35'}`}>
            <Paperclip size={14} className="shrink-0 text-white/45" />
            <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/62">{fileName}</span>
            {clue.expired ? <span className="font-mono text-[9px] text-red/80">expirado</span> : <Download size={14} className="text-white/40" />}
          </div>
        )}
        {clue.expires_at && <ExpiryPill clue={clue} />}
      </button>
    </article>
  )
}

function ClueCollectionApp({
  title,
  emptyText,
  clues,
  onBack,
  onOpenClue,
}: {
  title: string
  emptyText: string
  clues: Clue[]
  onBack: () => void
  onOpenClue: (clue: Clue) => void
}) {
  return (
    <PhoneAppView title={title} onBack={onBack}>
      <div className="h-full overflow-y-auto p-4">
        {clues.length === 0 ? (
          <EmptyPhoneState icon={FileText} title={emptyText} text="Quando o VÉRTICE desbloquear algo para ti, aparece aqui." />
        ) : (
          <div className="space-y-2">
            {clues.map((clue) => (
              <ClueListItem key={clue.id} clue={clue} onClick={() => onOpenClue(clue)} />
            ))}
          </div>
        )}
      </div>
    </PhoneAppView>
  )
}

function PhoneAppView({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      className="flex h-full flex-col overflow-hidden"
    >
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/8 px-4">
        <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full text-white/58 transition-colors hover:bg-white/8 hover:text-white" aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-sans text-sm font-bold text-white">{title}</h2>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </motion.div>
  )
}

function ClueListItem({ clue, onClick }: { clue: Clue; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-black/28 px-3 py-3 text-left transition-all hover:border-red/25">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${clue.expired ? 'border-white/8 bg-white/5 text-white/25' : 'border-red/20 bg-red/10 text-red'}`}>
        {isPhoto(clue) ? <ImageIcon size={16} /> : isAudio(clue) ? <Phone size={16} /> : <FileText size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-sans text-xs font-bold text-white">{clue.title}</div>
        <div className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">{clue.clue_type}</div>
      </div>
      {clue.expires_at && <ExpiryPill clue={clue} compact />}
    </button>
  )
}

function ClueDetailView({ clue, onBack }: { clue: Clue; onBack: () => void }) {
  const content = clueContent(clue)
  const fileUrl = clueFileUrl(clue)
  const fileName = clueFileName(clue)
  const text = clueText(clue)
  const canOpenFile = Boolean(fileUrl && !clue.expired)

  return (
    <PhoneAppView title={clue.title} onBack={onBack}>
      <div className="h-full overflow-y-auto p-5">
        {clue.expired && (
          <div className="mb-4 rounded-2xl border border-red/35 bg-red/10 p-4">
            <div className="font-mono text-[10px] font-bold tracking-[0.22em] text-red">PISTA EXPIRADA</div>
            <p className="mt-2 font-sans text-xs leading-relaxed text-white/65">Este anexo já não está disponível neste telefone.</p>
          </div>
        )}

        {isPhoto(clue) && canOpenFile && (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="mb-4 block overflow-hidden rounded-2xl border border-white/10 bg-black">
            <img src={fileUrl} alt={clue.title} className="max-h-[46vh] w-full object-contain" />
          </a>
        )}

        {isPhoto(clue) && !canOpenFile && fileName && (
          <div className="mb-4 flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-black/35">
            <span className="font-mono text-xs text-white/24">[{fileName}]</span>
          </div>
        )}

        {asText(content.caption) && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-black/24 p-3">
            <div className="mb-1 font-mono text-[9px] tracking-[0.24em] text-white/35">LEGENDA</div>
            <div className="whitespace-pre-line font-sans text-xs leading-relaxed text-white/70">{asText(content.caption)}</div>
          </div>
        )}

        {text && <div className="mb-4 whitespace-pre-line font-sans text-sm leading-relaxed text-white/72">{text}</div>}

        {asText(content.transcript) && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-black/24 p-4">
            <div className="mb-2 font-mono text-[9px] tracking-[0.24em] text-white/35">TRANSCRIÇÃO</div>
            <div className="font-mono text-sm italic text-white/65">"{asText(content.transcript)}"</div>
            {content.duration !== undefined && <div className="mt-2 font-mono text-[9px] text-white/24">{String(content.duration)}s</div>}
          </div>
        )}

        {fileName && (
          <div className="mt-4 rounded-2xl border border-white/8 bg-black/24 p-3">
            <div className="mb-1 font-mono text-[9px] tracking-[0.22em] text-white/24">ANEXO</div>
            <div className="truncate font-mono text-[10px] text-white/45">{fileName}</div>
          </div>
        )}

        {canOpenFile && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red/50 bg-red/10 px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-red"
          >
            <Download size={16} />
            Abrir ficheiro
          </a>
        )}

        {clue.expires_at && <ExpiryTimer clue={clue} />}
      </div>
    </PhoneAppView>
  )
}

function ExpiryPill({ clue, compact = false }: { clue: Clue; compact?: boolean }) {
  const timeLeft = useTimeLeft(clue.expires_at)
  if (timeLeft === null) return null
  const isCritical = timeLeft < 60
  return (
    <span className={`shrink-0 rounded-full border px-2 py-1 font-mono ${compact ? 'text-[9px]' : 'mt-3 inline-flex text-[10px]'} ${isCritical ? 'border-red/40 bg-red/10 text-red' : 'border-amber/25 bg-amber/10 text-amber'}`}>
      {formatSeconds(timeLeft)}
    </span>
  )
}

function ExpiryTimer({ clue }: { clue: Clue }) {
  const timeLeft = useTimeLeft(clue.expires_at)
  if (timeLeft === null) return null
  const isCritical = timeLeft < 60
  return (
    <div className={`mt-4 rounded-2xl border p-3 ${isCritical ? 'border-red/40 bg-red/10' : 'border-amber/20 bg-amber/10'}`}>
      <div className="mb-1 font-mono text-[9px] tracking-[0.22em] text-white/35">ESTA PISTA EXPIRA EM</div>
      <div className={`font-mono text-lg font-black ${isCritical ? 'text-red' : 'text-amber'}`}>{formatSeconds(timeLeft)}</div>
    </div>
  )
}

function useTimeLeft(expiresAt: string | null) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(null)
      return
    }
    const update = () => {
      setTimeLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)))
    }
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [expiresAt])

  return timeLeft
}

function formatSeconds(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function EmptyPhoneState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex h-full items-center justify-center px-8 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/35">
          <Icon size={20} />
        </div>
        <div className="font-sans text-sm font-bold text-white/70">{title}</div>
        <p className="mt-2 font-sans text-xs leading-relaxed text-white/35">{text}</p>
      </div>
    </div>
  )
}

function PhoneHomeIndicator() {
  return (
    <div className="flex h-7 shrink-0 items-center justify-center">
      <div className="h-1 w-28 rounded-full bg-white/28" />
    </div>
  )
}
