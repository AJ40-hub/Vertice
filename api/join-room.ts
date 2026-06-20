import { getSupabaseAdmin, isValidGender, isValidWhatsApp, normalizeRoomCode, normalizeText, normalizeWhatsApp } from '../server/_supabaseAdmin'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const code = normalizeRoomCode(req.body?.code)
    const name = normalizeText(req.body?.name, 80)
    const whatsapp = normalizeWhatsApp(req.body?.whatsapp)
    const gender = req.body?.gender

    if (code.length !== 4 || !name || !isValidGender(gender) || !isValidWhatsApp(whatsapp)) {
      return res.status(400).json({ error: 'Dados inválidos.' })
    }

    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('*, archives(id, title, subtitle, duration_minutes, min_players, max_players, price_per_player)')
      .eq('code', code)
      .single()

    if (roomErr || !room) {
      return res.status(404).json({ error: 'Código inválido.' })
    }
    if (room.status === 'finished' || room.status === 'playing') {
      return res.status(409).json({ error: 'Esta sala já não aceita novos jogadores.' })
    }
    if (room.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Pagamento ainda não confirmado.' })
    }

    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)

    if ((count || 0) >= room.num_players) {
      return res.status(409).json({ error: 'Esta sala está cheia.' })
    }

    const { data: duplicate } = await supabase
      .from('players')
      .select('id')
      .eq('room_id', room.id)
      .eq('whatsapp', whatsapp)
      .maybeSingle()

    if (duplicate) {
      return res.status(409).json({ error: 'Este WhatsApp já entrou nesta sala.' })
    }

    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ room_id: room.id, name, gender, whatsapp, is_host: false })
      .select()
      .single()

    if (playerErr || !player) {
      return res.status(500).json({ error: playerErr?.message || 'Erro ao entrar.' })
    }

    const { count: countAfter } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)

    if ((countAfter || 0) > room.num_players) {
      await supabase.from('players').delete().eq('id', player.id)
      return res.status(409).json({ error: 'Esta sala ficou cheia antes da tua entrada.' })
    }

    return res.status(200).json({ room, player })
  } catch (error) {
    console.error('join-room endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
