import { requireAdmin } from '../_adminAuth'
import { getSupabaseAdmin, normalizeStoragePath, normalizeText } from '../_supabaseAdmin'

const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || process.env.VITE_SUPABASE_STORAGE_BUCKET || 'vertice-assets'

function cleanBucket(value: unknown) {
  const bucket = normalizeText(value, 80)
  return bucket || DEFAULT_BUCKET
}

function cleanPath(value: unknown) {
  return normalizeStoragePath(value)
}

function cleanExpires(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 300
  return Math.min(3600, Math.max(60, Math.round(parsed)))
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!requireAdmin(req, res)) return

  try {
    const supabase = getSupabaseAdmin()
    const action = typeof req.body?.action === 'string' ? req.body.action : ''
    const bucket = cleanBucket(req.body?.bucket)

    if (action === 'list') {
      const path = cleanPath(req.body?.path)
      const { data, error } = await supabase.storage.from(bucket).list(path, {
        limit: 200,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ files: data || [] })
    }

    if (action === 'signed-upload') {
      const path = cleanPath(req.body?.path)
      if (!path) return res.status(400).json({ error: 'Missing path' })
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, { upsert: true })
      if (error || !data) return res.status(500).json({ error: error?.message || 'Could not create signed upload URL' })
      return res.status(200).json(data)
    }

    if (action === 'remove') {
      const paths = Array.isArray(req.body?.paths)
        ? req.body.paths.map(cleanPath).filter(Boolean)
        : [cleanPath(req.body?.path)].filter(Boolean)
      if (paths.length === 0) return res.status(400).json({ error: 'Missing path' })
      const { error } = await supabase.storage.from(bucket).remove(paths)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true })
    }

    if (action === 'signed-url') {
      const path = cleanPath(req.body?.path)
      if (!path) return res.status(400).json({ error: 'Missing path' })
      const expiresIn = cleanExpires(req.body?.expires_in)
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
      if (error || !data?.signedUrl) return res.status(500).json({ error: error?.message || 'Could not create signed URL' })
      return res.status(200).json({ signedUrl: data.signedUrl, expiresIn })
    }

    return res.status(400).json({ error: 'Unknown storage action' })
  } catch (error) {
    console.error('admin storage endpoint error:', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
