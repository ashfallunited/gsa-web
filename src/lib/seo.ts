import type { Metadata } from 'next'
import {
  ORG_DESCRIPTION,
  ORG_EMAIL,
  ORG_FACEBOOK,
  ORG_INSTAGRAM,
  ORG_NAME,
  SITE_OG_IMAGE,
  SITE_PAGE_TITLE_SUFFIX,
  SITE_URL,
} from '@/lib/constants'
import type { BlogPost } from '@/lib/data/blog'

export type SeoImage = {
  readonly url: string
  readonly alt: string
  readonly width?: number
  readonly height?: number
}

export type BuildPageMetadataOptions = {
  /** Segment used with layout template → "{title} | Ashfall United" */
  readonly title: string
  readonly description: string
  /** Path only, e.g. `/blog` */
  readonly path: string
  readonly image?: SeoImage
  readonly openGraphType?: 'website' | 'article'
  /** Full OG/Twitter headline (defaults to "{title} | Ashfall United") */
  readonly openGraphTitle?: string
  readonly keywords?: readonly string[]
  readonly noIndex?: boolean
}

const DEFAULT_IMAGE: SeoImage = {
  url: SITE_OG_IMAGE,
  alt: `${ORG_NAME} — Monrovia, Liberia`,
  width: 1200,
  height: 630,
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}

/** Strip duplicate brand suffix when admin SEO title already includes it. */
export function normalizePageTitle(raw: string): string {
  return (
    raw
      .replace(/\s*\|\s*Ashfall United\s*$/i, '')
      .replace(/\s*\|\s*Ashfall United\s*$/i, '')
      .trim() || raw
  )
}

export function buildPageMetadata(options: BuildPageMetadataOptions): Metadata {
  const {
    title,
    description,
    path,
    image = DEFAULT_IMAGE,
    openGraphType = 'website',
    openGraphTitle,
    keywords,
    noIndex = false,
  } = options

  const canonical = absoluteUrl(path)
  const ogTitle = openGraphTitle ?? `${title} | ${SITE_PAGE_TITLE_SUFFIX}`

  return {
    title,
    description,
    ...(keywords && keywords.length > 0 ? { keywords: [...keywords] } : {}),
    alternates: { canonical },
    openGraph: {
      type: openGraphType,
      url: canonical,
      siteName: ORG_NAME,
      locale: 'en_GB',
      title: ogTitle,
      description,
      images: [
        {
          url: image.url,
          width: image.width ?? 1200,
          height: image.height ?? 630,
          alt: image.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [image.url],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  }
}

export function buildWebSiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ORG_NAME,
    url: SITE_URL,
    description: ORG_DESCRIPTION,
    inLanguage: 'en-GB',
    publisher: {
      '@type': 'SportsTeam',
      name: ORG_NAME,
      url: SITE_URL,
    },
  }
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': ['SportsTeam', 'SportsOrganization', 'LocalBusiness'],
    name: ORG_NAME,
    alternateName: 'Ashfall United FC',
    sport: 'Soccer',
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/Logo.png'),
      width: 400,
      height: 120,
    },
    image: absoluteUrl('/Logo.png'),
    description: ORG_DESCRIPTION,
    foundingDate: '2019',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Monrovia',
      addressLocality: 'Monrovia',
      addressRegion: 'Montserrado County',
      addressCountry: 'LR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 6.3005,
      longitude: -10.7969,
    },
    areaServed: {
      '@type': 'City',
      name: 'Monrovia',
    },
    email: ORG_EMAIL,
    contactPoint: {
      '@type': 'ContactPoint',
      email: ORG_EMAIL,
      contactType: 'customer support',
      availableLanguage: ['English'],
    },
    sameAs: [ORG_INSTAGRAM, ORG_FACEBOOK],
    keywords: 'football club Liberia, youth football Monrovia, sport for development Liberia, Ashfall United',
  }
}

export function buildBlogIndexJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${ORG_NAME} News`,
    description: 'Stories and updates from Ashfall United programmes in Liberia.',
    url: absoluteUrl('/blog'),
    publisher: {
      '@type': 'SportsTeam',
      name: ORG_NAME,
      url: SITE_URL,
    },
  }
}

export function buildBlogPostingJsonLd(post: BlogPost): Record<string, unknown> {
  const published = post.publishedAt?.seconds ?? post.createdAt?.seconds
  const modified = post.updatedAt?.seconds ?? post.publishedAt?.seconds ?? post.createdAt?.seconds

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    url: absoluteUrl(`/blog/${post.slug}`),
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    image: post.featuredImage ? [post.featuredImage] : [SITE_OG_IMAGE],
    author: post.author
      ? { '@type': 'Person', name: post.author }
      : { '@type': 'Organization', name: ORG_NAME },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/Logo.png') },
    },
  }

  if (published) data.datePublished = new Date(published * 1000).toISOString()
  if (modified) data.dateModified = new Date(modified * 1000).toISOString()
  if (post.tags?.[0]) data.articleSection = post.tags[0]
  if (post.tags?.length) data.keywords = post.tags.join(', ')

  return data
}

export const SEO_KEYWORDS = {
  core: [
    'Ashfall United',
    'football club Liberia',
    'youth football Monrovia',
    'sport for development Liberia',
  ],
  donate: ['donate football Liberia', 'support youth Monrovia', 'charity football Liberia'],
  blog: ['Ashfall United news', 'Liberia football news', 'youth development stories'],
  shop: ['Ashfall United kit', 'Liberia football jersey', 'club shop Monrovia'],
  team: ['Ashfall United squad', 'Liberia first team football'],
  gallery: ['Ashfall United photos', 'Monrovia football gallery'],
  involved: ['volunteer football Liberia', 'partner youth development Monrovia'],
} as const
