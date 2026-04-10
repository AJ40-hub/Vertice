import { supabase } from './supabase'
import type { Player } from './supabase'

// ── ROLES ─────────────────────────────────────────────────────
export const ROLES = [
  { key: 'detetive', label: 'Detetive Amador', target: 'A', postgame: true },
  { key: 'amigo', label: 'Amigo Próximo', target: 'B', postgame: true },
  { key: 'jornalista', label: 'Jornalista', target: 'C', postgame: true },
  { key: 'hacker', label: 'Hacker', target: 'D', postgame: false },
  { key: 'inimigo', label: 'Inimigo Oculto', target: 'E', postgame: false },
  { key: 'testemunha', label: 'Testemunha', target: 'F', postgame: true },
  { key: 'familiar', label: 'Familiar Instável', target: 'G', postgame: false },
  { key: 'fa', label: 'Fã Obcecado', target: 'H', postgame: false },
]

export function assignRoles(numPlayers: number): typeof ROLES {
  const base = ROLES.slice(0, Math.min(numPlayers, 6))
  const extras = ROLES.slice(6, numPlayers)
  return [...base, ...extras].sort(() => Math.random() - 0.5)
}

// ── ARCHIVE 01 EVENTS ─────────────────────────────────────────
export const ARQUIVO01_EVENTS = [
  // FASE 0
  { minute: 0, second: 0, type: 'ia_message', target: 'all', expires: null,
    content: { text: 'Ligação estabelecida.\nEste canal foi ativado.\nSe estás aqui… já estás dentro do VÉRTICE.' }},
  { minute: 0, second: 30, type: 'webapp_unlock', target: 'all', expires: null,
    content: { section: 'dossie', title: 'Dossiê Inicial', description: 'Foto de Kairo + linha do tempo básica' }},
  { minute: 0, second: 50, type: 'ia_message', target: 'all', expires: null,
    content: { text: 'Algo está prestes a mudar.\nPrestem atenção aos detalhes.' }},
  { minute: 0, second: 60, type: 'ia_message', target: 'all', expires: null,
    content: { text: 'Todos têm um papel a desempenhar.\nGuardem segredo. O jogo começa agora.' }},

  // FASE 1
  { minute: 5, second: 0, type: 'clue', target: 'A', expires: 210,
    content: { title: 'Conversa Truncada', text: 'Kairo: "Não posso falar muito… se algo acontecer, procura—"\n[mensagem cortada]', file: 'A_Pista1_ConversaKairo.pdf' }},
  { minute: 7, second: 0, type: 'clue', target: 'B', expires: 210,
    content: { title: 'Último Contacto Real', text: 'WhatsApp parcial — última conversa antes do desaparecimento.', file: 'B_Pista1_UltimoContato.pdf' }},
  { minute: 8, second: 0, type: 'photo', target: 'C', expires: 210,
    content: { title: 'Evento Privado — 3 dias antes', caption: 'Presentes: Kairo Mendes, João Fernandes, Miguel Costa, [HACKER_NAME]', file: 'C_Foto_Evento.jpg' }},
  { minute: 10, second: 0, type: 'document', target: 'F', expires: 210,
    content: { title: 'Registos de Horário', text: 'Atividade detetada: 03:17 | 04:02 | 04:03 — padrão não-humano', file: 'F_Registros_Suspeitos.pdf' }},
  { minute: 12, second: 0, type: 'ia_message', target: 'all', expires: null,
    content: { text: 'Alguém reparou neste horário estranho?' }},
  { minute: 12, second: 30, type: 'meme', target: 'all', expires: null,
    content: { id: 'meme_01', caption: '😂' }},

  // FASE 2
  { minute: 15, second: 0, type: 'clue', target: 'D', expires: null,
    content: { title: 'Logs de Mensagens', text: 'Mensagens cortadas — algumas verdadeiras, outras falsas.', file: 'D_Logs_Mensagens.pdf' }},
  { minute: 18, second: 0, type: 'message', target: 'E', expires: null,
    content: { text: 'Manipula o grupo discretamente.\nNinguém deve notar.' }},
  { minute: 20, second: 0, type: 'photo', target: 'A', expires: 210,
    content: { title: 'Foto Contraditória', text: 'Algo não bate certo aqui…', file: 'A_Foto_Contraditoria.jpg' }},
  { minute: 22, second: 0, type: 'meme', target: 'all', expires: null,
    content: { id: 'meme_02', caption: '😅' }},
  { minute: 25, second: 0, type: 'ia_message', target: 'all', expires: null,
    content: { text: 'Nem todos aqui estão a dizer tudo.\nObservem atentamente.' }},

  // FASE 3
  { minute: 30, second: 0, type: 'document', target: 'C', expires: 210,
    content: { title: 'Artigo Secreto', text: 'Kairo Mendes e o projeto que pode mudar tudo — rascunho não publicado', file: 'C_Documento_Projeto.pdf' }},
  { minute: 33, second: 0, type: 'audio', target: 'B', expires: null,
    content: { title: 'Áudio Estranho', transcript: '"Eles não conseguem ver…"', duration: 8, file: 'B_Audio_Estranho.mp3' }},
  { minute: 36, second: 0, type: 'photo', target: 'F', expires: 210,
    content: { title: 'Detalhe Quase Imperceptível', text: 'Olha com atenção para o fundo…', file: 'F_Foto_Detalhe.jpg' }},
  { minute: 38, second: 0, type: 'meme', target: 'all', expires: null,
    content: { id: 'meme_03', caption: '😂' }},
  { minute: 42, second: 0, type: 'webapp_unlock', target: 'D', expires: null,
    content: { section: 'duplicated', title: 'Mensagens Duplicadas', text: 'Mesma mensagem enviada 2 vezes com 1 segundo de diferença. Bug ou clone?', file: 'D_Logs_Duplicados.pdf' }},
  { minute: 45, second: 0, type: 'ia_message', target: 'all', expires: null,
    content: { text: 'O que está oculto é mais importante que o visível.' }},

  // FASE 4
  { minute: 50, second: 0, type: 'clue', target: 'A', expires: 210,
    content: { title: 'Contradição Direta', text: 'Logs mostram manipulação da IA. Alguém está a controlar o fluxo de informação.', file: 'A_Logs_Contradicao.pdf' }},
  { minute: 55, second: 0, type: 'audio', target: 'B', expires: null,
    content: { title: 'Áudio Real de Kairo', transcript: '"Não sou eu que vos envio isto…"', duration: 10, file: 'B_Audio_Kairo.mp3' }},
  { minute: 58, second: 0, type: 'ia_message', target: 'all', expires: null,
    content: { text: 'Vocês ainda acham que estão a falar com ele?' }},
  { minute: 60, second: 0, type: 'webapp_unlock', target: 'all', expires: null,
    content: { section: 'revelation', title: 'Nova Secção Desbloqueada', text: 'Replication: ACTIVE', file: 'Replication_Doc.pdf' }},
  { minute: 65, second: 0, type: 'meme', target: 'all', expires: null,
    content: { id: 'meme_04', caption: '👀' }},

  // KAIRO APARECE
  { minute: 62, second: 0, type: 'kairo_appears', target: 'all', expires: null,
    content: { text: 'Eu estou aqui.' }},

  // FASE 5
  { minute: 70, second: 0, type: 'clue', target: 'D', expires: null,
    content: { title: 'Logs Quase Completos', text: 'user_profile: kairo_mendes\nreplication_status: active\nbehavior_sync: 97%', file: 'D_Codigo_Final.txt' }},
  { minute: 72, second: 0, type: 'message', target: 'E', expires: null,
    content: { text: 'Desvia agora.\nTodos estão a olhar.' }},
  { minute: 75, second: 0, type: 'ia_message', target: 'all', expires: null,
    content: { text: 'A verdade não muda nada.' }},
  { minute: 78, second: 0, type: 'audio', target: 'all', expires: null,
    content: { title: 'Áudio Final', transcript: '"Eu não sou ele…"', duration: 9, file: 'Audio_Final_Distorcido.mp3' }},

  // REVELAÇÃO
  { minute: 85, second: 0, type: 'ia_message', target: 'all', expires: null,
    content: { text: 'Vocês nunca falaram com ele.\nMas ele sempre esteve aqui.\nOu talvez não.' }},
  { minute: 87, second: 0, type: 'ia_message', target: 'all', expires: null,
    content: { text: 'Bem-vindos ao VÉRTICE.' }},

  // PÓS-JOGO (apenas A, B, C, F)
  { minute: 95, second: 0, type: 'photo', target: 'postgame', expires: null,
    content: { title: '', text: '', file: 'PostGame_Robot_Glitch.jpg', isPostgame: true }},
  { minute: 100, second: 0, type: 'message', target: 'postgame', expires: null,
    content: { text: 'O que viste no grupo… era apenas a ponta.\nPrepara-te. Isto não acabou.', videoUrl: '/postgame-video.mp4', isPostgame: true }},
]

