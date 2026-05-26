import { unstable_cache } from 'next/cache'
import { getAdminDb } from '@/lib/firebase-admin'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { docWithId, serializeFirestoreData } from '@/lib/serialize-firestore'
import { sortByCreatedAtDesc } from '@/lib/data/utils'

export type GalleryItem = {
  id: string
  type: 'photo' | 'video'
  imageUrl?: string
  youtubeId?: string
  caption?: string
  createdAt?: { seconds: number } | null
}

async function fetchGallery(): Promise<GalleryItem[]> {
  const snap = await getAdminDb().collection('gallery').get()

  const items = snap.docs.map((d) => {
    const data = serializeFirestoreData(d.data() as Record<string, unknown>)
    const type = (data.type as 'photo' | 'video') ?? (data.youtubeId ? 'video' : 'photo')
    return docWithId(d.id, {
      type,
      imageUrl: String(data.imageUrl ?? ''),
      youtubeId: String(data.youtubeId ?? ''),
      caption: String(data.caption ?? ''),
      createdAt: (data.createdAt as GalleryItem['createdAt']) ?? null,
    }) as GalleryItem
  })

  return sortByCreatedAtDesc(items) as GalleryItem[]
}

export const getGalleryItems = unstable_cache(fetchGallery, ['gallery-items-v2'], {
  tags: [CACHE_TAGS.gallery],
  revalidate: 300,
})
