import { NextRequest } from 'next/server'
import { runAnalyticsReadApi } from '@/lib/admin-api'
import {
  aggregatePlayerSeasonTotals,
  parseMatch,
  parseStat,
} from '@/lib/data/games'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { computeMatchResult } from '@/lib/analytics/aggregation'
import { normalizeTeamSlug, playerMatchesTeamFilter } from '@/lib/teams'

export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const team = req.nextUrl.searchParams.get('team') ?? 'all'
    const season = req.nextUrl.searchParams.get('season') ?? undefined
    const playerId = req.nextUrl.searchParams.get('playerId')

    const [matchesSnap, statsSnap, playersSnap] = await Promise.all([
      db.collection('matches').get(),
      db.collection('match_player_stats').get(),
      db.collection('players').get(),
    ])

    let matches = matchesSnap.docs.map((d) => parseMatch(d.id, d.data() as Record<string, unknown>))
    if (team !== 'all') {
      matches = matches.filter((m) => playerMatchesTeamFilter(m.team, team))
    }
    if (season) {
      matches = matches.filter((m) => m.season === season)
    }

    const finalIds = new Set(matches.filter((m) => m.status === 'final').map((m) => m.id))
    const allStats = statsSnap.docs.map((d) => parseStat(d.id, d.data() as Record<string, unknown>))

    const playerMeta = new Map<string, { name: string; number: number; position: string; team: string; image?: string; height?: number; weight?: number; preferredFoot?: string }>()
    for (const doc of playersSnap.docs) {
      const data = serializeFirestoreData(doc.data() as Record<string, unknown>)
      const playerTeam = normalizeTeamSlug(String(data.team ?? ''))
      if (team !== 'all' && !playerMatchesTeamFilter(playerTeam, team)) continue
      playerMeta.set(doc.id, {
        name: String(data.name ?? 'Unknown'),
        number: Number(data.number ?? 0),
        position: String(data.position ?? ''),
        team: playerTeam,
        image: String(data.image ?? ''),
        height: data.height ? Number(data.height) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
        preferredFoot: data.preferredFoot ? String(data.preferredFoot) : undefined,
      })
    }

    const totals = aggregatePlayerSeasonTotals(allStats, playerMeta, finalIds)

    if (playerId) {
      const playerStats = allStats.filter((s) => s.playerId === playerId)
      const matchMap = new Map(matches.map((m) => [m.id, m]))
      const log = playerStats
        .map((s) => {
          const match = matchMap.get(s.matchId)
          if (!match) return null
          return {
            ...s,
            matchDate: match.date,
            opponent: match.opponent,
            competition: match.competition,
            season: match.season,
            result: computeMatchResult(match),
            matchStatus: match.status,
          }
        })
        .filter(Boolean)
        .sort((a, b) => (b!.matchDate).localeCompare(a!.matchDate))

      const total = totals.find((t) => t.playerId === playerId) ?? null
      const meta = playerMeta.get(playerId) ?? null

      return Response.json({ playerId, meta, total, log })
    }

    return Response.json({ totals, seasons: [...new Set(matches.map((m) => m.season))].sort().reverse() })
  })
}
