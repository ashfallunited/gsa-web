import Image from 'next/image'
import Link from 'next/link'
import { ORG_EMAIL, ORG_FACEBOOK, ORG_INSTAGRAM, ORG_NAME } from '@/lib/constants'

const footerSections = [
  {
    title: 'Organisation',
    links: [
      { label: 'Who we are', href: '/#about' },
      { label: 'Our Model', href: '/#model' },
      { label: 'Impact', href: '/#impact' },
      { label: 'Annual Report', href: '#' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'Partners', href: '/#partners' },
      { label: 'Get Involved', href: '/get-involved' },
      { label: 'Contact', href: '/#contact' },
      { label: 'Newsletter', href: '/#contact' },
    ],
  },
] as const

const socials = [
  {
    label: 'Instagram',
    href: ORG_INSTAGRAM,
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: ORG_FACEBOOK,
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z" />
      </svg>
    ),
  },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#011840] text-white">
      <div className="border-b border-white/8">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 py-12 sm:py-16">
          <div className="grid grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] gap-8 sm:gap-10">

            <div className="col-span-2 lg:col-span-1">
              <div className="relative h-10 w-44 mb-5">
                <Image
                  src="/Logo.png"
                  alt={ORG_NAME}
                  fill
                  className="object-contain object-left"
                  sizes="176px"
                />
              </div>

              <p className="text-white/50 text-xs sm:text-sm leading-relaxed max-w-xs mb-6">
                Football club and youth development programmes in Monrovia, Liberia — on and off
                the pitch.
              </p>

              <div className="mb-4">
                <a
                  href={`mailto:${ORG_EMAIL}`}
                  className="text-[#fee11b] text-xs sm:text-sm hover:text-white transition-colors"
                >
                  {ORG_EMAIL}
                </a>
              </div>

              <div className="flex gap-2.5">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-9 h-9 border border-white/15 hover:border-[#fee11b] hover:text-[#fee11b] text-white/60 flex items-center justify-center transition-all duration-200 min-h-0 min-w-0"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {footerSections.map((section) => (
              <div key={section.title}>
                <h4 className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] font-bold text-[#fee11b] mb-4 sm:mb-5">
                  {section.title}
                </h4>
                <ul className="space-y-2.5 sm:space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-white/50 hover:text-white text-xs sm:text-sm transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-white/30 text-[11px] sm:text-xs text-center sm:text-left">
          &copy; {year} {ORG_NAME}. All rights reserved.
        </p>
        <div className="flex gap-4 sm:gap-6 flex-wrap justify-center">
          <Link href="/privacy" className="text-white/30 hover:text-white/60 text-[11px] sm:text-xs transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-white/30 hover:text-white/60 text-[11px] sm:text-xs transition-colors">
            Terms of Use
          </Link>
          <span className="text-white/30 text-[11px] sm:text-xs">Monrovia, Liberia</span>
        </div>
      </div>
    </footer>
  )
}
