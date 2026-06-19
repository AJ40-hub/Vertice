import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'vertice_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 8

type AdminSessionPayload = {
  exp: number
  nonce: string
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET must be defined with at least 32 characters')
  }
  return secret
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(payload: string) {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url')
}

function parseCookies(cookieHeader: string | undefined) {
  return Object.fromEntries(
    (cookieHeader || '')
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const index = cookie.indexOf('=')
        return index === -1 ? [cookie, ''] : [cookie.slice(0, index), decodeURIComponent(cookie.slice(index + 1))]
      })
  )
}

export function createAdminSessionCookie() {
  const payload: AdminSessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString('hex'),
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(encodedPayload)
  const token = `${encodedPayload}.${signature}`
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''

  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly${secureFlag}; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
}

export function createAdminLogoutCookie() {
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${COOKIE_NAME}=; HttpOnly${secureFlag}; SameSite=Strict; Path=/; Max-Age=0`
}

export function verifyAdminSession(req: { headers?: { cookie?: string } }) {
  const token = parseCookies(req.headers?.cookie)[COOKIE_NAME]
  if (!token) return false

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return false

  const expectedSignature = sign(encodedPayload)
  const received = Buffer.from(signature)
  const expected = Buffer.from(expectedSignature)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionPayload
    return typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export function requireAdmin(req: { headers?: { cookie?: string } }, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  if (verifyAdminSession(req)) return true
  res.status(401).json({ error: 'Unauthorized' })
  return false
}
