export const revalidate = 600

import PlayerGrid from '@/components/PlayerGrid'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getPlayersByTeam } from '@/lib/data/team'
import { mergePlayerStats } from '@/lib/data/team-stats-page'
import { getCachedPlayerSeasonStatsMap } from '@/lib/data/games'
import { loadPublicData } from '@/lib/public-data'

import { buildPageMetadata, SEO_KEYWORDS } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'First Team',
  description:
    'Meet the Asfall United first team — players, positions, and profiles from our senior squad in Monrovia, Liberia.',
  path: '/team/first-team',
  keywords: SEO_KEYWORDS.team,
})

export default async function FirstTeamPage() {
  const team = 'first-team'

  const [players, statsMap] = await Promise.all([
    loadPublicData('first-team-players', () => getPlayersByTeam(team), []),
    loadPublicData('first-team-stats-map', () => getCachedPlayerSeasonStatsMap(team), new Map()),
  ])

  const playersWithStats = mergePlayerStats(players, statsMap)

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
              First Team
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-lg">
              The senior squad representing Asfall United in competitive football.
            </p>
          </div>
        </div>

        <div className="bg-[#f5f7fc] py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
            <PlayerGrid players={playersWithStats} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
