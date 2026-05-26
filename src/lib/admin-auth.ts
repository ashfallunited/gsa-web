import type { NextRequest } from 'next/server'
import { verifySession, COOKIE } from '@/lib/session'

export async function isAdminAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return false
  return verifySession(token)
}

export async function requireAdmin(req: NextRequest): Promise<Response | null> {
  if (!(await isAdminAuthenticated(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
