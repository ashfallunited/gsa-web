import { NextRequest } from 'next/server'
import { runAnalyticsReadApi } from '@/lib/admin-api'
import { mergeLookupsFromMatches } from '@/lib/analytics/lookups'

export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const team = req.nextUrl.searchParams.get('team') ?? undefined
    const lookups = await mergeLookupsFromMatches(db, team)
    return Response.json(lookups)
  })
}
