import { requireAdmin, verifyAdminSession } from './_lib/_adminAuth.js'
import { getSupabaseAdmin } from './_lib/_supabaseAdmin.js'
import { calculateScore } from '../gameEngine.js'

function elapsedSecondsForRoom(room: any) {
  if (!room.started_at) return 0
  const end = room.finished_at ? new Date(room.finished_at).getTime() : Date.now()
  return Math.max(0, Math.floor((end - new Date(room.started_at).getTime()) / 1000))
}

function publicPlayer(player: any) {
  return {
    id: player.id,
    room_id: player.room_id,
    name: player.name,
    gender: player.gender,
    role: player.role,
    role_label: player.role_label,
    is_host: player.is_host,
    score: player.score,
    postgame_eligible: player.postgame_eligible,
    joined_at: player.joined_at,
  }
}

async function ensureFinishNotification(supabase: any, room: any, archive: { title?: string; subtitle?: string } | null, manualBeforeStart: boolean) {
  const { data: existingFinishNotification } = await supabase
    .from('notifications')
    .select('id')
    .eq('type', 'game_finished')
    .eq('data->>room_id', room.id)
    .maybeSingle()

  if (existingFinishNotification) return

  await supabase.from('notifications').insert({
    type: 'game_finished',
    title: manualBeforeStart ? 'Sala encerrada manualmente' : 'Jogo terminado',
    message: manualBeforeStart
      ? `Sala ${room.code} foi encerrada antes do início do jogo.`
      : `Sala ${room.code} — ${archive?.title || 'Arquivo'}: ${archive?.subtitle || ''} terminou.`,
    data: {
      room_id: room.id,
      room_code: room.code,
      status_before_finish: room.status,
      ranking_generated: !manualBeforeStart,
    },
  })
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const roomId = typeof req.body?.room_id === 'string' ? req.body.room_id : ''
    const playerId = typeof req.body?.player_id === 'string' ? req.body.player_id : ''
    if (!roomId) return res.status(400).json({ error: 'Missing room_id' })

    const isAdmin = verifyAdminSession(req)
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('*, archives(title, subtitle, duration_minutes)')
      .eq('id', roomId)
      .single()

    if (roomErr || !room) return res.status(404).json({ error: 'Room not found' })

    let isHostPlayer = false
    if (!isAdmin) {
      if (!playerId) return res.status(401).json({ error: 'Missing player_id' })
      const { data: player } = await supabase.from('players').select('id, is_host').eq('id', playerId).eq('room_id', roomId).single()
      if (!player) return res.status(403).json({ error: 'Player does not belong to this room' })
      isHostPlayer = Boolean(player.is_host)
    }

    const archive = room.archives as { title?: string; subtitle?: string; duration_minutes?: number } | null
    const requiredDuration = Math.max(1, archive?.duration_minutes || 90) * 60
    const elapsedSeconds = elapsedSecondsForRoom(room)
    const canFinish = isAdmin || isHostPlayer || room.status === 'finished' || elapsedSeconds >= requiredDuration

    if (!canFinish) {
      return requireAdmin(req, res)
    }

    let finishedRoom = room
    if (room.status !== 'finished') {
      const { data: updatedRoom, error: updateErr } = await supabase
        .from('rooms')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('id', roomId)
        .select('*, archives(title, subtitle, duration_minutes)')
        .single()
      if (updateErr || !updatedRoom) return res.status(500).json({ error: updateErr?.message || 'Failed to finish room' })
      finishedRoom = updatedRoom
    }

    const finalElapsedSeconds = elapsedSecondsForRoom(finishedRoom)
    const { data: players } = await supabase.from('players').select('*').eq('room_id', roomId)
    if (!players || players.length === 0) return res.status(404).json({ error: 'No players found' })

    const shouldGenerateRanking = room.status === 'playing' || (room.status === 'finished' && Boolean(room.started_at))
    await ensureFinishNotification(supabase, finishedRoom, archive, !shouldGenerateRanking)

    if (!shouldGenerateRanking) {
      return res.status(200).json({
        room: finishedRoom,
        ranking: null,
        players: players.map(publicPlayer),
        ranking_generated: false,
      })
    }

    const scoredPlayers = await Promise.all(players.map(async (player) => {
      const score = calculateScore(player, finalElapsedSeconds)
      const { data: updatedPlayer } = await supabase
        .from('players')
        .update({ score })
        .eq('id', player.id)
        .select()
        .single()
      return updatedPlayer || { ...player, score }
    }))

    const sortedPlayers = scoredPlayers.sort((a, b) => (b.score || 0) - (a.score || 0))
    const winner = sortedPlayers[0]

    const { data: existingRanking } = await supabase.from('rankings').select('*').eq('room_id', roomId).maybeSingle()
    let ranking = existingRanking

    if (!ranking) {
      const rankingData = sortedPlayers.map((player, index) => ({
        id: player.id,
        name: player.name,
        role: player.role_label,
        score: player.score,
        rank: index + 1,
      }))

      const { data: newRanking, error: rankingErr } = await supabase.from('rankings').insert({
        room_id: roomId,
        archive_title: `${archive?.title || 'Arquivo'}: ${archive?.subtitle || ''}`.trim(),
        players: rankingData,
        winner_id: winner.id,
      }).select().single()

      if (rankingErr) return res.status(500).json({ error: rankingErr.message })
      ranking = newRanking
    }

    const { data: existingPrize } = await supabase.from('prizes').select('id').eq('room_id', roomId).maybeSingle()
    if (!existingPrize) {
      await supabase.from('prizes').insert({
        room_id: roomId,
        winner_player_id: winner.id,
        winner_name: winner.name,
        winner_gender: winner.gender,
        winner_whatsapp: winner.whatsapp,
        winner_score: winner.score,
        amount: 1000,
        status: 'pending',
      })
    }

    const { data: existingWinnerNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'winner_identified')
      .eq('data->>room_id', roomId)
      .maybeSingle()

    if (!existingWinnerNotification) {
      await supabase.from('notifications').insert([
        {
          type: 'ranking_ready',
          title: 'Ranking disponível',
          message: `Sala ${finishedRoom.code} terminou. Vencedor: ${winner.name} (${winner.whatsapp})`,
          data: {
            room_id: roomId,
            room_code: finishedRoom.code,
            winner_name: winner.name,
            winner_whatsapp: winner.whatsapp,
            winner_gender: winner.gender,
            winner_score: winner.score,
          },
        },
        {
          type: 'winner_identified',
          title: 'Melhor jogador identificado',
          message: `${winner.name} — ${winner.whatsapp} — Score: ${winner.score}`,
          data: {
            room_id: roomId,
            room_code: finishedRoom.code,
            winner_name: winner.name,
            winner_whatsapp: winner.whatsapp,
            winner_gender: winner.gender,
            winner_score: winner.score,
          },
        },
      ])
    }

    return res.status(200).json({ room: finishedRoom, ranking, players: sortedPlayers.map(publicPlayer) })
  } catch (error) {
    console.error('finish-room endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
