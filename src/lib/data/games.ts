import { unstable_cache } from 'next/cache'
import { getAdminDb } from '@/lib/firebase-admin'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { docWithId, serializeFirestoreData } from '@/lib/serialize-firestore'
import {
  aggregatePlayerSeasonTotals,
  computeDashboardKpis,
  computeMatchResult,
  disciplineLeaders,
  goalsByMonth,
  minutesLeaders,
  topScorersFromTotals,
} from '@/lib/analytics/aggregation'
import type { Match, MatchPlayerStat, PlayerSeasonTotals } from '@/lib/analytics/types'
import { normalizeTeamSlug, teamSlugsForQuery } from '@/lib/teams'

function parseMatch(id: string, data: Record<string, unknown>): Match {
  const serialized = serializeFirestoreData(data)
  return {
    id,
    team: normalizeTeamSlug(String(serialized.team ?? 'first-team')),
    season: String(serialized.season ?? ''),
    competition: String(serialized.competition ?? ''),
    date: String(serialized.date ?? ''),
    opponent: String(serialized.opponent ?? ''),
    homeAway: (serialized.homeAway as Match['homeAway']) ?? 'home',
    goalsFor: Number(serialized.goalsFor ?? 0),
    goalsAgainst: Number(serialized.goalsAgainst ?? 0),
    status: (serialized.status as Match['status']) ?? 'draft',
    notes: String(serialized.notes ?? ''),
    createdBy: String(serialized.createdBy ?? ''),
    updatedAt: serialized.updatedAt as Match['updatedAt'],
    createdAt: serialized.createdAt as Match['createdAt'],
  }
}

function parseStat(id: string, data: Record<string, unknown>): MatchPlayerStat {
  const serialized = serializeFirestoreData(data)
  return {
    id,
    matchId: String(serialized.matchId ?? ''),
    playerId: String(serialized.playerId ?? ''),
    started: Boolean(serialized.started),
    minutes: Number(serialized.minutes ?? 0),
    goals: Number(serialized.goals ?? 0),
    assists: Number(serialized.assists ?? 0),
    yellowCards: Number(serialized.yellowCards ?? 0),
    redCards: Number(serialized.redCards ?? 0),
    notes: String(serialized.notes ?? ''),
    enteredBy: String(serialized.enteredBy ?? ''),
    updatedAt: serialized.updatedAt as MatchPlayerStat['updatedAt'],
    headerGoals: serialized.headerGoals != null ? Number(serialized.headerGoals) : undefined,
    leftFootGoals: serialized.leftFootGoals != null ? Number(serialized.leftFootGoals) : undefined,
    rightFootGoals: serialized.rightFootGoals != null ? Number(serialized.rightFootGoals) : undefined,
    outsideBoxGoals: serialized.outsideBoxGoals != null ? Number(serialized.outsideBoxGoals) : undefined,
    penaltiesTaken: serialized.penaltiesTaken != null ? Number(serialized.penaltiesTaken) : undefined,
    penaltiesScored: serialized.penaltiesScored != null ? Number(serialized.penaltiesScored) : undefined,
    penaltiesSaved: serialized.penaltiesSaved != null ? Number(serialized.penaltiesSaved) : undefined,
    penaltiesFaced: serialized.penaltiesFaced != null ? Number(serialized.penaltiesFaced) : undefined,
  }
}

async function fetchFinalMatches(team: string, season?: string): Promise<Match[]> {
  const db = getAdminDb()
  const slugs = teamSlugsForQuery(team)
  const queryBase = db.collection('matches').where('status', '==', 'final')
  const query = season ? queryBase.where('season', '==', season) : queryBase
  const snap = await query.get()
  const matches = snap.docs.map((d) => parseMatch(d.id, d.data() as Record<string, unknown>))
  return matches
    .filter((m) => slugs.includes(normalizeTeamSlug(m.team)))
    .sort((a, b) => b.date.localeCompare(a.date))
}

async function fetchAllStatsForMatches(matchIds: string[]): Promise<MatchPlayerStat[]> {
  if (matchIds.length === 0) return []
  const db = getAdminDb()
  const chunks: string[][] = []
  for (let i = 0; i < matchIds.length; i += 10) {
    chunks.push(matchIds.slice(i, i + 10))
  }
  const all: MatchPlayerStat[] = []
  for (const chunk of chunks) {
    const snap = await db.collection('match_player_stats').where('matchId', 'in', chunk).get()
    for (const doc of snap.docs) {
      all.push(parseStat(doc.id, doc.data() as Record<string, unknown>))
    }
  }
  return all
}

