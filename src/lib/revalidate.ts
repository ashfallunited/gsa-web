import { revalidateTag } from 'next/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'

const PROFILE = 'max' as const

export function revalidateGallery() {
  revalidateTag(CACHE_TAGS.gallery, PROFILE)
}

export function revalidateBlog() {
  revalidateTag(CACHE_TAGS.blog, PROFILE)
}

export function revalidatePartners() {
  revalidateTag(CACHE_TAGS.partners, PROFILE)
}

export function revalidateTeam() {
  revalidateTag(CACHE_TAGS.team, PROFILE)
}

export function revalidateShop() {
  revalidateTag(CACHE_TAGS.shop, PROFILE)
}

export function revalidateNewsletter() {
  revalidateTag(CACHE_TAGS.newsletter, PROFILE)
}

export function revalidateInquiries() {
  revalidateTag(CACHE_TAGS.inquiries, PROFILE)
}

export function revalidateGames() {
  revalidateTag(CACHE_TAGS.games, PROFILE)
}
