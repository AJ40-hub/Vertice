import { requireAdmin } from '../_lib/_adminAuth.js'
import { getSupabaseAdmin, normalizeText } from '../_lib/_supabaseAdmin.js'

const ALLOWED_PAYMENT_MODES = new Set(['host', 'individual'])

function startOfDayIso(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().slice(0, 10)
}

function daysBack(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() - (count - 1 - index))
    return startOfDayIso(date)
  })
}

function dayLabel(isoDate: string) {
  const [, month, day] = isoDate.split('-').map(Number)
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
}

function sanitizeNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function sanitizeArchive(input: Record<string, unknown>) {
  const paymentMode = typeof input.payment_mode === 'string' && ALLOWED_PAYMENT_MODES.has(input.payment_mode)
    ? input.payment_mode
    : 'host'

  return {
    slug: normalizeText(input.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
    title: normalizeText(input.title, 120),
    subtitle: normalizeText(input.subtitle, 160),
    description: normalizeText(input.description, 1200),
    duration_minutes: sanitizeNumber(input.duration_minutes, 90, 10, 240),
    min_players: sanitizeNumber(input.min_players, 5, 2, 20),
    max_players: sanitizeNumber(input.max_players, 8, 2, 20),
    price_per_player: sanitizeNumber(input.price_per_player, 500, 0, 1000000),
    payment_mode: paymentMode,
    cover_url: typeof input.cover_url === 'string' ? input.cover_url.slice(0, 600) : null,
  }
}

function sanitizeAsset(input: Record<string, unknown>) {
  return {
    archive_id: normalizeText(input.archive_id, 80),
    name: normalizeText(input.name, 160),
    description: normalizeText(input.description, 600) || null,
    file_type: normalizeText(input.file_type, 30),
    file_name: normalizeText(input.file_name, 260),
    file_url: typeof input.file_url === 'string' ? input.file_url.slice(0, 1000) : '',
    file_size: sanitizeNumber(input.file_size, 0, 0, 1024 * 1024 * 1024),
    target_player: normalizeText(input.target_player, 30),
    trigger_minute: input.trigger_minute === null || input.trigger_minute === ''
      ? null
      : sanitizeNumber(input.trigger_minute, 0, 0, 240),
    trigger_second: sanitizeNumber(input.trigger_second, 0, 0, 59),
    expires_seconds: input.expires_seconds === null || input.expires_seconds === ''
      ? null
      : sanitizeNumber(input.expires_seconds, 210, 1, 86400),
    is_postgame: Boolean(input.is_postgame),
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!requireAdmin(req, res)) return

  try {
    const supabase = getSupabaseAdmin()
    const action = typeof req.body?.action === 'string' ? req.body.action : ''

    if (action === 'layout-summary') {
      const [{ count: unread }, { count: prizes }, { count: playing }] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('read', false),
        supabase.from('prizes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'playing'),
      ])
      return res.status(200).json({ unread: unread || 0, pendingPrizes: prizes || 0, liveRooms: playing || 0 })
    }

    if (action === 'dashboard') {
      const [
        { data: payments },
        { count: totalRooms },
        { count: totalPlayers },
        { count: activeSessions },
        { count: pendingPrizes },
        { data: deliveredPrizes },
        { data: rooms },
      ] = await Promise.all([
        supabase.from('payments').select('amount, created_at').eq('status', 'confirmed'),
        supabase.from('rooms').select('*', { count: 'exact', head: true }),
        supabase.from('players').select('*', { count: 'exact', head: true }),
        supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'playing'),
        supabase.from('prizes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('prizes').select('amount').eq('status', 'delivered'),
        supabase.from('rooms').select('created_at, archive_id, archives(title, subtitle)').eq('status', 'finished'),
      ])

      const safePayments = payments || []
      const safeRooms = rooms || []
      const totalRevenue = safePayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      const totalPrizeCost = (deliveredPrizes || []).reduce((sum, prize) => sum + Number(prize.amount || 0), 0)
      const last14 = daysBack(14)
      const revenueData = last14.map((date) => {
        const dayPayments = safePayments.filter((payment) => String(payment.created_at).startsWith(date))
        const dayRooms = safeRooms.filter((room) => String(room.created_at).startsWith(date))
        return {
          date: dayLabel(date),
          receita: dayPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
          jogos: dayRooms.length,
        }
      })

      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      const weekdayData = weekdays.map((dia, index) => ({
        dia,
        acessos: safeRooms.filter((room) => new Date(room.created_at).getDay() === index).length,
      }))

      const gameCount: Record<string, { title: string; plays: number }> = {}
      safeRooms.forEach((room) => {
        const archive = room.archives as { title?: string; subtitle?: string } | null
        if (!archive?.title) return
        const title = `${archive.title}: ${archive.subtitle || ''}`.trim()
        gameCount[archive.title] = { title, plays: (gameCount[archive.title]?.plays || 0) + 1 }
      })

      return res.status(200).json({
        stats: {
          totalRevenue,
          totalRooms: totalRooms || 0,
          totalPlayers: totalPlayers || 0,
          activeSessions: activeSessions || 0,
          pendingPrizes: pendingPrizes || 0,
          totalPrizeCost,
        },
        revenueData,
        weekdayData,
        topGames: Object.values(gameCount).sort((a, b) => b.plays - a.plays),
      })
    }

    if (action === 'payments') {
      const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ payments: data || [] })
    }

    if (action === 'financials') {
      const [{ data: payments }, { data: prizes }] = await Promise.all([
        supabase.from('payments').select('*').eq('status', 'confirmed').order('created_at', { ascending: false }),
        supabase.from('prizes').select('*').eq('status', 'delivered').order('created_at', { ascending: false }),
      ])
      return res.status(200).json({ payments: payments || [], prizes: prizes || [] })
    }

    if (action === 'prizes') {
      const { data, error } = await supabase.from('prizes').select('*').order('created_at', { ascending: false })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ prizes: data || [] })
    }

    if (action === 'deliver-prize') {
      const prizeId = normalizeText(req.body?.prize_id, 80)
      if (!prizeId) return res.status(400).json({ error: 'Missing prize_id' })

      const { data: prize, error } = await supabase
        .from('prizes')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', prizeId)
        .select()
        .single()
      if (error) return res.status(500).json({ error: error.message })

      await supabase.from('notifications').insert({
        type: 'prize_delivered',
        title: 'Prémio entregue',
        message: `${prize.winner_name} recebeu ${Number(prize.amount || 0).toLocaleString()} Kz`,
        data: { prize_id: prize.id, room_id: prize.room_id, winner_name: prize.winner_name },
      })

      return res.status(200).json({ prize })
    }

    if (action === 'notifications') {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ notifications: data || [] })
    }

    if (action === 'mark-notification-read') {
      const notificationId = normalizeText(req.body?.notification_id, 80)
      if (!notificationId) return res.status(400).json({ error: 'Missing notification_id' })
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    if (action === 'mark-all-notifications-read') {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    if (action === 'rooms') {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, archives(title, subtitle)')
        .order('created_at', { ascending: false })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ rooms: data || [] })
    }

    if (action === 'archives') {
      const { data, error } = await supabase.from('archives').select('*').order('created_at')
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ archives: data || [] })
    }

    if (action === 'save-archive') {
      const archive = sanitizeArchive(req.body?.archive || {})
      if (!archive.slug || !archive.title) return res.status(400).json({ error: 'Slug e título são obrigatórios.' })
      if (archive.min_players > archive.max_players) return res.status(400).json({ error: 'Mínimo de jogadores não pode ser maior que o máximo.' })

      const archiveId = normalizeText((req.body?.archive || {}).id, 80)
      const query = archiveId
        ? supabase.from('archives').update(archive).eq('id', archiveId)
        : supabase.from('archives').insert({ ...archive, is_active: false })

      const { error } = await query
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    if (action === 'toggle-archive') {
      const archiveId = normalizeText(req.body?.archive_id, 80)
      const isActive = Boolean(req.body?.is_active)
      if (!archiveId) return res.status(400).json({ error: 'Missing archive_id' })
      const { error } = await supabase.from('archives').update({ is_active: !isActive }).eq('id', archiveId)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    if (action === 'asset-bootstrap') {
      const { data, error } = await supabase.from('archives').select('id, title, subtitle').order('created_at')
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ archives: data || [] })
    }

    if (action === 'assets') {
      const archiveId = normalizeText(req.body?.archive_id, 80)
      if (!archiveId) return res.status(400).json({ error: 'Missing archive_id' })
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('archive_id', archiveId)
        .order('trigger_minute', { ascending: true, nullsFirst: false })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ assets: data || [] })
    }

    if (action === 'create-asset') {
      const asset = sanitizeAsset(req.body?.asset || {})
      if (!asset.archive_id || !asset.name || !asset.file_url) return res.status(400).json({ error: 'Asset incompleto.' })
      const { error } = await supabase.from('assets').insert(asset)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    if (action === 'delete-asset') {
      const assetId = normalizeText(req.body?.asset_id, 80)
      if (!assetId) return res.status(400).json({ error: 'Missing asset_id' })
      const { error } = await supabase.from('assets').delete().eq('id', assetId)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown admin action' })
  } catch (error) {
    console.error('admin data endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
