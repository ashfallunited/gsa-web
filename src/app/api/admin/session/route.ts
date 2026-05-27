import { NextRequest } from 'next/server'
import { getSession } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return Response.json({
    role: session.role,
    sub: session.sub,
    isSuperAdmin: session.role === 'super_admin',
    isDataAnalyst: session.role === 'data_analyst',
  })
}
