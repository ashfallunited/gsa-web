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
    highlightUrl: serialized.highlightUrl ? String(serialized.highlightUrl) : undefined,
    report: serialized.report ? String(serialized.report) : undefined,
    slug: serialized.slug ? String(serialized.slug) : undefined,
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
    goalMinutes: Array.isArray(serialized.goalMinutes)
      ? (serialized.goalMinutes as unknown[]).map(Number)
      : undefined,
    assistMinutes: Array.isArray(serialized.assistMinutes)
      ? (serialized.assistMinutes as unknown[]).map(Number)
      : undefined,
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

export type PublicMatch = Match & { result: 'W' | 'D' | 'L' | null }

export type MatchReviewPlayer = {
  id: string
  name: string
  number: number
  position: string
  image?: string
}

export type MatchReviewStat = {
  playerId: string
  playerName: string
  playerNumber: number
  playerPosition: string
  playerImage?: string
  started: boolean
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  goalMinutes: number[]
  assistMinutes: number[]
}

export type MatchReview = {
  match: Match & { result: 'W' | 'D' | 'L' }
  stats: MatchReviewStat[]
}

async function fetchPublicMatches(): Promise<{ results: PublicMatch[]; fixtures: Match[]; seasons: string[] }> {
  const db = getAdminDb()
  const snap = await db.collection('matches').get()
  const all = snap.docs.map((d) => parseMatch(d.id, d.data() as Record<string, unknown>))

  const today = new Date().toISOString().slice(0, 10)

  const results: PublicMatch[] = all
    .filter((m) => m.status === 'final')
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((m) => ({ ...m, result: computeMatchResult(m) }))

  const fixtures: Match[] = all
    .filter((m) => m.status === 'draft' && m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  const seasons = [...new Set(results.map((m) => m.season))].sort().reverse()

  return { results, fixtures, seasons }
}

async function fetchMatchReview(slugOrId: string): Promise<MatchReview | null> {
  const db = getAdminDb()

  type DocRef = { id: string; data: () => Record<string, unknown> }

  // Try slug lookup first (new matches), fall back to direct ID (legacy URLs)
  let resolved: DocRef | null = await db
    .collection('matches')
    .where('slug', '==', slugOrId)
    .limit(1)
    .get()
    .then((snap) => (snap.empty ? null : { id: snap.docs[0].id, data: () => snap.docs[0].data() as Record<string, unknown> }))
    .catch(() => null)

  if (!resolved) {
    const byId = await db.collection('matches').doc(slugOrId).get().catch(() => null)
    if (byId?.exists) resolved = { id: byId.id, data: () => byId.data() as Record<string, unknown> }
  }

  if (!resolved) return null
  const match = parseMatch(resolved.id, resolved.data())
  if (match.status !== 'final') return null

  const [statsSnap, playersSnap] = await Promise.all([
    db.collection('match_player_stats').where('matchId', '==', resolved.id).get(),
    db.collection('players').get(),
  ])

  const playerMap = new Map<string, { name: string; number: number; position: string; team: string; image?: string }>()
  for (const doc of playersSnap.docs) {
    const d = doc.data()
    playerMap.set(doc.id, {
      name: String(d.name ?? ''),
      number: Number(d.number ?? 0),
      position: String(d.position ?? ''),
      team: String(d.team ?? ''),
      image: d.image ? String(d.image) : undefined,
    })
  }

  const stats: MatchReviewStat[] = statsSnap.docs
    .map((doc) => {
      const s = parseStat(doc.id, doc.data() as Record<string, unknown>)
      const p = playerMap.get(s.playerId)
      return {
        playerId: s.playerId,
        playerName: p?.name ?? 'Unknown',
        playerNumber: p?.number ?? 0,
        playerPosition: p?.position ?? '',
        playerImage: p?.image,
        started: s.started,
        minutes: s.minutes,
        goals: s.goals,
        assists: s.assists,
        yellowCards: s.yellowCards,
        redCards: s.redCards,
        goalMinutes: s.goalMinutes ?? [],
        assistMinutes: s.assistMinutes ?? [],
      }
    })
    .filter((s) => s.minutes > 0 || s.started || s.goals > 0)
    .sort((a, b) => {
      if (a.started && !b.started) return -1
      if (!a.started && b.started) return 1
      return a.playerNumber - b.playerNumber
    })

  return { match: { ...match, result: computeMatchResult(match) }, stats }
}

const _cachedMatchReview = (slugOrId: string) =>
  unstable_cache(
    () => fetchMatchReview(slugOrId),
    [`match-review-${slugOrId}`],
    { tags: [CACHE_TAGS.games], revalidate: 300 }
  )()

export const getMatchReview = (slugOrId: string) => _cachedMatchReview(slugOrId)

const _cachedPublicMatches = unstable_cache(fetchPublicMatches, ['public-matches-v1'], {
  tags: [CACHE_TAGS.games],
  revalidate: 300,
})
export const getPublicMatches = () => _cachedPublicMatches()

export { docWithId, parseMatch, parseStat, fetchFinalMatches, fetchAllStatsForMatches, fetchPlayerMeta, aggregatePlayerSeasonTotals, computeDashboardKpis, goalsByMonth, topScorersFromTotals, disciplineLeaders, minutesLeaders }
