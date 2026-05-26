import type { Metadata } from 'next'
import { ORG_NAME } from '@/lib/constants'

type SocialImage = {
  readonly url: string
  readonly alt: string
  readonly width?: number
  readonly height?: number
}

type PageSocialMetadataOptions = {
  /** Document title segment (layout template adds `| ${ORG_NAME}`). */
  readonly title: string
  /** Marketing title for OG/Twitter (defaults to title + site name). */
  readonly openGraphTitle?: string
  readonly description: string
  readonly path: string
  readonly image: SocialImage
}

export function buildPageSocialMetadata(options: PageSocialMetadataOptions): Metadata {
  const { title, description, path, image, openGraphTitle = `${title} | ${ORG_NAME}` } = options

  const ogTitle = openGraphTitle
  const imageEntry = {
    url: image.url,
    width: image.width ?? 1200,
    height: image.height ?? 630,
    alt: image.alt,
    type: 'image/jpeg' as const,
  }

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: path,
      siteName: ORG_NAME,
      locale: 'en_GB',
      title: ogTitle,
      description,
      images: [imageEntry],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [image.url],
    },
  }
}
