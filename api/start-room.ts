import { getSupabaseAdmin } from './_lib/_supabaseAdmin'
import { ARQUIVO01_EVENTS, ROLES } from '../gameEngine'

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

function buildRoles(numPlayers: number) {
  return shuffle(ROLES.slice(0, Math.min(Math.max(numPlayers, 5), 8)))
}

function replaceHackerName(value: unknown, hackerName: string): unknown {
  if (typeof value === 'string') return value.replaceAll('[HACKER_NAME]', hackerName)
  if (Array.isArray(value)) return value.map((item) => replaceHackerName(item, hackerName))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceHackerName(item, hackerName)]))
  }
  return value
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

    const { data: room, error: roomErr } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (roomErr || !room) return res.status(404).json({ error: 'Room not found' })
    if (room.status === 'playing') return res.status(200).json({ room })
    if (room.status === 'starting') return res.status(202).json({ room })
    if (room.status !== 'waiting') {
      return res.status(409).json({ error: 'Room cannot be started' })
    }

    const { data: claimedRoom } = await supabase
      .from('rooms')
      .update({ status: 'starting' })
      .eq('id', roomId)
      .eq('status', 'waiting')
      .select()
      .single()

    if (!claimedRoom) return res.status(202).json({ room })

    const { data: player } = await supabase.from('players').select('id').eq('id', playerId).eq('room_id', roomId).single()
    if (!player) return res.status(403).json({ error: 'Player does not belong to this room' })

    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId).order('joined_at')
    if (!players || players.length < claimedRoom.num_players) {
      await supabase.from('rooms').update({ status: 'waiting' }).eq('id', roomId).eq('status', 'starting')
      return res.status(409).json({ error: 'Room is not full yet' })
    }

    const hasRoles = players.every((p) => p.role)
    let assignedPlayers = players
    if (!hasRoles) {
      const roles = buildRoles(claimedRoom.num_players)
      for (let i = 0; i < players.length; i++) {
        const role = roles[i]
        const { data: updated } = await supabase
          .from('players')
          .update({ role: role.key, role_label: role.label, postgame_eligible: role.postgame })
          .eq('id', players[i].id)
          .select()
          .single()
        if (updated) assignedPlayers = assignedPlayers.map((p) => p.id === updated.id ? updated : p)
      }
    }

    const hacker = assignedPlayers.find((p) => p.role === 'hacker')
    const hackerName = hacker?.name || 'Nome indisponível'

    const { count: existingEvents } = await supabase
      .from('game_events')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)

    if (!existingEvents) {
      await supabase.from('game_events').insert(ARQUIVO01_EVENTS.map((event) => ({
        room_id: roomId,
        archive_id: claimedRoom.archive_id,
        trigger_minute: event.minute,
        trigger_second: event.second,
        event_type: event.type,
        target: event.target,
        content: replaceHackerName(event.content, hackerName),
        expires_seconds: event.expires,
        delivered: false,
      })))
    }

    const { data: updatedRoom, error: updateErr } = await supabase
      .from('rooms')
      .update({ status: 'playing', started_at: new Date().toISOString() })
      .eq('id', roomId)
      .select()
      .single()

    if (updateErr || !updatedRoom) return res.status(500).json({ error: updateErr?.message || 'Failed to start room' })
    return res.status(200).json({ room: updatedRoom })
  } catch (error) {
    console.error('start-room endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
