import { NextRequest } from 'next/server'
import { runAnalyticsReadApi } from '@/lib/admin-api'
import {
  aggregatePlayerSeasonTotals,
  computeDashboardKpis,
  disciplineLeaders,
  goalkeeperCleanSheetLeaders,
  goalsByMonth,
  minutesLeaders,
  topAssistsFromTotals,
  topScorersFromTotals,
} from '@/lib/analytics/aggregation'
import {
  parseMatch,
  parseStat,
} from '@/lib/data/games'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { computeMatchResult } from '@/lib/analytics/aggregation'
import { normalizeTeamSlug, playerMatchesTeamFilter } from '@/lib/teams'

export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const team = req.nextUrl.searchParams.get('team') ?? 'first-team'
    const season = req.nextUrl.searchParams.get('season') ?? undefined
    const competition = req.nextUrl.searchParams.get('competition') ?? undefined

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
    if (competition) {
      matches = matches.filter((m) => m.competition.toLowerCase() === competition.toLowerCase())
    }

    const finalMatches = matches.filter((m) => m.status === 'final')
    const finalIds = new Set(finalMatches.map((m) => m.id))

    const allStats = statsSnap.docs.map((d) => parseStat(d.id, d.data() as Record<string, unknown>))
    const filteredStats = allStats.filter((s) => finalIds.has(s.matchId))

    const playerMeta = new Map<string, { name: string; number: number; position: string; team: string; image?: string }>()
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
      })
    }

    const totals = aggregatePlayerSeasonTotals(filteredStats, playerMeta, finalIds)
    const kpis = computeDashboardKpis(finalMatches)
    const topScorers = topScorersFromTotals(totals, 8)
    const topAssists = topAssistsFromTotals(totals, 8)
    const gkCleanSheets = goalkeeperCleanSheetLeaders(filteredStats, finalMatches, playerMeta, 5)

    const recentMatches = [...matches]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8)
      .map((m) => ({ ...m, result: computeMatchResult(m) }))

    const seasons = [...new Set(matches.map((m) => m.season))].filter(Boolean).sort().reverse()
    const competitions = [...new Set(matches.map((m) => m.competition))].filter(Boolean).sort()

    const topScorer = topScorers[0] ?? null
    const topAssist = topAssists[0] ?? null
    const topGk = gkCleanSheets[0] ?? null

    const disciplineList = disciplineLeaders(totals, 8)
    const penaltyTotals = {
      taken: totals.reduce((sum, t) => sum + t.penaltiesTaken, 0),
      scored: totals.reduce((sum, t) => sum + t.penaltiesScored, 0),
    }
    const totalCards = {
      yellow: totals.reduce((sum, t) => sum + t.yellowCards, 0),
      red: totals.reduce((sum, t) => sum + t.redCards, 0),
    }

    return Response.json({
      kpis,
      topScorer,
      topAssist,
      topGk,
      recentMatches,
      topScorers,
      topAssists,
      gkCleanSheets,
      discipline: disciplineList,
      minutesLeaders: minutesLeaders(totals, 8),
      penaltyTotals,
      totalCards,
      goalsChart: goalsByMonth(finalMatches),
      seasons,
      competitions,
      playerCount: playerMeta.size,
      filters: { team, season: season ?? null, competition: competition ?? null },
    })
  })
}
