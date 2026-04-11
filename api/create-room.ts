import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_KEY and SUPABASE_URL must be defined in environment')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      archive_id,
      num_players,
      payment_mode,
      total_amount,
      name,
      gender,
      whatsapp
    } = req.body || {}

    if (!archive_id || !num_players || !payment_mode || !total_amount || !name || !gender || !whatsapp) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    let code = generateRoomCode()
    let exists = true
    while (exists) {
      const { data: existingRoom } = await supabase.from('rooms').select('id').eq('code', code).single()
      if (!existingRoom) {
        exists = false
      } else {
        code = generateRoomCode()
      }
    }

    const { data: archive, error: archiveErr } = await supabase.from('archives').select('title, subtitle').eq('id', archive_id).single()
    if (archiveErr || !archive) {
      return res.status(404).json({ error: archiveErr?.message || 'Archive not found' })
    }

    const { data: room, error: roomErr } = await supabase.from('rooms').insert({
      code,
      archive_id,
      num_players,
      payment_mode,
      total_amount,
      payment_status: 'paid',
      status: 'waiting'
    }).select().single()

    if (roomErr || !room) {
      return res.status(500).json({ error: roomErr?.message || 'Failed to create room' })
    }

    const { data: player, error: playerErr } = await supabase.from('players').insert({
      room_id: room.id,
      name: name.trim(),
      gender,
      whatsapp: whatsapp.trim(),
      is_host: true
    }).select().single()

    if (playerErr || !player) {
      return res.status(500).json({ error: playerErr?.message || 'Failed to create player' })
    }

    const { error: paymentErr } = await supabase.from('payments').insert({
      room_id: room.id,
      payer_name: name.trim(),
      payer_whatsapp: whatsapp.trim(),
      archive_title: `${archive.title}: ${archive.subtitle}`,
      num_players,
      amount: total_amount,
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

    return res.status(200).json({ room, player })
  } catch (error) {
    console.error('create-room endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
