import { buildLlmsTxt } from '@/lib/llms-txt'

export const dynamic = 'force-static'
export const revalidate = 86400

export function GET(): Response {
  return new Response(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
