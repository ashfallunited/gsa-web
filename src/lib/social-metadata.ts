import type { Metadata } from 'next'
import { buildPageMetadata, type BuildPageMetadataOptions } from '@/lib/seo'

/** @deprecated Prefer `buildPageMetadata` from `@/lib/seo`. */
export function buildPageSocialMetadata(options: BuildPageMetadataOptions): Metadata {
  return buildPageMetadata(options)
}
