import { COOKIE } from '@/lib/session'

export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${COOKIE}=; HttpOnly; Path=/; Max-Age=0`,
    },
  })
}
