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

    type InjuryData = { description?: string; injuredDate: string; expectedReturn?: string }
    const playerMeta = new Map<string, { name: string; number: number; position: string; team: string; image?: string; height?: number; weight?: number; preferredFoot?: string; injury?: InjuryData | null }>()
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
        injury: (data.injury as InjuryData | null | undefined) ?? null,
      })
    }

    const statsTotals = aggregatePlayerSeasonTotals(allStats, playerMeta, finalIds)

    // Include every registered player, even those with no match data yet
    const inTotals = new Set(statsTotals.map((t) => t.playerId))
    const zeroes = [...playerMeta.entries()]
      .filter(([id]) => !inTotals.has(id))
      .map(([id, meta]) => ({
        playerId: id,
        playerName: meta.name,
        playerNumber: meta.number,
        playerPosition: meta.position,
        playerImage: meta.image ?? '',
        team: meta.team,
        appearances: 0, starts: 0, minutes: 0,
        goals: 0, assists: 0,
        yellowCards: 0, redCards: 0,
        headerGoals: 0, leftFootGoals: 0, rightFootGoals: 0, outsideBoxGoals: 0,
        penaltiesTaken: 0, penaltiesScored: 0, penaltiesSaved: 0, penaltiesFaced: 0,
      }))
    const totals = [...statsTotals, ...zeroes]

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
