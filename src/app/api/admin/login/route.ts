import { NextRequest } from 'next/server'
import { signSession, sessionCookieHeader } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}))

  const validUser = username === process.env.ADMIN_USERNAME
  const validPass = password === process.env.ADMIN_PASSWORD

  if (!validUser || !validPass) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await signSession()

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': sessionCookieHeader(token),
    },
  })
}
