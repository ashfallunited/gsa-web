export const revalidate = 600

import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getBoardMembers } from '@/lib/data/board'
import { getManagementStaff } from '@/lib/data/team'
import { IMAGE_PLACEHOLDER } from '@/lib/constants'
import { loadPublicData } from '@/lib/public-data'

import { buildPageMetadata, SEO_KEYWORDS } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Management',
  description:
    'Meet the board, management, and coaching staff leading Asfall United programmes in Monrovia, Liberia.',
  path: '/team/management',
  keywords: SEO_KEYWORDS.team,
})

function MemberCard({
  person,
}: {
  person: { id: string; name: string; role?: string; image?: string }
}) {
  return (
    <div className="bg-white border border-gray-100 overflow-hidden group">
      <div className="relative h-64 bg-[#e2e8f0]">
        <Image
          src={person.image || IMAGE_PLACEHOLDER}
          alt={person.name}
          fill
          className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
      </div>
      <div className="p-5">
        <h3
          className="font-bold text-[#01255f] text-base"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {person.name}
        </h3>
        {person.role && (
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mt-1">
            {person.role}
          </p>
        )}
      </div>
    </div>
  )
}

export default async function ManagementPage() {
  const [staff, board] = await Promise.all([
    loadPublicData('management-staff', () => getManagementStaff(), []),
    loadPublicData('board-members', () => getBoardMembers(), []),
  ])

  const hasStaff = staff.length > 0
  const hasBoard = board.length > 0

  return (
    <>
      <Navbar />
      <main className="pt-16 lg:pt-[70px]">
        <div className="bg-[#01255f] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
            <span className="label-light">Our Club</span>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-4 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Management
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-lg">
              The leadership team guiding Asfall United on and off the pitch.
            </p>
          </div>
        </div>

        <div className="bg-[#f5f7fc] py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 space-y-16 sm:space-y-20">
            {!hasStaff && !hasBoard ? (
              <p className="text-center text-[#5a6478] text-sm py-12">Staff profiles coming soon.</p>
            ) : (
              <>
                {hasStaff && (
                  <section>
                    <h2
                      className="text-xl sm:text-2xl font-bold text-[#01255f] mb-8"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Coaching &amp; staff
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {staff.map((person) => (
                        <MemberCard key={person.id} person={person} />
                      ))}
                    </div>
                  </section>
                )}

                {hasBoard && (
                  <section>
                    <h2
                      className="text-xl sm:text-2xl font-bold text-[#01255f] mb-8"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Board of directors
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {board.map((person) => (
                        <MemberCard key={person.id} person={person} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
