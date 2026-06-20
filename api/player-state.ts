import { getSupabaseAdmin, normalizeStoragePath } from './_lib/_supabaseAdmin'

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.VITE_SUPABASE_STORAGE_BUCKET || 'vertice-assets'

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

    const [{ data: room }, { data: players }, { data: clues }] = await Promise.all([
      supabase.from('rooms').select('*, archives(title, subtitle, duration_minutes)').eq('id', roomId).single(),
      supabase.from('players').select('*').eq('room_id', roomId).order('joined_at'),
      supabase.from('clues').select('*').eq('room_id', roomId).eq('player_id', playerId).order('created_at', { ascending: false }),
    ])

    if (!room) return res.status(404).json({ error: 'Room not found' })

    const signedClues = await signClueFiles(supabase, clues || [])

    return res.status(200).json({
      room,
      player,
      players: (players || []).map(publicPlayer),
      clues: signedClues,
    })
  } catch (error) {
    console.error('player-state endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
