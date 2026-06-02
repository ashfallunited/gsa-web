import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getPublicMatches, type PublicMatch } from '@/lib/data/games'
import { buildPageMetadata } from '@/lib/seo'
import { ORG_NAME, SITE_URL } from '@/lib/constants'
import { displayTeamLabel } from '@/lib/teams'
import { loadPublicData } from '@/lib/public-data'
import type { Match } from '@/lib/analytics/types'

export const metadata: Metadata = buildPageMetadata({
  title: 'Matches',
  openGraphTitle: `Matches & Fixtures — ${ORG_NAME}`,
  description:
    'Follow Ashfall United — view recent match results, upcoming fixtures, and full season records for our First Team and Academy.',
  path: '/matches',
  keywords: [
    'Ashfall United fixtures',
    'Ashfall United results',
    'Liberia football results',
    'Monrovia football fixtures',
    'Ashfall United scores',
    'youth football Liberia schedule',
  ],
})

const RESULT_STYLES = {
  W: 'bg-green-100 text-green-800',
  D: 'bg-gray-100 text-gray-700',
  L: 'bg-red-100 text-red-800',
} as const

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateShort(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function HomeAwayBadge({ homeAway }: { homeAway: string }) {
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${
      homeAway === 'home' ? 'bg-[#01255f]/10 text-[#01255f]' : 'bg-gray-100 text-gray-600'
    }`}>
      {homeAway === 'neutral' ? 'N' : homeAway === 'home' ? 'H' : 'A'}
    </span>
  )
}

function ResultCard({ match }: { match: PublicMatch }) {
  return (
    <div className="bg-white border border-gray-100 p-4 sm:p-5 hover:border-[#01255f]/20 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="shrink-0 text-center w-12 sm:w-14">
          <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold leading-tight">
            {formatDateShort(match.date).split(' ')[1]}
          </p>
          <p className="text-xl font-black text-[#01255f] leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
            {formatDateShort(match.date).split(' ')[0]}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <HomeAwayBadge homeAway={match.homeAway} />
            <span className="text-[10px] text-[#5a6478] uppercase tracking-wide font-medium">{match.competition}</span>
            {match.team !== 'first-team' && (
              <span className="text-[9px] bg-[#fee11b] text-[#01255f] px-1.5 py-0.5 font-bold uppercase tracking-wide">
                {displayTeamLabel(match.team)}
              </span>
            )}
          </div>
          <p className="font-bold text-[#01255f] text-base sm:text-lg leading-tight truncate" style={{ fontFamily: 'var(--font-heading)' }}>
            vs {match.opponent}
          </p>
          <p className="text-xs text-[#5a6478] mt-0.5">{match.season}</p>
        </div>

        <div className="shrink-0 text-right">
          {match.result && (
            <span className={`inline-block text-xs font-black px-2 py-0.5 mb-1.5 ${RESULT_STYLES[match.result]}`}>
              {match.result}
            </span>
          )}
          <p className="text-2xl font-black text-[#01255f] tabular-nums leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
            {match.goalsFor}–{match.goalsAgainst}
          </p>
        </div>
      </div>
    </div>
  )
}

function FixtureCard({ match }: { match: Match }) {
  const daysUntil = Math.ceil(
    (new Date(`${match.date}T12:00:00Z`).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const isThisWeek = daysUntil >= 0 && daysUntil <= 7

  return (
    <div className={`bg-white border p-4 sm:p-5 transition-all ${isThisWeek ? 'border-[#fee11b] ring-1 ring-[#fee11b]/40' : 'border-gray-100 hover:border-[#01255f]/20 hover:shadow-sm'}`}>
      {isThisWeek && (
        <p className="text-[9px] font-black uppercase tracking-widest text-[#01255f] bg-[#fee11b] px-2 py-0.5 inline-block mb-3">
          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
        </p>
      )}
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="shrink-0 text-center w-12 sm:w-14">
          <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold leading-tight">
            {formatDateShort(match.date).split(' ')[1]}
          </p>
          <p className="text-xl font-black text-[#01255f] leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
            {formatDateShort(match.date).split(' ')[0]}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <HomeAwayBadge homeAway={match.homeAway} />
            <span className="text-[10px] text-[#5a6478] uppercase tracking-wide font-medium">{match.competition}</span>
            {match.team !== 'first-team' && (
              <span className="text-[9px] bg-[#fee11b] text-[#01255f] px-1.5 py-0.5 font-bold uppercase tracking-wide">
                {displayTeamLabel(match.team)}
              </span>
            )}
          </div>
          <p className="font-bold text-[#01255f] text-base sm:text-lg leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            vs {match.opponent}
          </p>
          <p className="text-xs text-[#5a6478] mt-0.5">{match.season}</p>
        </div>

        <div className="shrink-0 text-center">
          <div className="w-12 h-12 border-2 border-dashed border-gray-200 flex items-center justify-center">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">TBD</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function buildSportsEventJsonLd(matches: PublicMatch[], fixtures: Match[]) {
  const events = [
    ...matches.slice(0, 20).map((m) => ({
      '@type': 'SportsEvent',
      name: `Ashfall United vs ${m.opponent}`,
      startDate: m.date,
      location: { '@type': 'Place', name: 'Monrovia, Liberia' },
      description: `${m.competition} — ${m.season}. Result: ${m.goalsFor}–${m.goalsAgainst} (${m.result}).`,
      eventStatus: 'https://schema.org/EventCompleted',
      competitor: [
        { '@type': 'SportsTeam', name: ORG_NAME },
        { '@type': 'SportsTeam', name: m.opponent },
      ],
      organizer: { '@type': 'Organization', name: ORG_NAME, url: SITE_URL },
      url: `${SITE_URL}/matches`,
    })),
    ...fixtures.map((m) => ({
      '@type': 'SportsEvent',
      name: `Ashfall United vs ${m.opponent}`,
      startDate: m.date,
      location: { '@type': 'Place', name: 'Monrovia, Liberia' },
      description: `${m.competition} — ${m.season}. Upcoming fixture.`,
      eventStatus: 'https://schema.org/EventScheduled',
      competitor: [
        { '@type': 'SportsTeam', name: ORG_NAME },
        { '@type': 'SportsTeam', name: m.opponent },
      ],
      organizer: { '@type': 'Organization', name: ORG_NAME, url: SITE_URL },
      url: `${SITE_URL}/matches`,
    })),
  ]

  return {
    '@context': 'https://schema.org',
    '@graph': events,
  }
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>
}) {
  const { season: seasonParam } = await searchParams

  const { results, fixtures, seasons } = await loadPublicData(
    'public-matches',
    () => getPublicMatches(),
    { results: [], fixtures: [], seasons: [] }
  )

  const activeSeason = seasonParam && seasons.includes(seasonParam) ? seasonParam : ''
  const filteredResults = activeSeason
    ? results.filter((m) => m.season === activeSeason)
    : results

  const jsonLd = buildSportsEventJsonLd(results, fixtures)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="pt-16 lg:pt-[70px]">
        {/* Page header */}
        <div className="bg-[#01255f] py-10 sm:py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
            <span className="label-light">Ashfall United</span>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-4 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Matches
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-xl">
              Results, fixtures, and season records for the First Team and Academy.
            </p>
          </div>
        </div>

        <div className="bg-[#f5f7fc] py-10 sm:py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 space-y-12 sm:space-y-16">

            {/* Upcoming fixtures */}
            {fixtures.length > 0 && (
              <section>
                <h2
                  className="text-xl sm:text-2xl font-black text-[#01255f] mb-6"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Upcoming Fixtures
                </h2>
                <div className="space-y-3">
                  {fixtures.map((m) => (
                    <FixtureCard key={m.id} match={m} />
                  ))}
                </div>
              </section>
            )}

            {/* Results */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2
                  className="text-xl sm:text-2xl font-black text-[#01255f]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Results
                </h2>

                {seasons.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/matches"
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                        !activeSeason
                          ? 'bg-[#01255f] text-white border-[#01255f]'
                          : 'bg-white text-[#5a6478] border-gray-200 hover:border-[#01255f]'
                      }`}
                    >
                      All
                    </Link>
                    {seasons.map((s) => (
                      <Link
                        key={s}
                        href={`/matches?season=${encodeURIComponent(s)}`}
                        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                          activeSeason === s
                            ? 'bg-[#01255f] text-white border-[#01255f]'
                            : 'bg-white text-[#5a6478] border-gray-200 hover:border-[#01255f]'
                        }`}
                      >
                        {s}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Season record strip */}
              {filteredResults.length > 0 && (() => {
                const w = filteredResults.filter((m) => m.result === 'W').length
                const d = filteredResults.filter((m) => m.result === 'D').length
                const l = filteredResults.filter((m) => m.result === 'L').length
                const gf = filteredResults.reduce((acc, m) => acc + m.goalsFor, 0)
                const ga = filteredResults.reduce((acc, m) => acc + m.goalsAgainst, 0)
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-gray-200 mb-6 text-center">
                    {[
                      { label: 'Played', value: filteredResults.length },
                      { label: 'Won', value: w },
                      { label: 'Drawn', value: d },
                      { label: 'Lost', value: l },
                      { label: 'Goals', value: `${gf}–${ga}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white py-3 px-4">
                        <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold">{label}</p>
                        <p className="text-xl font-black text-[#01255f] tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {filteredResults.length === 0 ? (
                <div className="bg-white border border-gray-100 p-10 text-center text-[#5a6478] text-sm">
                  No results recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredResults.map((m) => (
                    <ResultCard key={m.id} match={m} />
                  ))}
                </div>
              )}
            </section>

            {/* No fixtures or results at all */}
            {fixtures.length === 0 && results.length === 0 && (
              <div className="bg-white border border-gray-100 p-10 text-center text-[#5a6478] text-sm">
                No matches to display yet. Check back soon.
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