async function fetchPlayerMeta(team: string): Promise<Map<string, { name: string; number: number; position: string; team: string; image?: string }>> {
  const db = getAdminDb()
  const slugs = teamSlugsForQuery(team)
  const snap = await db.collection('players').get()
  const map = new Map<string, { name: string; number: number; position: string; team: string; image?: string }>()
  for (const doc of snap.docs) {
    const data = doc.data()
    const playerTeam = normalizeTeamSlug(String(data.team ?? ''))
    if (!slugs.includes(playerTeam)) continue
    map.set(doc.id, {
      name: String(data.name ?? 'Unknown'),
      number: Number(data.number ?? 0),
      position: String(data.position ?? ''),
      team: playerTeam,
      image: String(data.image ?? ''),
    })
  }
  return map
}

export async function getRecentResults(team: string, limit = 5, season?: string) {
  const matches = await fetchFinalMatches(team, season)
  return matches.slice(0, limit).map((m) => ({
    ...m,
    result: computeMatchResult(m),
  }))
}

export async function getTopScorers(team: string, limit = 5, season?: string): Promise<PlayerSeasonTotals[]> {
  const matches = await fetchFinalMatches(team, season)
  const matchIds = matches.map((m) => m.id)
  const finalIds = new Set(matchIds)
  const [stats, playerMeta] = await Promise.all([
    fetchAllStatsForMatches(matchIds),
    fetchPlayerMeta(team),
  ])
  const totals = aggregatePlayerSeasonTotals(stats, playerMeta, finalIds)
  return topScorersFromTotals(totals, limit)
}

export async function getPlayerSeasonStatsMap(
  team: string,
  season?: string
): Promise<Map<string, Pick<PlayerSeasonTotals, 'goals' | 'assists' | 'appearances' | 'minutes'>>> {
  const matches = await fetchFinalMatches(team, season)
  const matchIds = matches.map((m) => m.id)
  const finalIds = new Set(matchIds)
  const [stats, playerMeta] = await Promise.all([
    fetchAllStatsForMatches(matchIds),
    fetchPlayerMeta(team),
  ])
  const totals = aggregatePlayerSeasonTotals(stats, playerMeta, finalIds)
  const map = new Map<string, Pick<PlayerSeasonTotals, 'goals' | 'assists' | 'appearances' | 'minutes'>>()
  for (const t of totals) {
    map.set(t.playerId, {
      goals: t.goals,
      assists: t.assists,
      appearances: t.appearances,
      minutes: t.minutes,
    })
  }
  return map
}

export async function getTeamStatsBundle(team: string, season?: string) {
  const matches = await fetchFinalMatches(team, season)
  const matchIds = matches.map((m) => m.id)
  const finalIds = new Set(matchIds)
  const [stats, playerMeta] = await Promise.all([
    fetchAllStatsForMatches(matchIds),
    fetchPlayerMeta(team),
  ])
  const totals = aggregatePlayerSeasonTotals(stats, playerMeta, finalIds)
  return {
    kpis: computeDashboardKpis(matches),
    recentResults: matches.slice(0, 5).map((m) => ({ ...m, result: computeMatchResult(m) })),
    topScorers: topScorersFromTotals(totals, 5),
    goalsChart: goalsByMonth(matches),
    discipline: disciplineLeaders(totals, 5),
    minutesLeaders: minutesLeaders(totals, 5),
  }
}

const _cachedGetTeamStatsBundle = unstable_cache(
  (team: string, season?: string) => getTeamStatsBundle(team, season),
  ['team-stats'],
  { tags: [CACHE_TAGS.games], revalidate: 300 }
)
export const getCachedTeamStatsBundle = (team: string, season?: string) =>
  _cachedGetTeamStatsBundle(team, season)

const _cachedGetRecentResults = unstable_cache(
  (team: string, limit: number, season?: string) => getRecentResults(team, limit, season),
  ['recent-results'],
  { tags: [CACHE_TAGS.games], revalidate: 300 }
)
export const getCachedRecentResults = (team: string, limit = 5, season?: string) =>
  _cachedGetRecentResults(team, limit, season)

const _cachedGetTopScorers = unstable_cache(
  (team: string, limit: number, season?: string) => getTopScorers(team, limit, season),
  ['top-scorers'],
  { tags: [CACHE_TAGS.games], revalidate: 300 }
)
export const getCachedTopScorers = (team: string, limit = 5, season?: string) =>
  _cachedGetTopScorers(team, limit, season)

const _cachedGetPlayerSeasonStatsMap = unstable_cache(
  (team: string, season?: string) => getPlayerSeasonStatsMap(team, season),
  ['player-season-stats-map'],
  { tags: [CACHE_TAGS.games], revalidate: 300 }
)
export const getCachedPlayerSeasonStatsMap = (team: string, season?: string) =>
  _cachedGetPlayerSeasonStatsMap(team, season)

export { docWithId, parseMatch, parseStat, fetchFinalMatches, fetchAllStatsForMatches, fetchPlayerMeta, aggregatePlayerSeasonTotals, computeDashboardKpis, goalsByMonth, topScorersFromTotals, disciplineLeaders, minutesLeaders }
