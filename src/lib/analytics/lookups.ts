import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import { normalizeTeamSlug, playerMatchesTeamFilter } from '@/lib/teams'

export type LookupType = 'opponent' | 'competition' | 'season'

function lookupDocId(type: LookupType, team: string, value: string): string {
  const slug = `${type}_${normalizeTeamSlug(team)}_${value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 120)
  return slug
}

export async function saveAnalyticsLookups(
  db: Firestore,
  team: string,
  values: { opponent?: string; competition?: string; season?: string }
): Promise<void> {
  const normalizedTeam = normalizeTeamSlug(team)
  const batch = db.batch()

  const entries: { type: LookupType; value: string }[] = []
  if (values.opponent?.trim()) entries.push({ type: 'opponent', value: values.opponent.trim() })
  if (values.competition?.trim()) entries.push({ type: 'competition', value: values.competition.trim() })
  if (values.season?.trim()) entries.push({ type: 'season', value: values.season.trim() })

  for (const { type, value } of entries) {
    const ref = db.collection('analytics_lookups').doc(lookupDocId(type, normalizedTeam, value))
    batch.set(
      ref,
      {
        type,
        team: normalizedTeam,
        value,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }

  if (entries.length > 0) await batch.commit()
}

export async function getAnalyticsLookups(
  db: Firestore,
  team?: string
): Promise<{ opponents: string[]; competitions: string[]; seasons: string[] }> {
  const snap = await db.collection('analytics_lookups').get()
  const opponents = new Set<string>()
  const competitions = new Set<string>()
  const seasons = new Set<string>()

  for (const doc of snap.docs) {
    const data = doc.data()
    const value = String(data.value ?? '').trim()
    if (!value) continue
    const docTeam = normalizeTeamSlug(String(data.team ?? ''))
    if (team && team !== 'all' && !playerMatchesTeamFilter(docTeam, team)) continue

    const type = String(data.type ?? '')
    if (type === 'opponent') opponents.add(value)
    else if (type === 'competition') competitions.add(value)
    else if (type === 'season') seasons.add(value)
  }

  return {
    opponents: [...opponents].sort(),
    competitions: [...competitions].sort(),
    seasons: [...seasons].sort().reverse(),
  }
}

export async function mergeLookupsFromMatches(
  db: Firestore,
  team?: string
): Promise<{ opponents: string[]; competitions: string[]; seasons: string[] }> {
  const snap = await db.collection('matches').get()
  const opponents = new Set<string>()
  const competitions = new Set<string>()
  const seasons = new Set<string>()

  for (const doc of snap.docs) {
    const data = doc.data()
    const matchTeam = normalizeTeamSlug(String(data.team ?? ''))
    if (team && team !== 'all' && !playerMatchesTeamFilter(matchTeam, team)) continue

    const opponent = String(data.opponent ?? '').trim()
    const competition = String(data.competition ?? '').trim()
    const season = String(data.season ?? '').trim()
    if (opponent) opponents.add(opponent)
    if (competition) competitions.add(competition)
    if (season) seasons.add(season)
  }

  const stored = await getAnalyticsLookups(db, team)
  for (const v of stored.opponents) opponents.add(v)
  for (const v of stored.competitions) competitions.add(v)
  for (const v of stored.seasons) seasons.add(v)

  return {
    opponents: [...opponents].sort(),
    competitions: [...competitions].sort(),
    seasons: [...seasons].sort().reverse(),
  }
}
