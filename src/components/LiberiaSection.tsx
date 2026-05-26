import Image from 'next/image'
import { STATIC_ASSETS } from '@/lib/constants'

const facts = [
  { label: 'Population', value: '5.4M', sub: 'Liberia' },
  { label: 'Youth under 18', value: '44%', sub: 'Of the population' },
  { label: 'Capital', value: 'Monrovia', sub: 'Where we operate' },
  { label: 'Club presence', value: 'Since 2021', sub: 'And growing' },
]

const reasons = [
  {
    title: 'A Nation Rebuilding',
    body: "Liberia is rebuilding its institutions and social fabric following decades of conflict. Young people make up the majority of the population — and their futures are central to Liberia's recovery.",
  },
  {
    title: 'Sport is Deeply Rooted',
    body: 'Football is the most popular sport in Liberia, with communities organising informal games daily. Asfall United meets young people where they already are, turning that energy into structured opportunity.',
  },
  {
    title: 'Access Gaps are Acute',
    body: 'Many youth in Monrovia face high out-of-school rates, limited healthcare access, and narrow economic prospects. Asfall United targets these gaps directly, using sport as the bridge.',
  },
  {
    title: 'Strong Local Leadership',
    body: "Asfall United is Liberian-led. Our staff and coaches come from the communities we serve, ensuring the programme is grounded in local knowledge, culture, and trust.",
  },
]

export default function LiberiaSection() {
  const { liberia } = STATIC_ASSETS

  return (
    <section id="liberia" className="py-16 sm:py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
        <div className="mb-10 sm:mb-14">
          <span className="label">Where We Work</span>
          <h2
            className="heading-underline text-2xl sm:text-3xl lg:text-[2.4rem] font-bold text-[#01255f] leading-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Monrovia, Liberia
          </h2>
          <p className="mt-5 text-[#5a6478] text-sm sm:text-base max-w-xl">
            Asfall United is based in Monrovia — the capital and largest city of Liberia — where we deliver all of our current programmes.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 mb-14 sm:mb-20">
          {facts.map((f) => (
            <div key={f.label} className="bg-white p-5 sm:p-6">
              <div
                className="text-xl sm:text-2xl font-bold text-[#01255f] mb-0.5"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {f.value}
              </div>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] font-bold text-[#5a6478]">
                {f.label}
              </div>
              <div className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">{f.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="space-y-7 sm:space-y-8">
            {reasons.map((r, i) => (
              <div key={i} className="flex gap-4 sm:gap-5">
                <div className="flex-shrink-0 w-6 h-6 bg-[#fee11b] flex items-center justify-center text-[#01255f] font-bold text-[10px] mt-0.5 min-w-[24px]">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3
                    className="font-bold text-[#01255f] text-sm sm:text-base mb-1.5"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {r.title}
                  </h3>
                  <p className="text-[#5a6478] text-xs sm:text-sm leading-relaxed">{r.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative h-48 sm:h-60 overflow-hidden">
              <Image
                src={liberia.wellbeing}
                alt="Wellbeing programme"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
            <div className="relative h-48 sm:h-60 overflow-hidden mt-4 sm:mt-6">
              <Image
                src={liberia.psa}
                alt="Community programme"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
            <div className="relative h-36 sm:h-44 overflow-hidden">
              <Image
                src={liberia.psa1}
                alt="Health programme"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
            <div className="relative h-36 sm:h-44 overflow-hidden mt-3 sm:mt-4">
              <Image
                src={liberia.impact1}
                alt="Youth sport"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
