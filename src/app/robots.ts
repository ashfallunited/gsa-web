import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'

const BLOCKED_PATHS = ['/admin/', '/api/']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Standard crawlers — full access to public content
      {
        userAgent: '*',
        allow: ['/'],
        disallow: BLOCKED_PATHS,
      },
      // AI training crawlers — allow public content, block private paths
      {
        userAgent: 'GPTBot',
        allow: ['/'],
        disallow: BLOCKED_PATHS,
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/'],
        disallow: BLOCKED_PATHS,
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/'],
        disallow: BLOCKED_PATHS,
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/'],
        disallow: BLOCKED_PATHS,
      },
      {
        userAgent: 'Applebot-Extended',
        allow: ['/'],
        disallow: BLOCKED_PATHS,
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/'],
        disallow: BLOCKED_PATHS,
      },
      {
        userAgent: 'Meta-ExternalAgent',
        allow: ['/'],
        disallow: BLOCKED_PATHS,
      },
      {
        userAgent: 'Bytespider',
        allow: ['/'],
        disallow: BLOCKED_PATHS,
      },
      // Archive bots — welcome for preservation
      {
        userAgent: 'ia_archiver',
        allow: ['/'],
        disallow: BLOCKED_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL.replace(/^https?:\/\//, ''),
  }
}
