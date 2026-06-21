import { getSupabaseAdmin } from './_lib/_supabaseAdmin.js'

function sanitizeReason(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 240) : ''
}

function scoreDetails(player: any) {
  return player.score_details && typeof player.score_details === 'object' ? player.score_details : {}
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const roomId = typeof req.body?.room_id === 'string' ? req.body.room_id : ''
    const voterPlayerId = typeof req.body?.player_id === 'string' ? req.body.player_id : ''
    const suspectPlayerId = typeof req.body?.suspect_player_id === 'string' ? req.body.suspect_player_id : ''
    const reason = sanitizeReason(req.body?.reason)

    if (!roomId || !voterPlayerId || !suspectPlayerId) {
      return res.status(400).json({ error: 'Voto inválido.' })
    }
    if (voterPlayerId === suspectPlayerId) {
      return res.status(400).json({ error: 'Não podes votar em ti.' })
    }

    const [{ data: room }, { data: voter }, { data: suspect }] = await Promise.all([
      supabase.from('rooms').select('id, status').eq('id', roomId).single(),
      supabase.from('players').select('*').eq('id', voterPlayerId).eq('room_id', roomId).single(),
      supabase.from('players').select('id, name, role').eq('id', suspectPlayerId).eq('room_id', roomId).single(),
    ])

    if (!room || room.status !== 'playing') return res.status(409).json({ error: 'A sala não está em jogo.' })
    if (!voter || !suspect) return res.status(403).json({ error: 'Jogador inválido.' })

    const { data: vote, error } = await supabase.from('room_votes').upsert({
      room_id: roomId,
      voter_player_id: voterPlayerId,
      suspect_player_id: suspectPlayerId,
      reason: reason || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'room_id,voter_player_id' }).select().single()

    if (error || !vote) return res.status(500).json({ error: error?.message || 'Erro ao registar veto.' })

    const details = scoreDetails(voter)
    await supabase.from('players').update({
      score_details: {
        ...details,
        veto_cast: 1,
        veto_target_id: suspect.id,
        veto_target_name: suspect.name,
        veto_target_role: suspect.role,
      },
    }).eq('id', voterPlayerId)

    return res.status(200).json({ vote })
  } catch (error) {
    console.error('player-vote endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
