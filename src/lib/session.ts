import { SignJWT, jwtVerify } from 'jose'
import type { AdminRole } from '@/lib/analytics/types'

function getSecret(): Uint8Array {
  const raw = process.env.ADMIN_SESSION_SECRET
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_SESSION_SECRET must be set in production')
    }
    return new TextEncoder().encode('dev-only-secret-not-for-production')
  }
  return new TextEncoder().encode(raw)
}

const ALG = 'HS256'
export const COOKIE = 'asfall_admin_session'
const EXPIRES_IN = '8h'

export interface SessionPayload {
  admin: true
  role: AdminRole
  sub: string
}

export async function signSession(payload: { role: AdminRole; sub: string }): Promise<string> {
  return new SignJWT({ admin: true, role: payload.role, sub: payload.sub })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret())
}

function normalizePayload(raw: Record<string, unknown>): SessionPayload | null {
  if (raw.admin !== true) return null
  if (raw.role !== 'super_admin' && raw.role !== 'data_analyst') return null
  const role = raw.role as AdminRole
  const sub = typeof raw.sub === 'string' && raw.sub ? raw.sub : 'admin'
  return { admin: true, role, sub }
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return normalizePayload(payload as Record<string, unknown>)
  } catch {
    return null
  }
}

/** Backward-compatible boolean check for middleware and legacy callers. */
export async function isValidSessionToken(token: string): Promise<boolean> {
  return (await verifySession(token)) !== null
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${8 * 60 * 60}${secure}`
}
