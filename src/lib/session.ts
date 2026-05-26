import { SignJWT, jwtVerify } from 'jose'

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

export async function signSession(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret())
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${8 * 60 * 60}${secure}`
}
