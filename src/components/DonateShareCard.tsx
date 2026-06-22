'use client'

import { useCallback, useMemo, useState } from 'react'
import { Check, Copy, Link2, Share2 } from 'lucide-react'
import {
  buildDonationShareMessage,
  buildFacebookShareUrl,
  buildLinkedInShareUrl,
  buildTwitterShareUrl,
  buildWhatsAppShareUrl,
  getDonatePageUrl,
  type DonationShareOptions,
  type DonationShareVariant,
} from '@/lib/donation-share'

type Props = {
  variant: DonationShareVariant
  options?: DonationShareOptions
  className?: string
}

const headings: Record<DonationShareVariant, { title: string; subtitle: string }> = {
  completed: {
    title: 'Share your gift',
    subtitle: 'Inspire friends and family to support youth in Monrovia.',
  },
  invite: {
    title: 'Share the mission',
    subtitle: 'Anyone can help — spread the word even if you have not donated yet.',
  },
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default function DonateShareCard({ variant, options, className = '' }: Props) {
  const [copied, setCopied] = useState(false)
  const [donateUrl] = useState(() =>
    typeof window !== 'undefined' ? getDonatePageUrl() : '/donate'
  )
  const [canNativeShare] = useState(() =>
    typeof window !== 'undefined' && typeof navigator.share === 'function'
  )

  const message = useMemo(
    () => buildDonationShareMessage(variant, donateUrl, options),
    [variant, donateUrl, options]
  )

  const copyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      /* clipboard unavailable */
    }
  }, [message])

  const shareNative = useCallback(async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: headings[variant].title,
        text: message,
        url: donateUrl,
      })
    } catch {
      /* user cancelled */
    }
  }, [variant, message, donateUrl])

  const { title, subtitle } = headings[variant]
  const shareBtn =
    'inline-flex items-center justify-center gap-2 border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-[#01255f] hover:bg-[#f5f7fc] hover:border-[#01255f]/30 transition-colors min-h-[44px] w-full sm:w-auto'

  return (
    <div className={`bg-white border border-gray-100 p-4 sm:p-6 lg:p-8 min-w-0 ${className}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-[#01255f] flex items-center justify-center shrink-0">
          <Share2 className="w-5 h-5 text-[#fee11b]" />
        </div>
        <div>
          <h3
            className="text-base font-bold text-[#01255f]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {title}
          </h3>
          <p className="text-xs text-[#5a6478] mt-1 leading-relaxed">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-4">
        <button type="button" onClick={copyMessage} className={shareBtn}>
          {copied ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy message'}
        </button>
        <a
          href={buildTwitterShareUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
          className={shareBtn}
        >
          <XIcon className="w-4 h-4" />
          Post on X
        </a>
        <a
          href={buildWhatsAppShareUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
          className={shareBtn}
        >
          WhatsApp
        </a>
        <a
          href={buildFacebookShareUrl(donateUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className={shareBtn}
          title="Facebook opens the donate page link"
        >
          Facebook
        </a>
        <a
          href={buildLinkedInShareUrl(donateUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className={shareBtn}
        >
          LinkedIn
        </a>
        {canNativeShare && (
          <button type="button" onClick={shareNative} className={shareBtn}>
            <Link2 className="w-4 h-4" />
            More options
          </button>
        )}
      </div>

      <p className="text-[10px] text-[#5a6478] leading-relaxed">
        X and WhatsApp include your full message. Facebook and LinkedIn share the donate page link — paste the copied
        message into your post for the full story.
      </p>
    </div>
  )
}
