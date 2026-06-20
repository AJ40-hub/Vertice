import { getSupabaseAdmin, normalizeRoomCode } from './_lib/_supabaseAdmin.js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const code = normalizeRoomCode(req.body?.code)
    if (code.length !== 4) {
      return res.status(400).json({ type: 'invalid_code', error: 'Código inválido.' })
    }

    const { data: room, error } = await supabase
      .from('rooms')
      .select('*, archives(id, title, subtitle, duration_minutes, min_players, max_players, price_per_player)')
      .eq('code', code)
      .maybeSingle()

    if (error || !room) {
      return res.status(404).json({
        type: 'room_not_found',
        code,
        error: 'A sala que tentas aceder não existe.',
      })
    }
    if (room.status === 'finished') {
      return res.status(409).json({
        type: 'room_closed',
        code: room.code,
        error: `Sala ${room.code} encerrada.`,
      })
    }

    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)

    if ((count || 0) >= room.num_players) {
      return res.status(409).json({ type: 'room_full', code: room.code, error: 'Esta sala está cheia.' })
    }

    return res.status(200).json({ room })
  } catch (error) {
    console.error('lookup-room endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
