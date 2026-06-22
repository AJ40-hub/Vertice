import { requireAdmin, verifyAdminSession } from './_lib/_adminAuth.js'
import { getSupabaseAdmin } from './_lib/_supabaseAdmin.js'
import { calculateScoreDetails } from '../gameEngine.js'

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
    score_details: player.score_details,
    postgame_eligible: player.postgame_eligible,
    joined_at: player.joined_at,
  }
}

function safeScoreDetails(player: any) {
  return player.score_details && typeof player.score_details === 'object' ? player.score_details : {}
}

function isScoredClue(clue: any) {
  if (clue.content?.isPostgame) return false
  return ['clue', 'photo', 'document', 'audio'].includes(clue.clue_type)
}

function clueStatsForPlayer(clues: any[], playerId: string) {
  const playerClues = clues.filter((clue) => clue.player_id === playerId && isScoredClue(clue))
  const openedClues = playerClues.filter((clue) => clue.opened_at)
  const openedWithinDeadline = openedClues.filter((clue) => {
    if (!clue.expires_at) return true
    return new Date(clue.opened_at).getTime() <= new Date(clue.expires_at).getTime()
  })
  const delays = openedClues
    .map((clue) => Math.max(0, (new Date(clue.opened_at).getTime() - new Date(clue.created_at).getTime()) / 1000))
    .filter((delay) => Number.isFinite(delay))
  const averageDelay = delays.length
    ? Math.round(delays.reduce((total, delay) => total + delay, 0) / delays.length)
    : null

  return {
    totalClues: playerClues.length,
    cluesOpened: openedClues.length,
    cluesOpenedWithinDeadline: openedWithinDeadline.length,
    averageClueOpenDelaySeconds: averageDelay,
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
    const reportOnly = req.body?.report_only === true
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
    const minimumRankingSeconds = Math.min(requiredDuration, 10 * 60)

    if (reportOnly && room.status !== 'finished') {
      return res.status(409).json({ error: 'O jogo ainda não terminou.' })
    }

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

    const shouldGenerateRanking = Boolean(finishedRoom.started_at) && finalElapsedSeconds >= minimumRankingSeconds
    await ensureFinishNotification(supabase, finishedRoom, archive, !shouldGenerateRanking)

    if (!shouldGenerateRanking) {
      return res.status(200).json({
        room: finishedRoom,
        ranking: null,
        players: players.map(publicPlayer),
        ranking_generated: false,
      })
    }

    const [{ data: roomMessages }, { data: roomVotes }, { data: roomClues }] = await Promise.all([
      supabase.from('room_messages').select('*').eq('room_id', roomId),
      supabase.from('room_votes').select('*').eq('room_id', roomId),
      supabase.from('clues').select('*').eq('room_id', roomId),
    ])

    const playerById = new Map(players.map((roomPlayer: any) => [roomPlayer.id, roomPlayer]))
    const messageStats = new Map<string, { messagesSent: number; groupMessagesSent: number; privateMessagesSent: number }>()
    const votesReceivedByPlayer = new Map<string, number>()
    const voteByVoter = new Map<string, any>()

    ;(roomMessages || []).forEach((message: any) => {
      if (!message.sender_player_id) return
      const current = messageStats.get(message.sender_player_id) || {
        messagesSent: 0,
        groupMessagesSent: 0,
        privateMessagesSent: 0,
      }
      current.messagesSent += 1
      if (message.recipient_player_id) current.privateMessagesSent += 1
      else current.groupMessagesSent += 1
      messageStats.set(message.sender_player_id, current)
    })

    ;(roomVotes || []).forEach((vote: any) => {
      voteByVoter.set(vote.voter_player_id, vote)
      votesReceivedByPlayer.set(vote.suspect_player_id, (votesReceivedByPlayer.get(vote.suspect_player_id) || 0) + 1)
    })

    const mostSuspectedEntry = [...votesReceivedByPlayer.entries()]
      .sort((a, b) => b[1] - a[1])
      .at(0)
    const mostSuspectedPlayer = mostSuspectedEntry ? playerById.get(mostSuspectedEntry[0]) : null
    const mostSuspected = mostSuspectedPlayer ? {
      id: mostSuspectedPlayer.id,
      name: mostSuspectedPlayer.name,
      role: mostSuspectedPlayer.role,
      role_label: mostSuspectedPlayer.role_label,
      vote_count: mostSuspectedEntry?.[1] || 0,
    } : null

    const scoredPlayers = await Promise.all(players.map(async (player: any) => {
      const stats = messageStats.get(player.id) || {
        messagesSent: 0,
        groupMessagesSent: 0,
        privateMessagesSent: 0,
      }
      const vote = voteByVoter.get(player.id)
      const votedPlayer = vote ? playerById.get(vote.suspect_player_id) : null
      const votesReceived = votesReceivedByPlayer.get(player.id) || 0
      const clueStats = clueStatsForPlayer(roomClues || [], player.id)
      const details = calculateScoreDetails(player, finalElapsedSeconds, {
        ...stats,
        ...clueStats,
        vetoCast: Boolean(vote),
        vetoTargetRole: votedPlayer?.role || null,
        votesReceived,
      })
      const scoreDetails = {
        ...safeScoreDetails(player),
        ...details,
        total_clues: clueStats.totalClues,
        clues_opened: clueStats.cluesOpened,
        clues_opened_within_deadline: clueStats.cluesOpenedWithinDeadline,
        average_clue_open_delay_seconds: clueStats.averageClueOpenDelaySeconds,
        votes_received: votesReceived,
        veto_target_name: votedPlayer?.name || null,
        veto_target_id: votedPlayer?.id || null,
      }
      const { data: updatedPlayer } = await supabase
        .from('players')
        .update({ score: details.score, score_details: scoreDetails })
        .eq('id', player.id)
        .select()
        .single()
      return updatedPlayer || { ...player, score: details.score, score_details: scoreDetails }
    }))

    const sortedPlayers = scoredPlayers.sort((a, b) => (
      (b.score || 0) - (a.score || 0) ||
      Number(b.score_details?.investigationScore || 0) - Number(a.score_details?.investigationScore || 0) ||
      Number(b.score_details?.participationScore || 0) - Number(a.score_details?.participationScore || 0) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'pt')
    ))
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
        score_details: player.score_details,
        votes_received: votesReceivedByPlayer.get(player.id) || 0,
        veto_target_name: player.score_details?.veto_target_name || null,
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

    return res.status(200).json({ room: finishedRoom, ranking, players: sortedPlayers.map(publicPlayer), most_suspected: mostSuspected })
  } catch (error) {
    console.error('finish-room endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
