'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { ORG_NAME, STATIC_ASSETS } from '@/lib/constants'

export default function Hero() {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    requestAnimationFrame(() => el.classList.add('fade-in-up'))
  }, [])

  return (
    <section id="hero" className="relative min-h-[70svh] sm:min-h-[100svh] flex items-center">
      <div className="absolute inset-0">
        <Image
          src={STATIC_ASSETS.hero}
          alt={`${ORG_NAME} community programme`}
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>
      <div className="hero-overlay absolute inset-0" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 pt-20 sm:pt-24 pb-16">
        <div ref={contentRef} className="max-w-xl opacity-0">
          <h1
            className="text-white text-[1.85rem] xs:text-[2.1rem] sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-5 sm:mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            <span className="block whitespace-nowrap">Sport as a Path</span>
            <span className="block text-[#fee11b] whitespace-nowrap">to a Better Life.</span>
          </h1>

          <p className="text-white/75 text-sm sm:text-base leading-relaxed mb-8 sm:mb-10">
            We use sport to unlock opportunity — connecting youth to education, and a future they can build for
            themselves.
          </p>

          <div className="flex flex-col xs:flex-row gap-3 sm:gap-4">
            <a
              href="#about"
              className="bg-[#fee11b] hover:bg-[#e5ca10] active:scale-95 text-[#01255f] px-6 sm:px-7 py-3.5 font-bold text-sm tracking-wide transition-all w-full xs:w-auto text-center inline-flex items-center justify-center min-h-0 min-w-0"
            >
              Our Mission
            </a>
            <Link
              href="/donate"
              className="border border-white/30 hover:border-white active:scale-95 text-white px-6 sm:px-7 py-3.5 font-medium text-sm tracking-wide transition-all w-full xs:w-auto text-center"
            >
              Donate
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-[#fee11b]/30" />
    </section>
  )
}
