import { getSupabaseAdmin } from './_lib/_supabaseAdmin.js'

function sanitizeBody(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 700) : ''
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
    const playerId = typeof req.body?.player_id === 'string' ? req.body.player_id : ''
    const recipientPlayerId = typeof req.body?.recipient_player_id === 'string' && req.body.recipient_player_id ? req.body.recipient_player_id : null
    const body = sanitizeBody(req.body?.body)

    if (!roomId || !playerId || !body) {
      return res.status(400).json({ error: 'Mensagem inválida.' })
    }

    const { data: room } = await supabase.from('rooms').select('id, status').eq('id', roomId).single()
    if (!room || room.status !== 'playing') return res.status(409).json({ error: 'A sala não está em jogo.' })

    const { data: player } = await supabase.from('players').select('*').eq('id', playerId).eq('room_id', roomId).single()
    if (!player) return res.status(403).json({ error: 'Jogador inválido.' })

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
  } catch (error) {
    console.error('player-message endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
