import { unstable_cache } from 'next/cache'
import { getAdminDb } from '@/lib/firebase-admin'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { docWithId } from '@/lib/serialize-firestore'

export type Product = {
  id: string
  name: string
  price: number
  image?: string
  description?: string
  sizes?: string[]
  category?: string
  order?: number
  /** Legacy field — admin uses `available` */
  active?: boolean
  available?: boolean
}

function isProductVisible(product: Product): boolean {
  if (product.available === false) return false
  if (product.active === false) return false
  return true
}

async function fetchProducts(): Promise<Product[]> {
  const snap = await getAdminDb().collection('products').orderBy('order', 'asc').get()
  return snap.docs
    .map((d) => docWithId(d.id, d.data() as Record<string, unknown>) as Product)
    .filter(isProductVisible)
}

export const getActiveProducts = unstable_cache(fetchProducts, ['active-products-v2'], {
  tags: [CACHE_TAGS.shop],
  revalidate: 300,
})
