import { getSupabaseAdmin } from './_lib/_supabaseAdmin.js'

function sanitizeMessage(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 700) : ''
}

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

    if (action === 'send_message' || action === 'vote_suspect') {
      const { data: room } = await supabase.from('rooms').select('id, status').eq('id', roomId).single()
      if (!room || room.status !== 'playing') return res.status(409).json({ error: 'A sala não está em jogo.' })
    }

    if (action === 'send_message') {
      const body = sanitizeMessage(req.body?.body)
      const recipientPlayerId = typeof req.body?.recipient_player_id === 'string' && req.body.recipient_player_id ? req.body.recipient_player_id : null

      if (!body) return res.status(400).json({ error: 'Mensagem inválida.' })
      if (recipientPlayerId) {
        if (recipientPlayerId === playerId) return res.status(400).json({ error: 'Não podes enviar mensagem para ti.' })
        const { data: recipient } = await supabase.from('players').select('id').eq('id', recipientPlayerId).eq('room_id', roomId).single()
        if (!recipient) return res.status(404).json({ error: 'Destinatário inválido.' })
      }

      const { data: message, error } = await supabase.from('room_messages').insert({
        room_id: roomId,
        sender_player_id: playerId,
        recipient_player_id: recipientPlayerId,
        sender_kind: 'player',
        sender_name: player.name,
        message_type: 'text',
        body,
        metadata: {
          role: player.role,
          role_label: player.role_label,
        },
      }).select().single()

      if (error || !message) return res.status(500).json({ error: error?.message || 'Erro ao enviar mensagem.' })

      const details = scoreDetails(player) as Record<string, number>
      await supabase.from('players').update({
        score_details: {
          ...details,
          messages_sent: (details.messages_sent || 0) + 1,
          group_messages_sent: (details.group_messages_sent || 0) + (recipientPlayerId ? 0 : 1),
          private_messages_sent: (details.private_messages_sent || 0) + (recipientPlayerId ? 1 : 0),
        },
      }).eq('id', playerId)

      return res.status(200).json({ message })
    }

    if (action === 'vote_suspect') {
      const suspectPlayerId = typeof req.body?.suspect_player_id === 'string' ? req.body.suspect_player_id : ''
      const reason = sanitizeReason(req.body?.reason)

      if (!suspectPlayerId) return res.status(400).json({ error: 'Voto inválido.' })
      if (suspectPlayerId === playerId) return res.status(400).json({ error: 'Não podes votar em ti.' })

      const { data: suspect } = await supabase
        .from('players')
        .select('id, name, role')
        .eq('id', suspectPlayerId)
        .eq('room_id', roomId)
        .single()

      if (!suspect) return res.status(403).json({ error: 'Jogador inválido.' })

      const { data: vote, error } = await supabase.from('room_votes').upsert({
        room_id: roomId,
        voter_player_id: playerId,
        suspect_player_id: suspectPlayerId,
        reason: reason || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'room_id,voter_player_id' }).select().single()

      if (error || !vote) return res.status(500).json({ error: error?.message || 'Erro ao registar veto.' })

      const details = scoreDetails(player)
      await supabase.from('players').update({
        score_details: {
          ...details,
          veto_cast: 1,
          veto_target_id: suspect.id,
          veto_target_name: suspect.name,
          veto_target_role: suspect.role,
        },
      }).eq('id', playerId)

      return res.status(200).json({ vote })
    }

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
