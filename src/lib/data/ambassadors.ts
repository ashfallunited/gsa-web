import { unstable_cache } from 'next/cache'
import { getAdminDb } from '@/lib/firebase-admin'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { docWithId } from '@/lib/serialize-firestore'
import { sortByOrder } from '@/lib/data/utils'

export type Ambassador = {
  id: string
  name: string
  title: string
  sport: string
  image: string
  order?: number
}

async function fetchAmbassadors(): Promise<Ambassador[]> {
  const snap = await getAdminDb().collection('ambassadors').get()
  const ambassadors = snap.docs.map(
    (d) => docWithId(d.id, d.data() as Record<string, unknown>) as Ambassador
  )
  return sortByOrder(ambassadors)
}

export const getAmbassadors = unstable_cache(fetchAmbassadors, ['ambassadors-v2'], {
  tags: [CACHE_TAGS.partners],
  revalidate: 600,
})
