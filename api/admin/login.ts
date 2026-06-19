import { createAdminSessionCookie } from '../_adminAuth'
import { timingSafeEqual } from 'node:crypto'

const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000
const attempts = new Map<string, { count: number; lockedUntil: number }>()

function clientIp(req: any) {
  const forwarded = req.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin password is not configured' })
  }

  const ip = clientIp(req)
  const record = attempts.get(ip)
  if (record && record.lockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' })
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!safeEqual(password, adminPassword)) {
    const failed = attempts.get(ip) || { count: 0, lockedUntil: 0 }
    const count = failed.count + 1
    attempts.set(ip, {
      count,
      lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0,
    })
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  attempts.delete(ip)
  res.setHeader('Set-Cookie', createAdminSessionCookie())
  return res.status(200).json({ ok: true })
}
