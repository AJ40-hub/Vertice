import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined in the server environment')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

export function normalizeRoomCode(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
}

export function normalizeWhatsApp(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/[^\d+]/g, '').slice(0, 18)
}

export function normalizeStoragePath(value: unknown, bucket = process.env.SUPABASE_STORAGE_BUCKET || process.env.VITE_SUPABASE_STORAGE_BUCKET || 'vertice-assets') {
  if (typeof value !== 'string') return ''
  const raw = value.trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    const publicMarker = `/storage/v1/object/public/${bucket}/`
    const signedMarker = `/storage/v1/object/sign/${bucket}/`
    const marker = url.pathname.includes(publicMarker) ? publicMarker : url.pathname.includes(signedMarker) ? signedMarker : ''
    if (marker) {
      return decodeURIComponent(url.pathname.split(marker)[1] || '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .replace(/\.\./g, '')
        .slice(0, 600)
    }
  } catch {
    // Not an absolute URL, treat it as a storage path.
  }

  return raw
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.\./g, '')
    .slice(0, 600)
}

export function isValidGender(value: unknown) {
  return value === 'masculino' || value === 'feminino' || value === 'outro'
}

export function isValidWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 9 && digits.length <= 15
}
