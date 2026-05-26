'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { STATIC_ASSETS } from '@/lib/constants'

const stats = [
  { number: '5,000+', label: 'Youth reached' },
  { number: '3', label: 'Core programmes' },
  { number: '4+', label: 'Years operating' },
]

export default function About() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.querySelectorAll<HTMLElement>('.reveal').forEach((child, i) => {
            setTimeout(() => child.classList.add('fade-in-up'), i * 120)
          })
        }
      },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section id="about" className="py-16 sm:py-24 lg:py-32 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-24 items-center">

          <div>
            <span className="label reveal opacity-0">Who We Are</span>
            <h2
              className="reveal opacity-0 heading-underline text-2xl sm:text-3xl lg:text-[2.4rem] font-bold text-[#01255f] leading-tight mb-7"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Sport as a Tool
              <br />for Social Change
            </h2>
            <p className="reveal opacity-0 text-[#5a6478] text-sm sm:text-base leading-relaxed mb-4">
              We work with young people from marginalized communities, using sport
              as the entry point to a broader ecosystem of support — education,
              healthcare, mentorship, and economic opportunity.
            </p>
            <p className="reveal opacity-0 text-[#5a6478] text-sm sm:text-base leading-relaxed mb-10">
              In four years, we have reached over 5,000 young people across
              Monrovia. Our model is built on the belief that talent is everywhere —
              what is scarce is access. We exist to close that gap.
            </p>

            <div className="reveal opacity-0 grid grid-cols-3 gap-3 sm:gap-4 border-t border-gray-100 pt-7">
              {stats.map((s) => (
                <div key={s.label}>
                  <div
                    className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#01255f] mb-1"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {s.number}
                  </div>
                  <div className="text-[9px] sm:text-[11px] uppercase tracking-widest text-[#5a6478] font-semibold leading-snug">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal opacity-0 hidden sm:grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <div className="relative h-40 sm:h-44 overflow-hidden">
                <Image
                  src={STATIC_ASSETS.about.rep}
                  alt="Youth training"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
              <div className="relative h-56 sm:h-60 overflow-hidden">
                <Image
                  src={STATIC_ASSETS.about.psa3}
                  alt="Sports academy"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
            </div>
            <div className="space-y-3 mt-8">
              <div className="relative h-56 sm:h-60 overflow-hidden">
                <Image
                  src={STATIC_ASSETS.about.psa1}
                  alt="Health programme"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
              <div className="relative h-40 sm:h-44 overflow-hidden">
                <Image
                  src={STATIC_ASSETS.about.development}
                  alt="Education support"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
            </div>
          </div>

          <div className="reveal opacity-0 sm:hidden relative h-52 overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80"
              alt="Asfall United youth programme"
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
