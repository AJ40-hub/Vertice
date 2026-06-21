import { getSupabaseAdmin, normalizeStoragePath } from './_lib/_supabaseAdmin.js'

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.VITE_SUPABASE_STORAGE_BUCKET || 'vertice-assets'

const roleTargets: Record<string, string> = {
  detetive: 'A',
  amigo: 'B',
  jornalista: 'C',
  hacker: 'D',
  inimigo: 'E',
  testemunha: 'F',
  familiar: 'G',
  fa: 'H',
}

function publicPlayer(player: any, viewerPlayerId: string) {
  const isViewer = player.id === viewerPlayerId
  const roleTarget = player.role ? roleTargets[player.role] || null : null
  const publicName = roleTarget ? `${player.name} (${roleTarget})` : player.name

  return {
    id: player.id,
    room_id: player.room_id,
    name: player.name,
    public_name: publicName,
    gender: player.gender,
    whatsapp: isViewer ? player.whatsapp : '',
    role: isViewer ? player.role : null,
    role_label: isViewer ? player.role_label : null,
    role_target: roleTarget,
    is_host: player.is_host,
    score: player.score,
    score_details: player.score_details || {},
    postgame_eligible: player.postgame_eligible,
    joined_at: player.joined_at,
  }
}

function clueUrlTtl(clue: any) {
  if (!clue.expires_at) return 600
  const secondsLeft = Math.ceil((new Date(clue.expires_at).getTime() - Date.now()) / 1000)
  return Math.min(3600, Math.max(60, secondsLeft))
}

async function signClueFiles(supabase: ReturnType<typeof getSupabaseAdmin>, clues: any[]) {
  return Promise.all((clues || []).map(async (clue) => {
    const path = normalizeStoragePath(clue.file_url)
    if (!path) return clue

    const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, clueUrlTtl(clue))
    if (!data?.signedUrl) return { ...clue, file_url: null }

    return {
      ...clue,
      file_url: data.signedUrl,
      content: {
        ...(clue.content || {}),
        signed_url: data.signedUrl,
      },
    }
  }))
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const roomId = typeof req.body?.room_id === 'string' ? req.body.room_id : ''
    const playerId = typeof req.body?.player_id === 'string' ? req.body.player_id : ''
    if (!roomId || !playerId) return res.status(400).json({ error: 'Missing room_id or player_id' })

    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .eq('room_id', roomId)
      .single()

    if (!player) return res.status(403).json({ error: 'Player does not belong to this room' })

    const [
      { data: room },
      { data: players },
      { data: clues },
      { data: groupMessages },
      { data: sentPrivateMessages },
      { data: receivedPrivateMessages },
      { data: currentVote },
    ] = await Promise.all([
      supabase.from('rooms').select('*, archives(title, subtitle, duration_minutes)').eq('id', roomId).single(),
      supabase.from('players').select('*').eq('room_id', roomId).order('joined_at'),
      supabase.from('clues').select('*').eq('room_id', roomId).eq('player_id', playerId).order('created_at', { ascending: false }),
      supabase.from('room_messages').select('*').eq('room_id', roomId).is('recipient_player_id', null).order('created_at', { ascending: true }),
      supabase.from('room_messages').select('*').eq('room_id', roomId).eq('sender_player_id', playerId).not('recipient_player_id', 'is', null).order('created_at', { ascending: true }),
      supabase.from('room_messages').select('*').eq('room_id', roomId).eq('recipient_player_id', playerId).order('created_at', { ascending: true }),
      supabase.from('room_votes').select('*').eq('room_id', roomId).eq('voter_player_id', playerId).maybeSingle(),
    ])

    if (!room) return res.status(404).json({ error: 'Room not found' })

    const signedClues = await signClueFiles(supabase, clues || [])
    const messagesById = new Map<string, any>()
    ;[...(groupMessages || []), ...(sentPrivateMessages || []), ...(receivedPrivateMessages || [])].forEach((message) => {
      messagesById.set(message.id, message)
    })
    const messages = [...messagesById.values()].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    return res.status(200).json({
      room,
      player,
      players: (players || []).map((roomPlayer) => publicPlayer(roomPlayer, playerId)),
      clues: signedClues,
      messages,
      currentVote: currentVote || null,
    })
  } catch (error) {
    console.error('player-state endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
