import type { NextRequest } from 'next/server'
import type { AdminRole } from '@/lib/analytics/types'
import { canAccessAnalytics, canWriteAnalytics, roleHasPermission } from '@/lib/analytics/permissions'
import { verifySession, COOKIE, type SessionPayload } from '@/lib/session'

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

export async function isAdminAuthenticated(req: NextRequest): Promise<boolean> {
  return (await getSession(req)) !== null
}

export async function requireAdmin(req: NextRequest): Promise<Response | null> {
  if (!(await isAdminAuthenticated(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function requireRole(
  req: NextRequest,
  roles: readonly AdminRole[]
): Promise<{ denied: Response } | { session: SessionPayload }> {
  const session = await getSession(req)
  if (!session) {
    return { denied: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!roles.includes(session.role)) {
    return { denied: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

export async function requireSuperAdmin(req: NextRequest): Promise<{ denied: Response } | { session: SessionPayload }> {
  return requireRole(req, ['super_admin'])
}

export async function requireAnalyticsRead(
  req: NextRequest
): Promise<{ denied: Response } | { session: SessionPayload }> {
  const session = await getSession(req)
  if (!session) {
    return { denied: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!canAccessAnalytics(session.role)) {
    return { denied: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

export async function requireAnalyticsWrite(
  req: NextRequest
): Promise<{ denied: Response } | { session: SessionPayload }> {
  const result = await requireAnalyticsRead(req)
  if ('denied' in result) return result
  if (!canWriteAnalytics(result.session.role)) {
    return { denied: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return result
}

export async function requirePermission(
  req: NextRequest,
  permission: string
): Promise<{ denied: Response } | { session: SessionPayload }> {
  const session = await getSession(req)
  if (!session) {
    return { denied: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!roleHasPermission(session.role, permission)) {
    return { denied: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}
