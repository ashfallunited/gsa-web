import type {
  DashboardKpis,
  GoalkeeperCleanSheetLeader,
  Match,
  MatchPlayerStat,
  PlayerSeasonTotals,
} from '@/lib/analytics/types'

export function computeMatchResult(match: Pick<Match, 'goalsFor' | 'goalsAgainst'>): 'W' | 'D' | 'L' {
  if (match.goalsFor > match.goalsAgainst) return 'W'
  if (match.goalsFor < match.goalsAgainst) return 'L'
  return 'D'
}

export function computeDashboardKpis(matches: Match[]): DashboardKpis {
  let wins = 0
  let draws = 0
  let losses = 0
  let goalsFor = 0
  let goalsAgainst = 0
  let cleanSheets = 0

  for (const match of matches) {
    if (match.status !== 'final') continue
    goalsFor += match.goalsFor
    goalsAgainst += match.goalsAgainst
    if (match.goalsAgainst === 0) cleanSheets += 1
    const result = computeMatchResult(match)
    if (result === 'W') wins += 1
    else if (result === 'D') draws += 1
    else losses += 1
  }

  return {
    matchesPlayed: wins + draws + losses,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    cleanSheets,
  }
}

export function aggregatePlayerSeasonTotals(
  stats: MatchPlayerStat[],
  playerMeta: Map<string, { name: string; number: number; position: string; team: string; image?: string }>,
  finalMatchIds: Set<string>
): PlayerSeasonTotals[] {
  const totals = new Map<string, PlayerSeasonTotals>()

  for (const stat of stats) {
    if (!finalMatchIds.has(stat.matchId)) continue
    if (stat.minutes <= 0 && stat.goals === 0 && stat.assists === 0 && stat.yellowCards === 0 && stat.redCards === 0) {
      continue
    }

    const meta = playerMeta.get(stat.playerId)
    if (!meta) continue

    const existing = totals.get(stat.playerId) ?? {
      playerId: stat.playerId,
      playerName: meta.name,
      playerNumber: meta.number,
      playerPosition: meta.position,
      playerImage: meta.image ?? '',
      team: meta.team,
      appearances: 0,
      starts: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      headerGoals: 0,
      leftFootGoals: 0,
      rightFootGoals: 0,
      outsideBoxGoals: 0,
      penaltiesTaken: 0,
      penaltiesScored: 0,
      penaltiesSaved: 0,
      penaltiesFaced: 0,
    }

    if (stat.minutes > 0 || stat.started) {
      existing.appearances += 1
    }
    if (stat.started) existing.starts += 1
    existing.minutes += stat.minutes
    existing.goals += stat.goals
    existing.assists += stat.assists
    existing.yellowCards += stat.yellowCards
    existing.redCards += stat.redCards
    existing.headerGoals += stat.headerGoals ?? 0
    existing.leftFootGoals += stat.leftFootGoals ?? 0
    existing.rightFootGoals += stat.rightFootGoals ?? 0
    existing.outsideBoxGoals += stat.outsideBoxGoals ?? 0
    existing.penaltiesTaken += stat.penaltiesTaken ?? 0
    existing.penaltiesScored += stat.penaltiesScored ?? 0
    existing.penaltiesSaved += stat.penaltiesSaved ?? 0
    existing.penaltiesFaced += stat.penaltiesFaced ?? 0

    totals.set(stat.playerId, existing)
  }

  return [...totals.values()].sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals
    if (b.assists !== a.assists) return b.assists - a.assists
    return b.minutes - a.minutes
  })
}

export function goalsByMonth(matches: Match[]): { month: string; goals: number }[] {
  const map = new Map<string, number>()
  for (const match of matches) {
    if (match.status !== 'final') continue
    const month = match.date.slice(0, 7)
    if (!month) continue
    map.set(month, (map.get(month) ?? 0) + match.goalsFor)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, goals]) => ({ month, goals }))
}

export function topScorersFromTotals(totals: PlayerSeasonTotals[], limit = 5): PlayerSeasonTotals[] {
  return [...totals]
    .filter((t) => t.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, limit)
}

export function disciplineLeaders(totals: PlayerSeasonTotals[], limit = 5): PlayerSeasonTotals[] {
  return [...totals]
    .filter((t) => t.yellowCards > 0 || t.redCards > 0)
    .sort(
      (a, b) =>
        b.redCards * 2 + b.yellowCards - (a.redCards * 2 + a.yellowCards) ||
        b.yellowCards - a.yellowCards
    )
    .slice(0, limit)
}

export function topAssistsFromTotals(totals: PlayerSeasonTotals[], limit = 5): PlayerSeasonTotals[] {
  return [...totals]
    .filter((t) => t.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
    .slice(0, limit)
}

/** Credit clean sheets to goalkeepers who started (or had most GK minutes) in 0-conceded final matches. */
export function goalkeeperCleanSheetLeaders(
  stats: MatchPlayerStat[],
  finalMatches: Match[],
  playerMeta: Map<string, { name: string; number: number; position: string; team: string; image?: string }>,
  limit = 5
): GoalkeeperCleanSheetLeader[] {
  const cleanSheetMatchIds = new Set(
    finalMatches.filter((m) => m.goalsAgainst === 0).map((m) => m.id)
  )
  if (cleanSheetMatchIds.size === 0) return []

  const counts = new Map<string, number>()

  for (const matchId of cleanSheetMatchIds) {
    const matchStats = stats.filter((s) => s.matchId === matchId)
    const gkStats = matchStats.filter((s) => {
      const meta = playerMeta.get(s.playerId)
      return meta?.position === 'goalkeeper' && (s.started || s.minutes > 0)
    })

    if (gkStats.length === 0) continue

    const credited = gkStats.sort((a, b) => {
      if (a.started !== b.started) return a.started ? -1 : 1
      return b.minutes - a.minutes
    })[0]

    counts.set(credited.playerId, (counts.get(credited.playerId) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([playerId, cleanSheets]) => {
      const meta = playerMeta.get(playerId)
      return {
        playerId,
        playerName: meta?.name ?? 'Unknown',
        playerNumber: meta?.number ?? 0,
        playerImage: meta?.image ?? '',
        cleanSheets,
      }
    })
    .sort((a, b) => b.cleanSheets - a.cleanSheets)
    .slice(0, limit)
}

export function minutesLeaders(totals: PlayerSeasonTotals[], limit = 5): PlayerSeasonTotals[] {
  return [...totals]
    .filter((t) => t.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, limit)
}

