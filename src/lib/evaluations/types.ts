import type { FirestoreTimestamp } from '@/lib/analytics/types'

export type EvaluationRole = 'outfield' | 'goalkeeper'
export type EvaluationType = 'training' | 'match'

export const OUTFIELD_CATEGORY_META = [
  { key: 'firstTouch', label: 'First Touch', short: 'Touch' },
  { key: 'passing', label: 'Passing', short: 'Passing' },
  { key: 'ballControl', label: 'Ball Control', short: 'Control' },
  { key: 'dribbling', label: 'Dribbling', short: 'Dribble' },
  { key: 'shooting', label: 'Shooting', short: 'Shoot' },
  { key: 'positioning', label: 'Positioning', short: 'Position' },
  { key: 'movement', label: 'Movement', short: 'Movement' },
  { key: 'scanning', label: 'Scanning', short: 'Scanning' },
  { key: 'decisionMaking', label: 'Decision Making', short: 'Decisions' },
  { key: 'speed', label: 'Speed', short: 'Speed' },
  { key: 'workRate', label: 'Work Rate', short: 'Work Rate' },
  { key: 'teamwork', label: 'Teamwork', short: 'Teamwork' },
  { key: 'discipline', label: 'Discipline', short: 'Discipline' },
] as const

export const GOALKEEPER_CATEGORY_META = [
  { key: 'handling', label: 'Handling', short: 'Handling' },
  { key: 'shotStopping', label: 'Shot Stopping', short: 'Shot Stop' },
  { key: 'positioning', label: 'Positioning', short: 'Position' },
  { key: 'distribution', label: 'Distribution', short: 'Distribution' },
  { key: 'communication', label: 'Communication', short: 'Comms' },
  { key: 'penaltySaves', label: 'Penalty Saves', short: 'Pens' },
] as const

export type OutfieldCategoryKey = (typeof OUTFIELD_CATEGORY_META)[number]['key']
export type GoalkeeperCategoryKey = (typeof GOALKEEPER_CATEGORY_META)[number]['key']
export type EvaluationCategoryKey = OutfieldCategoryKey | GoalkeeperCategoryKey

export type OutfieldCategories = Record<OutfieldCategoryKey, number>
export type GoalkeeperCategories = Record<GoalkeeperCategoryKey, number>
export type EvaluationCategories = OutfieldCategories | GoalkeeperCategories

export const EVAL_MAX_TOTAL: Record<EvaluationRole, number> = {
  outfield: OUTFIELD_CATEGORY_META.length * 5,
  goalkeeper: GOALKEEPER_CATEGORY_META.length * 5,
}

export function categoryMetaFor(role: EvaluationRole) {
  return role === 'goalkeeper' ? GOALKEEPER_CATEGORY_META : OUTFIELD_CATEGORY_META
}

/** Outfield positions use the 13-category template; goalkeepers use the 6-category one. */
export function roleForPosition(position: string | undefined): EvaluationRole {
  return position === 'goalkeeper' ? 'goalkeeper' : 'outfield'
}

export interface Coach {
  id: string
  name: string
  active: boolean
  createdAt?: FirestoreTimestamp
  updatedAt?: FirestoreTimestamp
}

export interface PlayerEvaluation {
  id: string
  playerId: string
  coachId: string
  team: string
  role: EvaluationRole
  type: EvaluationType
  date: string
  season: string
  categories: EvaluationCategories
  total: number
  maxTotal: number
  comment: string
  enteredBy: string
  createdAt?: FirestoreTimestamp
  updatedAt?: FirestoreTimestamp
}

export type CategoryAverages = Record<string, number>

export interface EvaluationSessionSummary {
  id: string
  date: string
  type: EvaluationType
  coachId: string
  coachName: string
  categories: EvaluationCategories
  total: number
  maxTotal: number
  comment: string
}

export interface EvaluationComment {
  evaluationId: string
  date: string
  coachId: string
  coachName: string
  comment: string
}

export interface SquadRank {
  rank: number
  outOf: number
}

export interface TypeSplitEntry {
  sessionCount: number
  averageTotal: number
}

/** Same-total-score averages, split by training vs match, so a coach can spot players who perform differently under match pressure. */
export interface TypeSplit {
  training: TypeSplitEntry
  match: TypeSplitEntry
}

/**
 * Attendance is inferred, not separately recorded: a "session" is any date the team has at
 * least one evaluation on record (any player, any role). A player who wasn't evaluated on a
 * date the team otherwise had a session is counted absent for it.
 */
export interface AttendanceSummary {
  sessionsHeld: number
  attended: number
  absent: number
  attendanceRate: number | null
  absentDates: string[]
}

export interface WeekReport {
  role: EvaluationRole
  weekStart: string
  weekKey: string
  sessionCount: number
  categoryAverages: CategoryAverages
  squadCategoryAverages: CategoryAverages
  averageTotal: number
  maxTotal: number
  sessions: EvaluationSessionSummary[]
  comments: EvaluationComment[]
  squadRank: SquadRank | null
  typeSplit: TypeSplit
  attendance: AttendanceSummary
}

export interface MonthWeekTrendPoint {
  weekStart: string
  weekKey: string
  sessionCount: number
  averageTotal: number
}

export interface MonthSessionTrendPoint {
  evaluationId: string
  date: string
  type: EvaluationType
  total: number
}

export interface MonthReport {
  role: EvaluationRole
  month: string
  categoryAverages: CategoryAverages
  squadCategoryAverages: CategoryAverages
  averageTotal: number
  maxTotal: number
  sessionCount: number
  weeksWithSessions: number
  totalWeeksInMonth: number
  weeklyTrend: MonthWeekTrendPoint[]
  sessionTrend: MonthSessionTrendPoint[]
  sessions: EvaluationSessionSummary[]
  comments: EvaluationComment[]
  squadRank: SquadRank | null
  typeSplit: TypeSplit
  attendance: AttendanceSummary
}

export interface MonthTrendPoint {
  month: string
  sessionCount: number
  averageTotal: number
}

export interface YearReport {
  role: EvaluationRole
  year: string
  categoryAverages: CategoryAverages
  squadCategoryAverages: CategoryAverages
  averageTotal: number
  maxTotal: number
  sessionCount: number
  monthsWithSessions: number
  totalMonthsInYear: number
  monthlyTrend: MonthTrendPoint[]
  sessionTrend: MonthSessionTrendPoint[]
  sessions: EvaluationSessionSummary[]
  comments: EvaluationComment[]
  squadRank: SquadRank | null
  typeSplit: TypeSplit
  attendance: AttendanceSummary
}

export interface TeamLeaderboardEntry {
  playerId: string
  playerName: string
  playerNumber: number
  playerImage?: string
  averageTotal: number
  sessionCount: number
}

export interface TopCategoryCount {
  key: string
  label: string
  count: number
}

export interface TeamLeaderboard {
  role: EvaluationRole
  maxTotal: number
  entries: TeamLeaderboardEntry[]
  categoryAverages: CategoryAverages
  topCategoryDistribution: TopCategoryCount[]
}
