import { getSupabaseAdmin } from './_lib/_supabaseAdmin'

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

function getTargetPlayers(target: string, players: any[]) {
  const postgameRoles = ['detetive', 'amigo', 'jornalista', 'testemunha']
  if (target === 'all') return players
  if (target === 'postgame') return players.filter((p) => postgameRoles.includes(p.role || ''))
  return players.filter((p) => p.role === roleMap[target])
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

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(room.started_at).getTime()) / 1000))
    const { data: events } = await supabase
      .from('game_events')
      .select('*')
      .eq('room_id', roomId)
      .eq('delivered', false)
      .order('trigger_minute', { ascending: true })
      .order('trigger_second', { ascending: true })

    const dueEvents = (events || []).filter((event) => ((event.trigger_minute || 0) * 60 + (event.trigger_second || 0)) <= elapsedSeconds)
    if (dueEvents.length === 0) return res.status(200).json({ delivered: 0 })

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId)
    if (!players) return res.status(200).json({ delivered: 0 })

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
          expires_at: event.expires_seconds ? new Date(Date.now() + event.expires_seconds * 1000).toISOString() : null,
          expired: false,
        })))
      }
      delivered += 1
    }

    return res.status(200).json({ delivered })
  } catch (error) {
    console.error('tick-room endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
