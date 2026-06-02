import type { Metadata } from 'next'
import Image from 'next/image'
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
  W: { bg: 'bg-green-500', text: 'text-white', label: 'W' },
  D: { bg: 'bg-gray-400', text: 'text-white', label: 'D' },
  L: { bg: 'bg-red-500', text: 'text-white', label: 'L' },
} as const

const COMPETITION_BADGES: Record<string, string> = {
  LFA: '/LFA_logo.png',
  'LFA League': '/LFA_logo.png',
  'LFA Cup': '/LFA_logo.png',
  League: '/LFA_logo.png',
  Cup: '/LFA_logo.png',
}

function getBadge(competition: string): string | null {
  const key = Object.keys(COMPETITION_BADGES).find((k) =>
    competition.toLowerCase().includes(k.toLowerCase())
  )
  return key ? COMPETITION_BADGES[key] : null
}

function ShieldPlaceholder({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <path d="M20 2L4 8V22C4 33 20 46 20 46C20 46 36 33 36 22V8L20 2Z" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5" />
      <text x="20" y="30" textAnchor="middle" fontSize="12" fontWeight="700" fill="#9ca3af">FC</text>
    </svg>
  )
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return {
    day: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    full: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

function ResultRow({ match }: { match: PublicMatch }) {
  const { day, date } = formatDate(match.date)
  const badge = getBadge(match.competition)
  const rs = RESULT_STYLES[match.result!]

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group flex items-center gap-3 sm:gap-4 bg-white border border-gray-100 px-4 sm:px-6 py-4 hover:border-[#01255f]/20 hover:shadow-sm transition-all"
    >
      {/* Date + competition badge */}
      <div className="flex items-center gap-2 sm:gap-3 w-28 sm:w-36 shrink-0">
        <div className="hidden sm:flex flex-col items-center justify-center w-8">
          {badge ? (
            <Image src={badge} alt={match.competition} width={28} height={28} className="object-contain" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a6478]">{day}</p>
          <p className="text-xs font-bold text-[#01255f]">{date}</p>
          <p className="text-[10px] text-[#5a6478] truncate max-w-[80px] sm:max-w-none">{match.homeAway}</p>
        </div>
      </div>

      {/* Score + teams */}
      <div className="flex-1 flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Our shield */}
        <div className="hidden sm:block shrink-0">
          <Image src="/Logo.png" alt={ORG_NAME} width={36} height={36} className="object-contain" />
        </div>

        {/* Score block */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-medium hidden sm:block">{ORG_NAME}</p>
            <p className="text-2xl sm:text-3xl font-black text-[#01255f] tabular-nums leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
              {match.goalsFor}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1">
            {match.result && (
              <span className={`${rs.bg} ${rs.text} text-[9px] font-black px-1.5 py-0.5 leading-none`}>
                {rs.label}
              </span>
            )}
            <span className="text-gray-300 font-light text-lg">|</span>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-medium hidden sm:block truncate max-w-[120px]">{match.opponent}</p>
            <p className="text-2xl sm:text-3xl font-black text-[#5a6478] tabular-nums leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
              {match.goalsAgainst}
            </p>
          </div>
        </div>

        {/* Opponent shield + name */}
        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <ShieldPlaceholder size={36} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#01255f] truncate">{match.opponent}</p>
            <p className="text-[10px] text-[#5a6478]">{match.competition}</p>
          </div>
        </div>

        {/* Mobile: opponent name + competition */}
        <div className="sm:hidden min-w-0 flex-1">
          <p className="text-sm font-bold text-[#01255f] truncate">vs {match.opponent}</p>
          <p className="text-[10px] text-[#5a6478]">{match.competition}</p>
          {match.team !== 'first-team' && (
            <p className="text-[9px] font-bold text-[#fee11b] bg-[#01255f] px-1.5 py-0.5 inline-block mt-0.5">{displayTeamLabel(match.team)}</p>
          )}
        </div>
      </div>

      {/* Match Review button */}
      <div className="shrink-0">
        <span className="hidden sm:inline-flex items-center border-2 border-[#01255f] text-[#01255f] text-[10px] font-black uppercase tracking-widest px-4 py-2 group-hover:bg-[#01255f] group-hover:text-white transition-colors">
          Match Review
        </span>
        <span className="sm:hidden text-[#01255f]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  )
}

function FixtureRow({ match }: { match: Match }) {
  const { day, date } = formatDate(match.date)
  const badge = getBadge(match.competition)
  const daysUntil = Math.ceil(
    (new Date(`${match.date}T12:00:00Z`).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const isImminent = daysUntil >= 0 && daysUntil <= 7

  return (
    <div className={`flex items-center gap-3 sm:gap-4 bg-white border px-4 sm:px-6 py-4 transition-all ${isImminent ? 'border-[#fee11b] ring-1 ring-[#fee11b]/30' : 'border-gray-100'}`}>
      {/* Date + badge */}
      <div className="flex items-center gap-2 sm:gap-3 w-28 sm:w-36 shrink-0">
        <div className="hidden sm:flex flex-col items-center justify-center w-8">
          {badge ? (
            <Image src={badge} alt={match.competition} width={28} height={28} className="object-contain" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
            </svg>
          )}
        </div>
        <div>
          {isImminent && (
            <p className="text-[8px] font-black uppercase bg-[#fee11b] text-[#01255f] px-1.5 py-0.5 inline-block mb-0.5">
              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
            </p>
          )}
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a6478]">{day}</p>
          <p className="text-xs font-bold text-[#01255f]">{date}</p>
          <p className="text-[10px] text-[#5a6478]">{match.homeAway}</p>
        </div>
      </div>

      {/* Teams */}
      <div className="flex-1 flex items-center gap-2 sm:gap-4 min-w-0">
        <div className="hidden sm:block shrink-0">
          <Image src="/Logo.png" alt={ORG_NAME} width={36} height={36} className="object-contain" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-medium hidden sm:block">{ORG_NAME}</p>
            <p className="text-2xl sm:text-3xl font-black text-[#01255f] tabular-nums leading-none" style={{ fontFamily: 'var(--font-heading)' }}>—</p>
          </div>
          <span className="text-gray-300 font-light text-lg">|</span>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-medium hidden sm:block truncate max-w-[120px]">{match.opponent}</p>
            <p className="text-2xl sm:text-3xl font-black text-[#5a6478] tabular-nums leading-none" style={{ fontFamily: 'var(--font-heading)' }}>—</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <ShieldPlaceholder size={36} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#01255f] truncate">{match.opponent}</p>
            <p className="text-[10px] text-[#5a6478]">{match.competition}</p>
          </div>
        </div>

        <div className="sm:hidden min-w-0 flex-1">
          <p className="text-sm font-bold text-[#01255f] truncate">vs {match.opponent}</p>
          <p className="text-[10px] text-[#5a6478]">{match.competition}</p>
        </div>
      </div>

      <span className="shrink-0 hidden sm:inline-flex items-center border-2 border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 cursor-default">
        Upcoming
      </span>
    </div>
  )
}

function buildSportsEventJsonLd(results: PublicMatch[], fixtures: Match[]) {
  const events = [
    ...results.slice(0, 20).map((m) => ({
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
      url: `${SITE_URL}/matches/${m.id}`,
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
  return { '@context': 'https://schema.org', '@graph': events }
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
  const filteredResults = activeSeason ? results.filter((m) => m.season === activeSeason) : results
  const jsonLd = buildSportsEventJsonLd(results, fixtures)

  const w = filteredResults.filter((m) => m.result === 'W').length
  const d = filteredResults.filter((m) => m.result === 'D').length
  const l = filteredResults.filter((m) => m.result === 'L').length
  const gf = filteredResults.reduce((acc, m) => acc + m.goalsFor, 0)
  const ga = filteredResults.reduce((acc, m) => acc + m.goalsAgainst, 0)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main className="pt-16 lg:pt-[70px]">
        <div className="bg-[#01255f] py-10 sm:py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
            <span className="label-light">Ashfall United</span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-4 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
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
                <h2 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#01255f] mb-4">Upcoming Fixtures</h2>
                <div className="space-y-2">
                  {fixtures.map((m) => <FixtureRow key={m.id} match={m} />)}
                </div>
              </section>
            )}

            {/* Results */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#01255f]">Results</h2>
                {seasons.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    <Link href="/matches" className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-colors ${!activeSeason ? 'bg-[#01255f] text-white border-[#01255f]' : 'bg-white text-[#5a6478] border-gray-200 hover:border-[#01255f]'}`}>
                      All
                    </Link>
                    {seasons.map((s) => (
                      <Link key={s} href={`/matches?season=${encodeURIComponent(s)}`} className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-colors ${activeSeason === s ? 'bg-[#01255f] text-white border-[#01255f]' : 'bg-white text-[#5a6478] border-gray-200 hover:border-[#01255f]'}`}>
                        {s}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Season record strip */}
              {filteredResults.length > 0 && (
                <div className="grid grid-cols-5 gap-px bg-gray-200 mb-4">
                  {[
                    { label: 'P', value: filteredResults.length, color: 'text-[#01255f]' },
                    { label: 'W', value: w, color: 'text-green-600' },
                    { label: 'D', value: d, color: 'text-gray-500' },
                    { label: 'L', value: l, color: 'text-red-500' },
                    { label: 'GF–GA', value: `${gf}–${ga}`, color: 'text-[#01255f]' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white py-3 text-center">
                      <p className="text-[9px] uppercase tracking-widest text-[#5a6478] font-bold">{label}</p>
                      <p className={`text-lg font-black tabular-nums ${color}`} style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {filteredResults.length === 0 ? (
                <div className="bg-white border border-gray-100 p-10 text-center text-[#5a6478] text-sm">
                  No results recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredResults.map((m) => <ResultRow key={m.id} match={m} />)}
                </div>
              )}
            </section>

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
