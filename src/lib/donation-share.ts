import { ORG_NAME } from '@/lib/constants'

export type DonationShareVariant = 'completed' | 'invite'

export type DonationShareOptions = {
  readonly firstName?: string
  readonly amountFormatted?: string
}

export function getDonatePageUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (base) return `${base}/donate`
  if (typeof window !== 'undefined') return `${window.location.origin}/donate`
  return '/donate'
}

export function buildDonationShareMessage(
  variant: DonationShareVariant,
  donateUrl: string,
  options?: DonationShareOptions
): string {
  if (variant === 'completed') {
    const name = options?.firstName?.trim()
    const amount = options?.amountFormatted
    const giftLine = amount
      ? `I just donated ${amount} to ${ORG_NAME}`
      : `I just made a donation to ${ORG_NAME}`

    const who = name ? `${giftLine}, ${name} here.` : `${giftLine}.`
    return `${who} I'm helping young people in Liberia access football, education, and community programmes that create real opportunity. Every gift matters — join me and make an impact: ${donateUrl}`
  }

  return `Make an impact in the life of a young person in Liberia. ${ORG_NAME} brings together football, education, and wellbeing so youth can grow on and off the pitch. Donate today or share this link to spread the mission: ${donateUrl}`
}

export function buildTwitterShareUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}

export function buildLinkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
}
