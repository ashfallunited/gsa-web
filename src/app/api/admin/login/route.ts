import { NextRequest } from 'next/server'
import { signSession, sessionCookieHeader } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}))

  const adminUser = process.env.ADMIN_USERNAME
  const adminPass = process.env.ADMIN_PASSWORD
  const analystUser = process.env.DATA_ANALYST_USERNAME
  const analystPass = process.env.DATA_ANALYST_PASSWORD

  let role: 'super_admin' | 'data_analyst' | null = null

  if (username === adminUser && password === adminPass) {
    role = 'super_admin'
  } else if (analystUser && analystPass && username === analystUser && password === analystPass) {
    role = 'data_analyst'
  }

  if (!role) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signSession({ role, sub: username })

  return new Response(JSON.stringify({ ok: true, role }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': sessionCookieHeader(token),
    },
  })
}
