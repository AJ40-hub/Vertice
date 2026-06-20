import { randomInt } from 'node:crypto'
import { getSupabaseAdmin, isValidGender, isValidWhatsApp, normalizeText, normalizeWhatsApp } from './_lib/_supabaseAdmin.js'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => chars[randomInt(chars.length)]).join('')
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const {
      archive_id,
      num_players,
      payment_mode,
      name,
      gender,
      whatsapp
    } = req.body || {}

    const hostName = normalizeText(name, 80)
    const hostWhatsapp = normalizeWhatsApp(whatsapp)
    const playerCount = Number(num_players)

    if (!archive_id || !Number.isInteger(playerCount) || !payment_mode || !hostName || !isValidGender(gender) || !isValidWhatsApp(hostWhatsapp)) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    let code = generateRoomCode()
    let exists = true
    let attempts = 0
    while (exists) {
      if (attempts > 20) {
        return res.status(503).json({ error: 'Could not allocate a room code' })
      }
      const { data: existingRoom } = await supabase.from('rooms').select('id').eq('code', code).maybeSingle()
      if (!existingRoom) {
        exists = false
      } else {
        code = generateRoomCode()
        attempts += 1
      }
    }

    const { data: archive, error: archiveErr } = await supabase
      .from('archives')
      .select('id, title, subtitle, min_players, max_players, price_per_player, payment_mode, is_active')
      .eq('id', archive_id)
      .single()
    if (archiveErr || !archive) {
      return res.status(404).json({ error: archiveErr?.message || 'Archive not found' })
    }
    if (!archive.is_active) {
      return res.status(403).json({ error: 'Archive is not available' })
    }
    if (playerCount < archive.min_players || playerCount > archive.max_players) {
      return res.status(400).json({ error: `Player count must be between ${archive.min_players} and ${archive.max_players}` })
    }
    if (payment_mode !== archive.payment_mode) {
      return res.status(400).json({ error: 'Payment mode is not available for this archive' })
    }

    const totalAmount = archive.price_per_player * playerCount

    const { data: room, error: roomErr } = await supabase.from('rooms').insert({
      code,
      archive_id,
      num_players: playerCount,
      payment_mode,
      total_amount: totalAmount,
      payment_status: 'paid',
      status: 'waiting'
    }).select().single()

    if (roomErr || !room) {
      return res.status(500).json({ error: roomErr?.message || 'Failed to create room' })
    }

    const { data: player, error: playerErr } = await supabase.from('players').insert({
      room_id: room.id,
      name: hostName,
      gender,
      whatsapp: hostWhatsapp,
      is_host: true
    }).select().single()

    if (playerErr || !player) {
      return res.status(500).json({ error: playerErr?.message || 'Failed to create player' })
    }

    const { error: paymentErr } = await supabase.from('payments').insert({
      room_id: room.id,
      payer_name: hostName,
      payer_whatsapp: hostWhatsapp,
      archive_title: `${archive.title}: ${archive.subtitle}`,
      num_players: playerCount,
      amount: totalAmount,
      payment_mode,
      status: 'confirmed',
      reference: `VRT-${code}`
    })

    if (paymentErr) {
      return res.status(500).json({ error: paymentErr.message })
    }

    const { error: roomUpdateErr } = await supabase.from('rooms').update({ host_player_id: player.id }).eq('id', room.id)
    if (roomUpdateErr) {
      return res.status(500).json({ error: roomUpdateErr.message })
    }

    await supabase.from('notifications').insert({
      type: 'room_created',
      title: 'Nova sala criada',
      message: `Sala ${code} criada por ${hostName} (${playerCount} jogadores)`,
      data: { room_id: room.id, room_code: code, host_name: hostName, host_whatsapp: hostWhatsapp, num_players: playerCount, total_amount: totalAmount },
    })

    return res.status(200).json({ room, player })
  } catch (error) {
    console.error('create-room endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
