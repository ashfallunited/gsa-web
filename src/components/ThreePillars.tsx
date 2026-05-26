'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { STATIC_ASSETS } from '@/lib/constants'

const pillars = [
  {
    id: 'sport',
    index: '01',
    label: 'Sport & Development',
    description:
      'We provide structured, coached sport programmes to youth across Monrovia. Our coaches are trained in positive youth development — using the pitch as a space for discipline, teamwork, and self-belief.',
    features: [
      'Trained coaches across multiple community sites',
      'Multi-sport approach: football, athletics, and more',
      'Talent pathway to regional and national competitions',
      'Sports psychology and mental resilience sessions',
      'Structured league and tournament calendar',
    ],
    image: STATIC_ASSETS.pillars.impact11,
    imageAlt: 'Youth football training session',
  },
  {
    id: 'health',
    index: '02',
    label: 'Health & Wellbeing',
    description:
      'Many of our participants lack access to basic healthcare. Asfall United integrates health services directly into our programmes — so every young person receives a medical check-up, nutritional guidance, and mental health support.',
    features: [
      'Regular medical screenings for all participants',
      'Nutrition education and supplemental feeding',
      'Mental health first aid and counselling referrals',
      'Physiotherapy and injury prevention training',
      'Hygiene and preventive health education',
    ],
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=85',
    imageAlt: 'Health and wellness programme',
  },
  {
    id: 'education',
    index: '03',
    label: 'Education & Opportunity',
    description:
      'Sport brings young people in — education gives them a future. We work with schools, tutors, and scholarship partners to keep every participant learning and opening doors to wider opportunity.',
    features: [
      'Academic support and after-school homework clubs',
      'School re-enrolment for out-of-school youth',
      'Scholarship pathways for high performers',
      'Employability and life skills workshops',
      'Mentorship from Liberian professionals',
    ],
    image: STATIC_ASSETS.pillars.impact4,
    imageAlt: 'Education and learning programme',
  },
]

export default function ThreePillars() {
  const [active, setActive] = useState('sport')
  const current = pillars.find((p) => p.id === active)!

  return (
    <section id="model" className="bg-[#f5f7fc]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-12">
        <span className="label">Our Model</span>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <h2
            className="heading-underline text-3xl sm:text-4xl lg:text-[2.6rem] font-bold text-[#01255f] leading-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Three Pillars of Impact
          </h2>
          <p className="text-[#5a6478] text-sm max-w-xs leading-relaxed sm:text-right">
            Each pillar works together. Sport earns trust, health builds foundations, education opens futures.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200 gap-0">
          {pillars.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              className={`flex-shrink-0 flex items-center gap-2.5 px-5 sm:px-8 py-4 text-xs sm:text-sm font-bold tracking-wide transition-all border-b-2 -mb-px whitespace-nowrap ${
                active === p.id
                  ? 'border-[#fee11b] text-[#01255f] bg-white'
                  : 'border-transparent text-[#5a6478] hover:text-[#01255f] bg-transparent'
              }`}
            >
              <span
                className={`text-[10px] font-bold ${active === p.id ? 'text-[#fee11b]' : 'text-gray-300'}`}
              >
                {p.index}
              </span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div
        key={active}
        className="max-w-7xl mx-auto fade-in-up"
      >
        <div className="grid lg:grid-cols-[55%_45%]">

          <div className="relative h-64 sm:h-80 lg:h-[520px] overflow-hidden">
            <Image
              src={current.image}
              alt={current.imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 55vw"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-5 left-6">
              <span className="bg-[#fee11b] text-[#01255f] text-[10px] font-black uppercase tracking-widest px-3 py-1">
                {current.index} — {current.label}
              </span>
            </div>
          </div>

          <div className="bg-white px-6 sm:px-10 lg:px-12 py-10 lg:py-14 flex flex-col justify-center">
            <h3
              className="text-xl sm:text-2xl font-bold text-[#01255f] mb-4 leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {current.label}
            </h3>
            <p className="text-[#5a6478] text-sm leading-relaxed mb-8">
              {current.description}
            </p>

            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#5a6478] mb-4">
                What This Includes
              </p>
              <ul className="space-y-3">
                {current.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#0d0d0d]">
                    <span className="flex-shrink-0 w-5 h-5 bg-[#01255f] flex items-center justify-center text-[#fee11b] font-bold text-[9px] mt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/get-involved"
              className="self-start inline-flex items-center justify-center bg-[#01255f] hover:bg-[#011840] text-white px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors min-h-0 min-w-0"
            >
              Partner With Us
            </Link>
          </div>
        </div>
      </div>

      <div className="pb-24 lg:pb-32" />
    </section>
  )
}