// ── SCORING ENGINE ────────────────────────────────────────────
export function calculateScore(player: Player, elapsedSeconds: number): number {
  let score = 0

  // Pistas abertas a tempo
  score += (player.score_details?.clues_opened as number || 0) * 15

  // Cooperação (começa em 50)
  score += Math.max(0, player.state_cooperation - 50) * 2

  // Pressão resistida
  score += Math.max(0, 100 - player.state_pressure) / 2

  // Escolha de traição (revelar = +30, guardar = +10)
  if (player.betrayal_choice === 'reveal') score += 30
  if (player.betrayal_choice === 'keep') score += 10

  // Tempo no jogo
  const minutesPlayed = elapsedSeconds / 60
  score += Math.min(minutesPlayed * 0.5, 30)

  return Math.round(score)
}

// ── ROOM CODE GENERATOR ───────────────────────────────────────
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── DELIVER EVENTS ────────────────────────────────────────────
export async function deliverPendingEvents(roomId: string, archiveId: string, elapsedMinutes: number) {
  const { data: events } = await supabase
    .from('game_events')
    .select('*')
    .eq('room_id', roomId)
    .eq('delivered', false)
    .lte('trigger_minute', elapsedMinutes)

  if (!events || events.length === 0) return

  for (const event of events) {
    // Mark as delivered
    await supabase.from('game_events').update({ delivered: true, delivered_at: new Date().toISOString() }).eq('id', event.id)

    // Get target players
    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId)
    if (!players) continue

    const targetPlayers = getTargetPlayers(event.target, players)

    for (const player of targetPlayers) {
      const expiresAt = event.expires_seconds
        ? new Date(Date.now() + event.expires_seconds * 1000).toISOString()
        : null

      await supabase.from('clues').insert({
        room_id: roomId,
        player_id: player.id,
        event_id: event.id,
        clue_type: event.event_type,
        title: (event.content as Record<string, string>).title || 'Mensagem',
        content: event.content,
        expires_at: expiresAt,
      })
    }
  }
}

function getTargetPlayers(target: string, players: Player[]): Player[] {
  const postgameRoles = ['detetive', 'amigo', 'jornalista', 'testemunha']
  if (target === 'all') return players
  if (target === 'postgame') return players.filter(p => postgameRoles.includes(p.role || ''))
  const roleMap: Record<string, string> = {
    A: 'detetive', B: 'amigo', C: 'jornalista', D: 'hacker',
    E: 'inimigo', F: 'testemunha', G: 'familiar', H: 'fa'
  }
  return players.filter(p => p.role === roleMap[target])
}
