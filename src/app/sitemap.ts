import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'
import { getPublishedBlogPosts } from '@/lib/data/blog'

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
  { url: `${SITE_URL}/matches`, changeFrequency: 'weekly', priority: 0.9 },
  { url: `${SITE_URL}/blog`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${SITE_URL}/gallery`, changeFrequency: 'weekly', priority: 0.8 },
  { url: `${SITE_URL}/shop`, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${SITE_URL}/donate`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `${SITE_URL}/get-involved`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITE_URL}/team/first-team`, changeFrequency: 'monthly', priority: 0.6 },
  { url: `${SITE_URL}/team/academy`, changeFrequency: 'monthly', priority: 0.6 },
  { url: `${SITE_URL}/team/management`, changeFrequency: 'monthly', priority: 0.6 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  try {
    const posts = await getPublishedBlogPosts()
    const blogPages: MetadataRoute.Sitemap = posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.publishedAt?.seconds ? new Date(p.publishedAt.seconds * 1000) : now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }))
    return [...STATIC_ROUTES.map((r) => ({ ...r, lastModified: now })), ...blogPages]
  } catch {
    return STATIC_ROUTES.map((r) => ({ ...r, lastModified: now }))
  }
}
