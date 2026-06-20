import { getSupabaseAdmin } from '../server/_supabaseAdmin'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const action = req.body?.action
    const roomId = typeof req.body?.room_id === 'string' ? req.body.room_id : ''
    const playerId = typeof req.body?.player_id === 'string' ? req.body.player_id : ''

    if (!action || !roomId || !playerId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .eq('room_id', roomId)
      .single()

    if (!player) return res.status(403).json({ error: 'Player does not belong to this room' })

    if (action === 'betrayal') {
      const choice = req.body?.choice
      if (choice !== 'reveal' && choice !== 'keep') {
        return res.status(400).json({ error: 'Invalid betrayal choice' })
      }
      const { error } = await supabase
        .from('players')
        .update({ betrayal_choice: choice, betrayal_at: new Date().toISOString() })
        .eq('id', playerId)
        .eq('room_id', roomId)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    if (action === 'open_clue') {
      const clueId = typeof req.body?.clue_id === 'string' ? req.body.clue_id : ''
      if (!clueId) return res.status(400).json({ error: 'Missing clue_id' })

      const { data: clue } = await supabase
        .from('clues')
        .select('*')
        .eq('id', clueId)
        .eq('player_id', playerId)
        .eq('room_id', roomId)
        .single()

      if (!clue) return res.status(404).json({ error: 'Clue not found' })

      if (!clue.opened_at) {
        await supabase.from('clues').update({ opened_at: new Date().toISOString() }).eq('id', clueId)
        const currentDetails = player.score_details && typeof player.score_details === 'object' ? player.score_details : {}
        await supabase.from('players').update({
          score_details: {
            ...currentDetails,
            clues_opened: ((currentDetails as Record<string, number>).clues_opened || 0) + 1,
          },
        }).eq('id', playerId)
      }

      return res.status(200).json({ ok: true })
    }

    if (action === 'expire_clue') {
      const clueId = typeof req.body?.clue_id === 'string' ? req.body.clue_id : ''
      if (!clueId) return res.status(400).json({ error: 'Missing clue_id' })
      const { error } = await supabase
        .from('clues')
        .update({ expired: true })
        .eq('id', clueId)
        .eq('player_id', playerId)
        .eq('room_id', roomId)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unsupported action' })
  } catch (error) {
    console.error('player-action endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
