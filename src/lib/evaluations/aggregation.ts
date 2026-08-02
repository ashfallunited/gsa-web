import type {
  AttendanceSummary,
  CategoryAverages,
  EvaluationComment,
  EvaluationRole,
  EvaluationSessionSummary,
  MonthReport,
  MonthSessionTrendPoint,
  MonthTrendPoint,
  MonthWeekTrendPoint,
  PlayerEvaluation,
  SquadRank,
  TeamLeaderboardEntry,
  TypeSplit,
  WeekReport,
  YearReport,
} from './types'
import { EVAL_MAX_TOTAL, categoryMetaFor } from './types'
import { isoWeekKey, isoWeekKeyToMonday, monthOf, weeksOverlappingMonth } from './date-utils'

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function averageCategoryScores(evals: PlayerEvaluation[], role: EvaluationRole): CategoryAverages {
  const meta = categoryMetaFor(role)
  const averages: CategoryAverages = {}
  for (const { key } of meta) {
    if (evals.length === 0) {
      averages[key] = 0
      continue
    }
    const sum = evals.reduce((acc, e) => acc + (Number((e.categories as Record<string, number>)[key]) || 0), 0)
    averages[key] = round1(sum / evals.length)
  }
  return averages
}

export function averageTotal(evals: PlayerEvaluation[]): number {
  if (evals.length === 0) return 0
  return round1(evals.reduce((acc, e) => acc + e.total, 0) / evals.length)
}

function toSessionSummary(e: PlayerEvaluation, coachName: string): EvaluationSessionSummary {
  return {
    id: e.id,
    date: e.date,
    type: e.type,
    coachId: e.coachId,
    coachName,
    categories: e.categories,
    total: e.total,
    maxTotal: e.maxTotal,
    comment: e.comment,
  }
}

