import { unstable_cache } from 'next/cache'
import { getAdminDb } from '@/lib/firebase-admin'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { docWithId } from '@/lib/serialize-firestore'

export type BlogPost = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featuredImage: string
  author: string
  tags: string[]
  status?: 'draft' | 'published' | string
  publishedAt?: { seconds: number } | null
  createdAt?: { seconds: number } | null
  seoTitle?: string
  seoDescription?: string
  updatedAt?: { seconds: number } | null
}

function postSortKey(post: BlogPost): number {
  return post.publishedAt?.seconds ?? post.createdAt?.seconds ?? 0
}

export function isPublishedBlogPost(post: BlogPost): boolean {
  const status = String(post.status ?? '').toLowerCase()
  if (status === 'published') return true
  if (status === 'draft') return false
  // Legacy docs may only have publishedAt set
  return post.publishedAt != null
}

async function fetchPublishedPosts(limit?: number): Promise<BlogPost[]> {
  const snap = await getAdminDb().collection('blog_posts').orderBy('createdAt', 'desc').get()

  const posts = snap.docs
    .map((d) => docWithId(d.id, d.data() as Record<string, unknown>) as BlogPost)
    .filter(isPublishedBlogPost)
    .sort((a, b) => postSortKey(b) - postSortKey(a))

  return limit != null ? posts.slice(0, limit) : posts
}

export function getPublishedBlogPosts(limit?: number) {
  return unstable_cache(
    () => fetchPublishedPosts(limit),
    ['published-blog-posts-v2', String(limit ?? 'all')],
    {
      tags: [CACHE_TAGS.blog],
      revalidate: 300,
    }
  )()
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const snap = await getAdminDb()
    .collection('blog_posts')
    .where('slug', '==', slug)
    .limit(1)
    .get()

  if (snap.empty) return null
  const doc = snap.docs[0]
  const post = docWithId(doc.id, doc.data() as Record<string, unknown>) as BlogPost
  return isPublishedBlogPost(post) ? post : null
}
