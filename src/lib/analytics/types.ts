export type AdminRole = 'super_admin' | 'data_analyst'

export type MatchStatus = 'draft' | 'final'

export type HomeAway = 'home' | 'away' | 'neutral'

export interface FirestoreTimestamp {
  seconds: number
  nanoseconds?: number
}

export interface Match {
  id: string
  team: string
  season: string
  competition: string
  date: string
  opponent: string
  homeAway: HomeAway
  goalsFor: number
  goalsAgainst: number
  status: MatchStatus
  notes: string
  createdBy: string
  updatedAt?: FirestoreTimestamp
  createdAt?: FirestoreTimestamp
}

export interface MatchPlayerStat {
  id: string
  matchId: string
  playerId: string
  started: boolean
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  notes: string
  enteredBy: string
  updatedAt?: FirestoreTimestamp
  headerGoals?: number
  leftFootGoals?: number
  rightFootGoals?: number
  outsideBoxGoals?: number
  penaltiesTaken?: number
  penaltiesScored?: number
  penaltiesSaved?: number
  penaltiesFaced?: number
}

export interface PlayerSeasonTotals {
  playerId: string
  playerName: string
  playerNumber: number
  playerPosition: string
  playerImage?: string
  team: string
  appearances: number
  starts: number
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  headerGoals: number
  leftFootGoals: number
  rightFootGoals: number
  outsideBoxGoals: number
  penaltiesTaken: number
  penaltiesScored: number
  penaltiesSaved: number
  penaltiesFaced: number
}

export interface DashboardKpis {
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  cleanSheets: number
}

export interface GoalkeeperCleanSheetLeader {
  playerId: string
  playerName: string
  playerNumber: number
  playerImage?: string
  cleanSheets: number
}

export interface AuditLogEntry {
  id: string
  action: string
  entityType: 'match' | 'match_player_stat' | 'match_duplicate'
  entityId: string
  summary: string
  actor: string
  actorRole: AdminRole
  createdAt?: FirestoreTimestamp
  metadata?: Record<string, unknown>
}

export interface AnalyticsPlayerOption {
  id: string
  name: string
  number: number
  position: string
  team: string
}