function toComments(evals: PlayerEvaluation[], coachNameOf: (id: string) => string): EvaluationComment[] {
  return evals
    .filter((e) => e.comment && e.comment.trim())
    .map((e) => ({ evaluationId: e.id, date: e.date, coachId: e.coachId, coachName: coachNameOf(e.coachId), comment: e.comment }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.evaluationId.localeCompare(b.evaluationId))
}

function groupByPlayer(evals: PlayerEvaluation[]): Map<string, PlayerEvaluation[]> {
  const byPlayer = new Map<string, PlayerEvaluation[]>()
  for (const e of evals) {
    if (!byPlayer.has(e.playerId)) byPlayer.set(e.playerId, [])
    byPlayer.get(e.playerId)!.push(e)
  }
  return byPlayer
}

/** Per-player average total across a set of same-period, same-role evaluations — the pool a squad rank is drawn from. */
export function computeTeamAverages(periodEvals: PlayerEvaluation[]): { playerId: string; averageTotal: number }[] {
  return [...groupByPlayer(periodEvals).entries()].map(([playerId, evals]) => ({ playerId, averageTotal: averageTotal(evals) }))
}

export function computeSquadRank(
  teamAveragesForPeriod: { playerId: string; averageTotal: number }[],
  playerId: string
): SquadRank | null {
  const ranked = [...teamAveragesForPeriod].sort((a, b) => b.averageTotal - a.averageTotal)
  const idx = ranked.findIndex((r) => r.playerId === playerId)
  if (idx === -1) return null
  return { rank: idx + 1, outOf: ranked.length }
}

/** Squad average per category: each player's own category average, then averaged across players (so a player with many more sessions doesn't skew it). */
export function computeSquadCategoryAverages(teamRoleEvals: PlayerEvaluation[], role: EvaluationRole): CategoryAverages {
  const perPlayerAverages = [...groupByPlayer(teamRoleEvals).values()].map((evals) => averageCategoryScores(evals, role))
  const meta = categoryMetaFor(role)
  const result: CategoryAverages = {}
  for (const { key } of meta) {
    if (perPlayerAverages.length === 0) {
      result[key] = 0
      continue
    }
    const sum = perPlayerAverages.reduce((acc, avg) => acc + (avg[key] ?? 0), 0)
    result[key] = round1(sum / perPlayerAverages.length)
  }
  return result
}

export function computeTypeSplit(evals: PlayerEvaluation[]): TypeSplit {
  const training = evals.filter((e) => e.type === 'training')
  const match = evals.filter((e) => e.type === 'match')
  return {
    training: { sessionCount: training.length, averageTotal: averageTotal(training) },
    match: { sessionCount: match.length, averageTotal: averageTotal(match) },
  }
}

/**
 * `teamSessionDates` is every distinct date the team (any player, any role) has at least one
 * evaluation on record for the period — the inferred "session calendar." A player missing from
 * one of those dates was absent from it.
 */
export function computeAttendance(playerEvals: PlayerEvaluation[], teamSessionDates: string[]): AttendanceSummary {
  const attendedDates = new Set(playerEvals.map((e) => e.date))
  const absentDates = teamSessionDates.filter((d) => !attendedDates.has(d)).sort()
  const sessionsHeld = teamSessionDates.length
  const attended = sessionsHeld - absentDates.length
  return {
    sessionsHeld,
    attended,
    absent: absentDates.length,
    attendanceRate: sessionsHeld > 0 ? round1((attended / sessionsHeld) * 100) : null,
    absentDates,
  }
}

/**
 * For each evaluated player, finds their single highest-averaged category (ties go to whichever
 * comes first in the category list), then counts how many players "peak" in each category —
 * a squad-composition view distinct from the averages radar (e.g. "5 players are strongest in
 * Passing, 2 in Shooting").
 */
export function computeTopCategoryDistribution(
  teamRoleEvals: PlayerEvaluation[],
  role: EvaluationRole
): { key: string; label: string; count: number }[] {
  const meta = categoryMetaFor(role)
  const counts = new Map<string, number>()

  for (const evals of groupByPlayer(teamRoleEvals).values()) {
    const averages = averageCategoryScores(evals, role)
    let bestKey: string | null = null
    let bestValue = -Infinity
    for (const { key } of meta) {
      const v = averages[key] ?? 0
      if (v > bestValue) {
        bestValue = v
        bestKey = key
      }
    }
    if (bestKey && bestValue > 0) {
      counts.set(bestKey, (counts.get(bestKey) ?? 0) + 1)
    }
  }

  return meta
    .map(({ key, label }) => ({ key, label, count: counts.get(key) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
}

export function computeTeamLeaderboard(
  teamRoleEvals: PlayerEvaluation[],
  playerMeta: Map<string, { name: string; number: number; image?: string }>
): TeamLeaderboardEntry[] {
  const byPlayer = groupByPlayer(teamRoleEvals)
  return [...byPlayer.entries()]
    .map(([playerId, evals]) => {
      const meta = playerMeta.get(playerId)
      return {
        playerId,
        playerName: meta?.name ?? 'Unknown',
        playerNumber: meta?.number ?? 0,
        playerImage: meta?.image,
        averageTotal: averageTotal(evals),
        sessionCount: evals.length,
      }
    })
    .sort((a, b) => b.averageTotal - a.averageTotal)
}

export function computeWeekReport(
  playerId: string,
  role: EvaluationRole,
  weekKey: string,
  weekEvals: PlayerEvaluation[],
  coachNameOf: (id: string) => string,
  teamRoleEvals: PlayerEvaluation[],
  teamSessionDates: string[]
): WeekReport {
  const sorted = [...weekEvals].sort((a, b) => a.date.localeCompare(b.date))
  return {
    role,
    weekStart: isoWeekKeyToMonday(weekKey),
    weekKey,
    sessionCount: sorted.length,
    categoryAverages: averageCategoryScores(sorted, role),
    squadCategoryAverages: computeSquadCategoryAverages(teamRoleEvals, role),
    averageTotal: averageTotal(sorted),
    maxTotal: EVAL_MAX_TOTAL[role],
    sessions: sorted.map((e) => toSessionSummary(e, coachNameOf(e.coachId))),
    comments: toComments(sorted, coachNameOf),
    squadRank: computeSquadRank(computeTeamAverages(teamRoleEvals), playerId),
    typeSplit: computeTypeSplit(sorted),
    attendance: computeAttendance(sorted, teamSessionDates),
  }
}

export function computeMonthReport(
  playerId: string,
  role: EvaluationRole,
  monthKey: string,
  monthEvals: PlayerEvaluation[],
  coachNameOf: (id: string) => string,
  teamRoleEvals: PlayerEvaluation[],
  teamSessionDates: string[]
): MonthReport {
  const sorted = [...monthEvals].sort((a, b) => a.date.localeCompare(b.date))

  const byWeek = new Map<string, PlayerEvaluation[]>()
  for (const e of sorted) {
    const wk = isoWeekKey(e.date)
    if (!byWeek.has(wk)) byWeek.set(wk, [])
    byWeek.get(wk)!.push(e)
  }

  const weeklyTrend: MonthWeekTrendPoint[] = [...byWeek.entries()]
    .map(([weekKey, evals]) => ({
      weekStart: isoWeekKeyToMonday(weekKey),
      weekKey,
      sessionCount: evals.length,
      averageTotal: averageTotal(evals),
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))

  const sessionTrend: MonthSessionTrendPoint[] = sorted.map((e) => ({
    evaluationId: e.id,
    date: e.date,
    type: e.type,
    total: e.total,
  }))

  return {
    role,
    month: monthKey,
    categoryAverages: averageCategoryScores(sorted, role),
    squadCategoryAverages: computeSquadCategoryAverages(teamRoleEvals, role),
    averageTotal: averageTotal(sorted),
    maxTotal: EVAL_MAX_TOTAL[role],
    sessionCount: sorted.length,
    weeksWithSessions: byWeek.size,
    totalWeeksInMonth: weeksOverlappingMonth(monthKey).length,
    weeklyTrend,
    sessionTrend,
    sessions: sorted.map((e) => toSessionSummary(e, coachNameOf(e.coachId))),
    comments: toComments(sorted, coachNameOf),
    squadRank: computeSquadRank(computeTeamAverages(teamRoleEvals), playerId),
    typeSplit: computeTypeSplit(sorted),
    attendance: computeAttendance(sorted, teamSessionDates),
  }
}

export function computeYearReport(
  playerId: string,
  role: EvaluationRole,
  yearKey: string,
  yearEvals: PlayerEvaluation[],
  coachNameOf: (id: string) => string,
  teamRoleEvals: PlayerEvaluation[],
  teamSessionDates: string[]
): YearReport {
  const sorted = [...yearEvals].sort((a, b) => a.date.localeCompare(b.date))

  const byMonth = new Map<string, PlayerEvaluation[]>()
  for (const e of sorted) {
    const mk = monthOf(e.date)
    if (!byMonth.has(mk)) byMonth.set(mk, [])
    byMonth.get(mk)!.push(e)
  }

  const monthlyTrend: MonthTrendPoint[] = [...byMonth.entries()]
    .map(([month, evals]) => ({ month, sessionCount: evals.length, averageTotal: averageTotal(evals) }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const sessionTrend: MonthSessionTrendPoint[] = sorted.map((e) => ({
    evaluationId: e.id,
    date: e.date,
    type: e.type,
    total: e.total,
  }))

  return {
    role,
    year: yearKey,
    categoryAverages: averageCategoryScores(sorted, role),
    squadCategoryAverages: computeSquadCategoryAverages(teamRoleEvals, role),
    averageTotal: averageTotal(sorted),
    maxTotal: EVAL_MAX_TOTAL[role],
    sessionCount: sorted.length,
    monthsWithSessions: byMonth.size,
    totalMonthsInYear: 12,
    monthlyTrend,
    sessionTrend,
    sessions: sorted.map((e) => toSessionSummary(e, coachNameOf(e.coachId))),
    comments: toComments(sorted, coachNameOf),
    squadRank: computeSquadRank(computeTeamAverages(teamRoleEvals), playerId),
    typeSplit: computeTypeSplit(sorted),
    attendance: computeAttendance(sorted, teamSessionDates),
  }
}
