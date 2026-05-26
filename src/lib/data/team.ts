import { unstable_cache } from 'next/cache'
import { getAdminDb } from '@/lib/firebase-admin'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { sortPlayersByPosition } from '@/lib/player-sort'
import { normalizeTeamSlug, playerMatchesTeamFilter } from '@/lib/teams'
import { docWithId } from '@/lib/serialize-firestore'
import { sortByOrder } from '@/lib/data/utils'

export type Player = {
  id: string
  name: string
  position?: string
  number?: number
  image?: string
  team?: string
  order?: number
}

export type StaffMember = {
  id: string
  name: string
  role?: string
  image?: string
  order?: number
  section?: string
}

async function fetchPlayers(team: string): Promise<Player[]> {
  const snap = await getAdminDb().collection('players').get()
  const players = snap.docs
    .map((d) => {
      const raw = d.data()
      return docWithId(d.id, {
        ...raw,
        team: normalizeTeamSlug(raw.team as string | undefined),
      } as Record<string, unknown>) as Player
    })
    .filter((p) => playerMatchesTeamFilter(p.team, team))

  return sortPlayersByPosition(players)
}

async function fetchStaff(): Promise<StaffMember[]> {
  const snap = await getAdminDb().collection('team').get()
  const staff = snap.docs
    .map((d) => docWithId(d.id, d.data() as Record<string, unknown>) as StaffMember)
    .filter((m) => (m.section ?? 'staff') !== 'board')

  return sortByOrder(staff)
}

export const getPlayersByTeam = (team: string) =>
  unstable_cache(() => fetchPlayers(team), [`players-${team}-v2`], {
    tags: [CACHE_TAGS.team],
    revalidate: 600,
  })()

export const getManagementStaff = unstable_cache(fetchStaff, ['management-staff-v2'], {
  tags: [CACHE_TAGS.team],
  revalidate: 600,
})
