import Image from 'next/image'
import Link from 'next/link'
import { STATIC_ASSETS } from '@/lib/constants'

const pillars = [
  {
    label: 'Sport & Development',
    description:
      'We provide structured, coached sport programmes to youth across Monrovia. Our coaches are trained in positive youth development — using the pitch as a space for discipline, teamwork, and self-belief.',
    image: 'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/Sameandkolleh.jpg',
    imageAlt: 'Youth football training session',
  },
  {
    label: 'Health & Wellbeing',
    description:
      'Many of our participants lack access to basic healthcare. Ashfall United integrates health services directly into our programmes — so every young person receives a medical check-up, nutritional guidance, and mental health support.',
    image: STATIC_ASSETS.liberia.wellbeing,
    imageAlt: 'Health and wellbeing programme',
  },
  {
    label: 'Education & Opportunity',
    description:
      'Sport brings young people in and education gives them a future. We work with schools, tutors, and scholarship partners to keep every participant learning and opening doors to wider opportunity.',
    image: STATIC_ASSETS.pillars.impact4,
    imageAlt: 'Education and opportunity programme',
  },
]

export default function ThreePillars() {
  return (
    <section id="model" className="bg-[#f5f7fc] py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="mb-8 lg:mb-10">
          <span className="label">Our Model</span>
          <h2
            className="heading-underline text-3xl sm:text-4xl lg:text-[2.6rem] font-bold text-[#01255f] leading-tight mt-3"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Three Pillars of Impact
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-7">
          {pillars.map((pillar) => (
            <div key={pillar.label} className="bg-white rounded-2xl overflow-hidden flex flex-col">
              <div className="relative h-64 sm:h-72 lg:h-80 overflow-hidden shrink-0">
                <Image
                  src={pillar.image}
                  alt={pillar.imageAlt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>
              <div className="p-6 sm:p-7 flex flex-col flex-1">
                <h3
                  className="text-xl font-bold text-[#01255f] mb-3"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {pillar.label}
                </h3>
                <p className="text-[#5a6478] text-sm leading-relaxed flex-1">
                  {pillar.description}
                </p>
                <Link
                  href="/get-involved"
                  className="mt-6 self-start inline-flex items-center gap-2 bg-[#01255f] hover:bg-[#011840] text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Partner With Us
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
