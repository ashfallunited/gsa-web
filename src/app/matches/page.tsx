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
  W: { bg: 'bg-green-500', label: 'W' },
  D: { bg: 'bg-gray-400', label: 'D' },
  L: { bg: 'bg-red-500', label: 'L' },
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
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M20 2L4 8V22C4 33 20 46 20 46C20 46 36 33 36 22V8L20 2Z"
        fill="#e5e7eb"
        stroke="#d1d5db"
        strokeWidth="1.5"
      />
      <text x="20" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill="#9ca3af">
        FC
      </text>
    </svg>
  )
}

function CompetitionIcon({ competition }: { competition: string }) {
  const badge = getBadge(competition)
  if (badge) {
    return (
      <Image src={badge} alt={competition} width={28} height={28} className="object-contain shrink-0" />
    )
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-gray-300 shrink-0">
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  return {
    day: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
  }
}

/* ─── Result row ─────────────────────────────────────────────────────────── */
function ResultRow({ match }: { match: PublicMatch }) {
  const { day, date } = formatDate(match.date)
  const rs = RESULT_STYLES[match.result!]

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group flex items-center gap-3 sm:gap-5 bg-white border border-gray-100 px-3 sm:px-5 lg:px-6 py-3 sm:py-4 hover:border-[#01255f]/25 hover:shadow-sm transition-all"
    >
      {/* Left: competition badge + date */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden sm:flex items-center justify-center w-8">
          <CompetitionIcon competition={match.competition} />
        </div>
        <div className="min-w-[52px] sm:min-w-[68px]">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#5a6478] leading-tight">
            {match.homeAway}
          </p>
          <p className="text-[10px] sm:text-xs font-bold text-[#01255f] leading-tight">{day}</p>
          <p className="text-[10px] sm:text-xs text-[#5a6478] leading-tight">{date}</p>
        </div>
      </div>

      {/* Center: our logo | score | opponent shield + name */}
      <div className="flex-1 flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Our logo only — no name */}
        <Image
          src="/Logo.png"
          alt={ORG_NAME}
          width={32}
          height={32}
          className="object-contain shrink-0 w-7 h-7 sm:w-8 sm:h-8"
        />

        {/* Score */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Goals scored — our goals */}
          <div className="w-8 sm:w-10 h-8 sm:h-10 bg-[#01255f] flex items-center justify-center">
            <span
              className="text-white text-base sm:text-xl font-black tabular-nums leading-none"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {match.goalsFor}
            </span>
          </div>

          {/* Result badge */}
          <div className="flex flex-col items-center gap-0.5">
            <span
              className={`${rs.bg} text-white text-[8px] sm:text-[9px] font-black px-1 sm:px-1.5 py-0.5 leading-none`}
            >
              {rs.label}
            </span>
            <span className="text-gray-300 text-xs leading-none">–</span>
          </div>

          {/* Goals conceded — opponent goals */}
          <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gray-100 flex items-center justify-center">
            <span
              className="text-[#5a6478] text-base sm:text-xl font-black tabular-nums leading-none"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {match.goalsAgainst}
            </span>
          </div>
        </div>

        {/* Opponent: shield (hidden on mobile) then name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="hidden sm:block shrink-0">
            <ShieldPlaceholder size={30} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-[#01255f] truncate leading-tight">
              {match.opponent}
            </p>
            <p className="text-[9px] sm:text-[10px] text-[#5a6478] leading-tight truncate">
              {match.competition}
            </p>
            {match.team !== 'first-team' && (
              <span className="text-[8px] font-bold text-[#fee11b] bg-[#01255f] px-1.5 py-0.5 inline-block mt-0.5">
                {displayTeamLabel(match.team)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Match Review button */}
      <div className="shrink-0">
        <span className="hidden sm:inline-flex items-center border-2 border-[#01255f] text-[#01255f] text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 py-1.5 sm:py-2 group-hover:bg-[#01255f] group-hover:text-white transition-colors whitespace-nowrap">
          Match Review
        </span>
        <svg
          className="sm:hidden w-4 h-4 text-[#01255f] shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

/* ─── Fixture row ────────────────────────────────────────────────────────── */
function FixtureRow({ match }: { match: Match }) {
  const { day, date } = formatDate(match.date)
  const daysUntil = Math.ceil(
    (new Date(`${match.date}T12:00:00Z`).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const isImminent = daysUntil >= 0 && daysUntil <= 7

  return (
    <div
      className={`flex items-center gap-3 sm:gap-5 bg-white border px-3 sm:px-5 lg:px-6 py-3 sm:py-4 transition-all ${
        isImminent ? 'border-[#fee11b] ring-1 ring-[#fee11b]/30' : 'border-gray-100'
      }`}
    >
      {/* Left: competition badge + date */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden sm:flex items-center justify-center w-8">
          <CompetitionIcon competition={match.competition} />
        </div>
        <div className="min-w-[52px] sm:min-w-[68px]">
          {isImminent && (
            <p className="text-[8px] font-black uppercase bg-[#fee11b] text-[#01255f] px-1.5 py-0.5 inline-block mb-0.5 leading-tight">
              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
            </p>
          )}
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#5a6478] leading-tight">
            {match.homeAway}
          </p>
          <p className="text-[10px] sm:text-xs font-bold text-[#01255f] leading-tight">{day}</p>
          <p className="text-[10px] sm:text-xs text-[#5a6478] leading-tight">{date}</p>
        </div>
      </div>

      {/* Center: our logo | score placeholder | opponent shield + name */}
      <div className="flex-1 flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Our logo only */}
        <Image
          src="/Logo.png"
          alt={ORG_NAME}
          width={32}
          height={32}
          className="object-contain shrink-0 w-7 h-7 sm:w-8 sm:h-8"
        />

        {/* Score dashes */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="w-8 sm:w-10 h-8 sm:h-10 border-2 border-dashed border-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm sm:text-base font-black leading-none">—</span>
          </div>
          <span className="text-gray-300 text-xs leading-none">–</span>
          <div className="w-8 sm:w-10 h-8 sm:h-10 border-2 border-dashed border-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm sm:text-base font-black leading-none">—</span>
          </div>
        </div>

        {/* Opponent: shield (hidden on mobile) then name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="hidden sm:block shrink-0">
            <ShieldPlaceholder size={30} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-[#01255f] truncate leading-tight">
              {match.opponent}
            </p>
            <p className="text-[9px] sm:text-[10px] text-[#5a6478] leading-tight truncate">
              {match.competition}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Upcoming label */}
      <span className="shrink-0 hidden sm:inline-flex items-center border-2 border-gray-200 text-gray-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap">
        Upcoming
      </span>
    </div>
  )
}

/* ─── JSON-LD ────────────────────────────────────────────────────────────── */
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

/* ─── Page ───────────────────────────────────────────────────────────────── */
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
                <h2 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#01255f] mb-3">
                  Upcoming Fixtures
                </h2>
                <div className="space-y-2">
                  {fixtures.map((m) => (
                    <FixtureRow key={m.id} match={m} />
                  ))}
                </div>
              </section>
            )}

            {/* Results */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h2 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#01255f]">
                  Results
                </h2>
                {seasons.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/matches"
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-colors ${
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
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-colors ${
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

              {/* Season record — 6 separate cards: P W D L GF GA */}
              {filteredResults.length > 0 && (
                <div className="grid grid-cols-6 gap-px bg-gray-200 mb-4">
                  <div className="bg-white py-2.5 sm:py-3 text-center">
                    <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#5a6478] font-bold">P</p>
                    <p className="text-sm sm:text-lg font-black text-[#01255f] tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                      {filteredResults.length}
                    </p>
                  </div>
                  <div className="bg-white py-2.5 sm:py-3 text-center">
                    <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#5a6478] font-bold">W</p>
                    <p className="text-sm sm:text-lg font-black text-green-600 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                      {w}
                    </p>
                  </div>
                  <div className="bg-white py-2.5 sm:py-3 text-center">
                    <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#5a6478] font-bold">D</p>
                    <p className="text-sm sm:text-lg font-black text-gray-500 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                      {d}
                    </p>
                  </div>
                  <div className="bg-white py-2.5 sm:py-3 text-center">
                    <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#5a6478] font-bold">L</p>
                    <p className="text-sm sm:text-lg font-black text-red-500 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                      {l}
                    </p>
                  </div>
                  {/* GF — goals scored, green */}
                  <div className="bg-white py-2.5 sm:py-3 text-center border-l-2 border-green-100">
                    <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-green-600 font-bold">GF</p>
                    <p className="text-sm sm:text-lg font-black text-green-600 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                      {gf}
                    </p>
                  </div>
                  {/* GA — goals conceded, red */}
                  <div className="bg-white py-2.5 sm:py-3 text-center border-l-2 border-red-100">
                    <p className="text-[8px] sm:text-[9px] uppercase tracking-widest text-red-500 font-bold">GA</p>
                    <p className="text-sm sm:text-lg font-black text-red-500 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                      {ga}
                    </p>
                  </div>
                </div>
              )}

              {filteredResults.length === 0 ? (
                <div className="bg-white border border-gray-100 p-10 text-center text-[#5a6478] text-sm">
                  No results recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredResults.map((m) => (
                    <ResultRow key={m.id} match={m} />
                  ))}
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
