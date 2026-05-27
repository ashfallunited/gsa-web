import { getPartners } from '@/lib/data/partners'
import { getAmbassadors } from '@/lib/data/ambassadors'
import { loadPublicData } from '@/lib/public-data'
import PartnerMarquee from '@/components/PartnerMarquee'

export default async function Partners() {
  const [partners, ambassadors] = await Promise.all([
    loadPublicData('partners', () => getPartners(), []),
    loadPublicData('ambassadors', () => getAmbassadors(), []),
  ])

  return (
    <section id="partners" className="py-12 sm:py-16 lg:py-20 bg-[#f5f7fc]">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
        <div className="mb-7 sm:mb-10">
          <span className="label">Our Network</span>
          <h2
            className="heading-underline text-2xl sm:text-3xl lg:text-[2.4rem] font-bold text-[#01255f] leading-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Partners & Supporters
          </h2>
          <p className="mt-5 text-[#5a6478] text-sm sm:text-base max-w-xl">
            We work alongside governments, international organisations, and local institutions to deliver lasting impact.
          </p>
        </div>

        <PartnerMarquee partners={partners} />

        {ambassadors.length > 0 && (
          <div className="grid lg:grid-cols-[1fr_2fr] gap-10 lg:gap-12 items-start">
            <div>
              <span className="label">Ambassadors</span>
              <h3
                className="text-xl sm:text-2xl font-bold text-[#01255f] mt-2 mb-4"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Champions of
                <br />
                Our Cause
              </h3>
              <p className="text-[#5a6478] text-sm leading-relaxed">
                Athletes who use their platform to raise awareness, inspire youth, and champion our mission.
              </p>
            </div>

            <div className={`grid gap-4 sm:gap-6 ${ambassadors.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {ambassadors.map((a) => (
                <div key={a.id} className="group">
                  <div className="relative h-44 sm:h-56 overflow-hidden mb-3">
                    {a.image ? (
                      <img
                        src={a.image}
                        alt={a.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#01255f]/10 flex items-center justify-center text-[#01255f] text-3xl font-bold">
                        {a.name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-[#01255f]/0 group-hover:bg-[#01255f]/20 transition-colors" />
                  </div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] font-bold text-[#fee11b] bg-[#01255f] inline-block px-2 py-0.5 mb-1.5">
                    {a.title}
                    {a.sport ? ` · ${a.sport}` : ''}
                  </div>
                  <h4 className="font-bold text-[#01255f] text-xs sm:text-sm leading-tight">{a.name}</h4>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
