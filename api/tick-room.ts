import { getSupabaseAdmin } from './_lib/_supabaseAdmin.js'

const roleMap: Record<string, string> = {
  A: 'detetive',
  B: 'amigo',
  C: 'jornalista',
  D: 'hacker',
  E: 'inimigo',
  F: 'testemunha',
  G: 'familiar',
  H: 'fa',
}

const privateEventTypes = new Set(['clue', 'photo', 'document', 'audio', 'message', 'webapp_unlock'])

function getTargetPlayers(target: string, players: any[]) {
  const postgameRoles = ['detetive', 'amigo', 'jornalista', 'testemunha']
  if (target === 'all') return players
  if (target === 'postgame') return players.filter((p) => postgameRoles.includes(p.role || ''))
  return players.filter((p) => p.role === roleMap[target])
}

function publicPlayerName(player: any, target: string) {
  return player?.name ? `${player.name} (${target})` : `Jogador ${target}`
}

function groupMessageForEvent(event: any) {
  const content = event.content || {}
  const text = typeof content.text === 'string'
    ? content.text
    : typeof content.caption === 'string'
      ? content.caption
      : typeof content.title === 'string'
        ? content.title
        : ''

  if (event.event_type === 'ia_message') {
    return {
      sender_kind: 'ai',
      sender_name: 'VÉRTICE',
      message_type: 'ai',
      body: text,
    }
  }

  if (event.event_type === 'meme') {
    return {
      sender_kind: 'ai',
      sender_name: 'VÉRTICE',
      message_type: 'meme',
      body: text || 'A IA enviou um meme.',
    }
  }

  if (event.event_type === 'kairo_appears') {
    return {
      sender_kind: 'kairo',
      sender_name: 'Contacto desconhecido',
      message_type: 'kairo',
      body: text || '...',
    }
  }

  return null
}

function followUpMessageForEvent(event: any, targetPlayer: any) {
  const target = typeof event.target === 'string' ? event.target : ''
  const playerName = publicPlayerName(targetPlayer, target)
  const title = typeof event.content?.title === 'string' ? event.content.title : 'uma pista'
  const options = [
    `Hm... ${playerName}, melhor dizer a verdade.`,
    `${playerName} recebeu "${title}". Dois minutos de silêncio dizem muita coisa.`,
    `Aqui está assim? 😂 ${playerName}, queres explicar ou deixo o grupo imaginar?`,
    `Curioso. Sempre que uma pista aparece, alguém fica muito quieto. ${playerName}, estás bem?`,
  ]
  const seed = String(event.id || title).split('').reduce((total, char) => total + char.charCodeAt(0), 0)
  return options[seed % options.length]
}

async function insertContextualFollowUps(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  roomId: string,
  archiveId: string,
  elapsedSeconds: number,
  startedAtMs: number,
  players: any[],
) {
  const { data: events } = await supabase
    .from('game_events')
    .select('*')
    .eq('room_id', roomId)
    .eq('archive_id', archiveId)
    .eq('delivered', true)
    .order('trigger_minute', { ascending: true })
    .order('trigger_second', { ascending: true })

  const dueFollowUps = (events || []).filter((event) => {
    const eventSecond = ((event.trigger_minute || 0) * 60) + (event.trigger_second || 0)
    return privateEventTypes.has(event.event_type) &&
      event.target !== 'all' &&
      event.target !== 'postgame' &&
      eventSecond + 120 <= elapsedSeconds
  })

  for (const event of dueFollowUps) {
    const { data: existing } = await supabase
      .from('room_messages')
      .select('id')
      .eq('room_id', roomId)
      .contains('metadata', { follow_up_for_event_id: event.id })
      .maybeSingle()

    if (existing) continue

    const targetPlayer = getTargetPlayers(event.target, players)[0]
    const eventSecond = ((event.trigger_minute || 0) * 60) + (event.trigger_second || 0)
    const createdAt = new Date(startedAtMs + (eventSecond + 120) * 1000).toISOString()
    await supabase.from('room_messages').insert({
      room_id: roomId,
      event_id: null,
      recipient_player_id: null,
      sender_player_id: null,
      sender_kind: 'ai',
      sender_name: 'VÉRTICE',
      message_type: 'ai',
      body: followUpMessageForEvent(event, targetPlayer),
      created_at: createdAt,
      metadata: {
        follow_up_for_event_id: event.id,
        target: event.target,
        target_player_id: targetPlayer?.id || null,
      },
    })
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const roomId = typeof req.body?.room_id === 'string' ? req.body.room_id : ''
    const playerId = typeof req.body?.player_id === 'string' ? req.body.player_id : ''
    if (!roomId || !playerId) return res.status(400).json({ error: 'Missing required fields' })

    const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (!room || room.status !== 'playing' || !room.started_at) {
      return res.status(409).json({ error: 'Room is not playing' })
    }

    const { data: player } = await supabase.from('players').select('id').eq('id', playerId).eq('room_id', roomId).single()
    if (!player) return res.status(403).json({ error: 'Player does not belong to this room' })

    const startedAtMs = new Date(room.started_at).getTime()
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
    const { data: events } = await supabase
      .from('game_events')
      .select('*')
      .eq('room_id', roomId)
      .eq('delivered', false)
      .order('trigger_minute', { ascending: true })
      .order('trigger_second', { ascending: true })

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId)
    if (!players) return res.status(200).json({ delivered: 0 })

    const dueEvents = (events || []).filter((event) => ((event.trigger_minute || 0) * 60 + (event.trigger_second || 0)) <= elapsedSeconds)
    let delivered = 0

    for (const event of dueEvents) {
      const { data: updatedEvent } = await supabase
        .from('game_events')
        .update({ delivered: true, delivered_at: new Date().toISOString() })
        .eq('id', event.id)
        .eq('delivered', false)
        .select()
        .single()

      if (!updatedEvent) continue
      const eventSecond = ((event.trigger_minute || 0) * 60) + (event.trigger_second || 0)
      const createdAt = new Date(startedAtMs + eventSecond * 1000).toISOString()

      const groupMessage = groupMessageForEvent(updatedEvent)
      if (groupMessage) {
        await supabase.from('room_messages').insert({
          room_id: roomId,
          event_id: updatedEvent.id,
          recipient_player_id: null,
          sender_player_id: null,
          sender_kind: groupMessage.sender_kind,
          sender_name: groupMessage.sender_name,
          message_type: groupMessage.message_type,
          body: groupMessage.body,
          created_at: createdAt,
          metadata: updatedEvent.content || {},
        })
      }

      const targetPlayers = getTargetPlayers(event.target, players)
      if (targetPlayers.length > 0) {
        await supabase.from('clues').insert(targetPlayers.map((targetPlayer) => ({
          room_id: roomId,
          player_id: targetPlayer.id,
          event_id: event.id,
          clue_type: event.event_type,
          title: event.content?.title || 'Mensagem',
          content: event.content,
          file_url: event.content?.file_url || null,
          expires_at: event.expires_seconds ? new Date(startedAtMs + (eventSecond + event.expires_seconds) * 1000).toISOString() : null,
          expired: false,
          created_at: createdAt,
        })))
      }
      delivered += 1
    }

    await insertContextualFollowUps(supabase, roomId, room.archive_id, elapsedSeconds, startedAtMs, players)

    return res.status(200).json({ delivered })
  } catch (error) {
    console.error('tick-room endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
