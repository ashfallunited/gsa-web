import { unstable_cache } from 'next/cache'
import { getAdminDb } from '@/lib/firebase-admin'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { docWithId } from '@/lib/serialize-firestore'
import { sortByOrder } from '@/lib/data/utils'

export type Partner = {
  id: string
  name: string
  logo: string
  url?: string
  order?: number
}

async function fetchPartners(): Promise<Partner[]> {
  const snap = await getAdminDb().collection('partners').get()
  const partners = snap.docs.map(
    (d) => docWithId(d.id, d.data() as Record<string, unknown>) as Partner
  )
  return sortByOrder(partners)
}

export const getPartners = unstable_cache(fetchPartners, ['partners-v2'], {
  tags: [CACHE_TAGS.partners],
  revalidate: 600,
})
