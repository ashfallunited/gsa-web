export const TEAM_SLUG = {
  firstTeam: 'first-team',
  academy: 'academy',
} as const

export type TeamSlug = (typeof TEAM_SLUG)[keyof typeof TEAM_SLUG]

/** Firestore value used before the Academy rename — still queried for existing records. */
export const LEGACY_ACADEMY_TEAM_SLUG = 'youth-15'

export const TEAM_LABELS: Record<TeamSlug, string> = {
  [TEAM_SLUG.firstTeam]: 'First Team',
  [TEAM_SLUG.academy]: 'Academy',
}

export const TEAM_NAV_LINKS = [
  { label: TEAM_LABELS[TEAM_SLUG.firstTeam], href: `/team/${TEAM_SLUG.firstTeam}` },
  { label: TEAM_LABELS[TEAM_SLUG.academy], href: `/team/${TEAM_SLUG.academy}` },
  { label: 'Management', href: '/team/management' },
] as const

export function normalizeTeamSlug(team: string | undefined): string {
  if (!team || team === LEGACY_ACADEMY_TEAM_SLUG) return TEAM_SLUG.academy
  return team
}

export function teamSlugsForQuery(slug: string): string[] {
  if (slug === TEAM_SLUG.academy || slug === LEGACY_ACADEMY_TEAM_SLUG) {
    return [TEAM_SLUG.academy, LEGACY_ACADEMY_TEAM_SLUG]
  }
  return [slug]
}

export function displayTeamLabel(team: string | undefined): string {
  const normalized = normalizeTeamSlug(team)
  if (normalized === TEAM_SLUG.firstTeam) return TEAM_LABELS[TEAM_SLUG.firstTeam]
  if (normalized === TEAM_SLUG.academy) return TEAM_LABELS[TEAM_SLUG.academy]
  return team ?? '—'
}

export function playerMatchesTeamFilter(playerTeam: string | undefined, filter: string): boolean {
  if (filter === 'all') return true
  if (filter === TEAM_SLUG.academy) {
    return playerTeam === TEAM_SLUG.academy || playerTeam === LEGACY_ACADEMY_TEAM_SLUG
  }
  return playerTeam === filter
}
