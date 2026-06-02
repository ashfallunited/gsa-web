import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getMatchReview, type MatchReviewStat } from '@/lib/data/games'
import { ORG_NAME, SITE_URL } from '@/lib/constants'
import { displayTeamLabel } from '@/lib/teams'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const review = await getMatchReview(id)
  if (!review) return { title: 'Match Not Found' }
  const { match } = review
  const title = `vs ${match.opponent} — ${match.date}`
  return {
    title,
    description: `Match review: ${ORG_NAME} ${match.goalsFor}–${match.goalsAgainst} ${match.opponent}. ${match.competition}, ${match.season}.`,
    openGraph: {
      title: `${ORG_NAME} ${match.goalsFor}–${match.goalsAgainst} ${match.opponent}`,
      description: `${match.competition} · ${match.season} · ${match.homeAway}`,
      url: `${SITE_URL}/matches/${id}`,
    },
  }
}

const RESULT_STYLES = {
  W: { bg: 'bg-green-500', label: 'WIN' },
  D: { bg: 'bg-gray-400', label: 'DRAW' },
  L: { bg: 'bg-red-500', label: 'LOSS' },
} as const

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

function PlayerRow({ stat, showMinutes = true }: { stat: MatchReviewStat; showMinutes?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-full bg-[#01255f]/10 overflow-hidden shrink-0 flex items-center justify-center">
        {stat.playerImage ? (
          <Image src={stat.playerImage} alt={stat.playerName} width={28} height={28} className="w-full h-full object-cover object-top" />
        ) : (
          <span className="text-[9px] font-black text-[#01255f]">{stat.playerNumber || '?'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#01255f] truncate">{stat.playerName}</p>
        <p className="text-[10px] text-[#5a6478] capitalize">{stat.playerPosition}{showMinutes ? ` · ${stat.minutes}'` : ''}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {stat.yellowCards > 0 && (
          <span className="w-3 h-4 bg-yellow-400 rounded-sm inline-block" title="Yellow card" />
        )}
        {stat.redCards > 0 && (
          <span className="w-3 h-4 bg-red-500 rounded-sm inline-block" title="Red card" />
        )}
        {!stat.started && stat.minutes > 0 && (
          <span className="text-[9px] text-[#5a6478] font-bold">SUB</span>
        )}
      </div>
    </div>
  )
}

function GoalEvent({ stat, type }: { stat: MatchReviewStat; type: 'goal' | 'assist' }) {
  const minutes = type === 'goal' ? stat.goalMinutes : stat.assistMinutes
  const count = type === 'goal' ? stat.goals : stat.assists

  if (count === 0) return null

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const min = minutes[i]
        return (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="w-7 h-7 rounded-full bg-[#01255f]/10 overflow-hidden shrink-0 flex items-center justify-center">
              {stat.playerImage ? (
                <Image src={stat.playerImage} alt={stat.playerName} width={28} height={28} className="w-full h-full object-cover object-top" />
              ) : (
                <span className="text-[9px] font-black text-[#01255f]">{stat.playerNumber || '?'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#01255f] truncate">{stat.playerName}</p>
              <p className="text-[10px] text-[#5a6478]">
                {type === 'goal' ? '⚽ Goal' : '🎯 Assist'}
                {min != null && min > 0 ? ` · ${min}'` : ''}
              </p>
            </div>
          </div>
        )
      })}
    </>
  )
}

export default async function MatchReviewPage({ params }: Props) {
  const { id } = await params
  const review = await getMatchReview(id)
  if (!review) notFound()

  const { match, stats } = review
  const rs = RESULT_STYLES[match.result]

  const starters = stats.filter((s) => s.started).sort((a, b) => a.playerNumber - b.playerNumber)
  const subs = stats.filter((s) => !s.started && s.minutes > 0).sort((a, b) => a.playerNumber - b.playerNumber)
  const scorers = stats.filter((s) => s.goals > 0).sort((a, b) => {
    const aMin = a.goalMinutes[0] ?? 999
    const bMin = b.goalMinutes[0] ?? 999
    return aMin - bMin
  })
  const assisters = stats.filter((s) => s.assists > 0).sort((a, b) => {
    const aMin = a.assistMinutes[0] ?? 999
    const bMin = b.assistMinutes[0] ?? 999
    return aMin - bMin
  })
  const booked = stats.filter((s) => s.yellowCards > 0 || s.redCards > 0)

  const highlightId = match.highlightUrl ? extractYouTubeId(match.highlightUrl) : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${ORG_NAME} vs ${match.opponent}`,
    startDate: match.date,
    eventStatus: 'https://schema.org/EventCompleted',
    location: { '@type': 'Place', name: 'Monrovia, Liberia' },
    description: `${match.competition} · ${match.season}. Final score: ${match.goalsFor}–${match.goalsAgainst}.`,
    competitor: [
      { '@type': 'SportsTeam', name: ORG_NAME },
      { '@type': 'SportsTeam', name: match.opponent },
    ],
    organizer: { '@type': 'Organization', name: ORG_NAME, url: SITE_URL },
    url: `${SITE_URL}/matches/${id}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <main className="pt-16 lg:pt-[70px]">

        {/* Score hero */}
        <div className="bg-[#01255f] py-10 sm:py-14 lg:py-20">
          <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-10">
            <Link href="/matches" className="inline-flex items-center gap-1 text-white/50 hover:text-white text-xs font-bold mb-6 transition-colors">
              ← All Matches
            </Link>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6">
              {/* Us */}
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 sm:justify-end text-center sm:text-right">
                <div>
                  <p className="text-white font-bold text-base sm:text-lg">{ORG_NAME}</p>
                  <p className="text-white/50 text-xs">{match.homeAway === 'home' ? 'Home' : match.homeAway === 'away' ? 'Away' : 'Neutral'}</p>
                </div>
                <Image src="/Logo.png" alt={ORG_NAME} width={56} height={56} className="object-contain shrink-0" />
              </div>

              {/* Score */}
              <div className="flex flex-col items-center gap-2 px-4 sm:px-8">
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-5xl sm:text-7xl font-black text-white tabular-nums leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
                    {match.goalsFor}
                  </span>
                  <span className="text-white/30 text-3xl font-light">–</span>
                  <span className="text-5xl sm:text-7xl font-black text-white/60 tabular-nums leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
                    {match.goalsAgainst}
                  </span>
                </div>
                <span className={`${rs.bg} text-white text-[10px] font-black uppercase tracking-widest px-3 py-1`}>
                  {rs.label}
                </span>
              </div>

              {/* Opponent */}
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 sm:justify-start text-center sm:text-left">
                <svg width="56" height="56" viewBox="0 0 40 48" fill="none" className="shrink-0">
                  <path d="M20 2L4 8V22C4 33 20 46 20 46C20 46 36 33 36 22V8L20 2Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                  <text x="20" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill="rgba(255,255,255,0.4)">FC</text>
                </svg>
                <div>
                  <p className="text-white font-bold text-base sm:text-lg">{match.opponent}</p>
                  <p className="text-white/50 text-xs">{match.homeAway === 'home' ? 'Away' : match.homeAway === 'away' ? 'Home' : 'Neutral'}</p>
                </div>
              </div>
            </div>

            {/* Match metadata */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-white/50 text-xs">
              <span>{formatDate(match.date)}</span>
              <span>·</span>
              <span>{match.competition}</span>
              <span>·</span>
              <span>{match.season}</span>
              {match.team !== 'first-team' && (
                <>
                  <span>·</span>
                  <span className="text-[#fee11b] font-bold">{displayTeamLabel(match.team)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#f5f7fc] py-10 sm:py-14 lg:py-20">
          <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-10 space-y-8">

            {/* Highlight video */}
            {highlightId && (
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#01255f] mb-4">Highlights</h2>
                <div className="aspect-video bg-black w-full">
                  <iframe
                    src={`https://www.youtube.com/embed/${highlightId}`}
                    title="Match highlights"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </section>
            )}

            {/* Match report */}
            {match.report && (
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#01255f] mb-4">Match Report</h2>
                <div className="bg-white border border-gray-100 p-6 sm:p-8">
                  <p className="text-sm text-[#0d0d0d] leading-relaxed whitespace-pre-wrap">{match.report}</p>
                </div>
              </section>
            )}

            {/* Goal scorers */}
            {scorers.length > 0 && (
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#01255f] mb-4">⚽ Goalscorers</h2>
                <div className="bg-white border border-gray-100 px-4 sm:px-6 divide-y divide-gray-50">
                  {scorers.map((s) => <GoalEvent key={s.playerId} stat={s} type="goal" />)}
                </div>
              </section>
            )}

            {/* Assists */}
            {assisters.length > 0 && (
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#01255f] mb-4">🎯 Assists</h2>
                <div className="bg-white border border-gray-100 px-4 sm:px-6 divide-y divide-gray-50">
                  {assisters.map((s) => <GoalEvent key={s.playerId} stat={s} type="assist" />)}
                </div>
              </section>
            )}

            {/* Squad — starters + subs side by side on desktop */}
            {starters.length > 0 && (
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#01255f] mb-4">Squad</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-100 p-4 sm:p-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#fee11b] bg-[#01255f] px-2 py-1 inline-block mb-4">
                      Starting XI
                    </p>
                    {starters.map((s) => <PlayerRow key={s.playerId} stat={s} />)}
                  </div>
                  {subs.length > 0 && (
                    <div className="bg-white border border-gray-100 p-4 sm:p-6">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a6478] bg-gray-100 px-2 py-1 inline-block mb-4">
                        Substitutes
                      </p>
                      {subs.map((s) => <PlayerRow key={s.playerId} stat={s} />)}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Discipline */}
            {booked.length > 0 && (
              <section>
                <h2 className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#01255f] mb-4">Discipline</h2>
                <div className="bg-white border border-gray-100 px-4 sm:px-6">
                  {booked.map((s) => <PlayerRow key={s.playerId} stat={s} showMinutes={false} />)}
                </div>
              </section>
            )}

            {/* No stats recorded */}
            {stats.length === 0 && (
              <div className="bg-white border border-gray-100 p-10 text-center text-[#5a6478] text-sm">
                Player stats not yet recorded for this match.
              </div>
            )}

            <div className="pt-4">
              <Link href="/matches" className="inline-flex items-center gap-1.5 text-[#01255f] text-sm font-bold hover:text-[#fee11b] transition-colors">
                ← Back to all matches
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
