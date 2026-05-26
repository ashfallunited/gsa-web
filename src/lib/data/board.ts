import { unstable_cache } from 'next/cache'
import { getAdminDb } from '@/lib/firebase-admin'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { docWithId } from '@/lib/serialize-firestore'
import { sortByOrder } from '@/lib/data/utils'

export type BoardMember = {
  id: string
  name: string
  role?: string
  bio?: string
  image?: string
  order?: number
}

async function fetchBoardMembers(): Promise<BoardMember[]> {
  const [boardSnap, teamSnap] = await Promise.all([
    getAdminDb().collection('board').get(),
    getAdminDb().collection('team').get(),
  ])

  const fromBoard = boardSnap.docs.map(
    (d) => docWithId(d.id, d.data() as Record<string, unknown>) as BoardMember
  )

  const fromTeam = teamSnap.docs
    .filter((d) => d.data().section === 'board')
    .map((d) => docWithId(d.id, d.data() as Record<string, unknown>) as BoardMember)

  return sortByOrder([...fromBoard, ...fromTeam])
}

export const getBoardMembers = unstable_cache(fetchBoardMembers, ['board-members-v1'], {
  tags: [CACHE_TAGS.team],
  revalidate: 600,
})
