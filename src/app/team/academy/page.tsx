import PlayerGrid, { type Player } from '@/components/PlayerGrid'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getPlayersByTeam } from '@/lib/data/team'
import { loadPublicData } from '@/lib/public-data'
import { TEAM_SLUG, TEAM_LABELS } from '@/lib/teams'

const teamName = TEAM_LABELS[TEAM_SLUG.academy]

export const metadata = {
  title: `${teamName} | Asfall United`,
  description: `Meet the Asfall United ${teamName} squad.`,
}

export default async function AcademyPage() {
  const players = (await loadPublicData(
    'academy-players',
    () => getPlayersByTeam(TEAM_SLUG.academy),
    []
  )) as Player[]

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
              {teamName}
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-lg">
              Developing the next generation of talent through structured academy football.
            </p>
          </div>
        </div>

        <div className="bg-[#f5f7fc] py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
            <PlayerGrid players={players} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
