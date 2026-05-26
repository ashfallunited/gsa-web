'use client'

import { useMemo, useState } from 'react'
import type { Partner } from '@/lib/data/partners'

type PartnerMarqueeProps = {
  partners: readonly Partner[]
}

function PartnerLogoCell({ partner }: { partner: Partner }) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(partner.logo?.trim()) && !failed

  const content = (
    <div
      className="flex h-24 w-44 shrink-0 items-center justify-center rounded-sm border border-gray-200/80 bg-white px-5 transition-colors hover:border-[#01255f]/20 hover:bg-white"
      title={partner.name}
    >
      {showImage ? (
        <img
          src={partner.logo}
          alt={partner.name}
          className="max-h-14 max-w-[7.5rem] w-auto object-contain object-center"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="line-clamp-2 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-[#01255f]/50"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {partner.name}
        </span>
      )}
    </div>
  )

  if (partner.url?.trim()) {
    return (
      <a
        href={partner.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01255f]"
        aria-label={`${partner.name} (opens in new tab)`}
      >
        {content}
      </a>
    )
  }

  return <div className="shrink-0">{content}</div>
}

export default function PartnerMarquee({ partners }: PartnerMarqueeProps) {
  const track = useMemo(() => [...partners, ...partners], [partners])

  const durationSeconds = Math.max(partners.length * 7, 28)

  if (partners.length === 0) return null

  return (
    <div
      className="partner-marquee group relative mb-16 sm:mb-20"
      aria-label="Partner organisations"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-20 bg-gradient-to-r from-[#f5f7fc] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-20 bg-gradient-to-l from-[#f5f7fc] to-transparent"
        aria-hidden
      />

      <div className="overflow-hidden py-1">
        <div
          className="partner-marquee-track flex w-max items-center gap-6 sm:gap-8"
          style={{ ['--marquee-duration' as string]: `${durationSeconds}s` }}
        >
          {track.map((partner, index) => (
            <PartnerLogoCell key={`${partner.id}-${index}`} partner={partner} />
          ))}
        </div>
      </div>
    </div>
  )
}
