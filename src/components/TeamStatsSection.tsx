import type { Match, PlayerSeasonTotals } from '@/lib/analytics/types'
import { computeMatchResult } from '@/lib/analytics/aggregation'

const RESULT_STYLES = {
  W: 'bg-emerald-600 text-white',
  D: 'bg-gray-500 text-white',
  L: 'bg-red-600 text-white',
}

type ResultMatch = Match & { result: 'W' | 'D' | 'L' }

export default function TeamStatsSection({
  recentResults,
  topScorers,
  kpis,
}: {
  recentResults: ResultMatch[]
  topScorers: PlayerSeasonTotals[]
  kpis?: { goalsFor: number; goalsAgainst: number; cleanSheets: number }
}) {
  if (recentResults.length === 0 && topScorers.length === 0 && !kpis) {
    return null
  }

  return (
    <section className="mb-10 sm:mb-14">
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
          <div className="bg-white border border-gray-200 border-l-4 border-l-emerald-500 p-4 sm:p-5 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478]">Goals Scored</p>
            <p className="text-2xl sm:text-3xl font-black text-[#01255f] mt-1" style={{ fontFamily: 'var(--font-heading)' }}>{kpis.goalsFor}</p>
          </div>
          <div className="bg-white border border-gray-200 border-l-4 border-l-red-500 p-4 sm:p-5 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478]">Conceded</p>
            <p className="text-2xl sm:text-3xl font-black text-[#01255f] mt-1" style={{ fontFamily: 'var(--font-heading)' }}>{kpis.goalsAgainst}</p>
          </div>
          <div className="bg-white border border-gray-200 border-l-4 border-l-[#01255f] p-4 sm:p-5 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478]">Clean Sheets</p>
            <p className="text-2xl sm:text-3xl font-black text-[#01255f] mt-1" style={{ fontFamily: 'var(--font-heading)' }}>{kpis.cleanSheets}</p>
          </div>
          <div className="bg-white border border-gray-200 border-l-4 border-l-[#fee11b] p-4 sm:p-5 shadow-sm col-span-2 lg:col-span-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478]">Top Scorer</p>
            <p className="text-lg sm:text-xl font-black text-[#01255f] mt-1 truncate" style={{ fontFamily: 'var(--font-heading)' }}>
              {topScorers[0] ? `${topScorers[0].playerName} (${topScorers[0].goals})` : '—'}
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
        {recentResults.length > 0 && (
          <div>
            <span className="label-dark">Season</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#01255f] mt-2 mb-4 sm:mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              Recent Results
            </h2>
            <ul className="space-y-2 sm:space-y-3">
              {recentResults.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 bg-white border border-gray-200 px-3 py-3 sm:px-5 sm:py-4 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs text-[#5a6478] truncate">{m.date} · {m.competition}</p>
                    <p className="font-bold text-[#01255f] text-sm sm:text-base truncate">vs {m.opponent}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-base sm:text-lg text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
                      {m.goalsFor}-{m.goalsAgainst}
                    </span>
                    <span className={`text-[10px] font-black w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center ${RESULT_STYLES[m.result]}`}>
                      {m.result}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {topScorers.length > 0 && (
          <div>
            <span className="label-dark">Season</span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#01255f] mt-2 mb-4 sm:mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              Top Scorers
            </h2>
            <ol className="space-y-2 sm:space-y-3">
              {topScorers.map((p, i) => (
                <li key={p.playerId} className="flex items-center gap-3 sm:gap-4 bg-white border border-gray-200 px-3 py-3 sm:px-5 sm:py-4 shadow-sm">
                  <span className="text-[#fee11b] font-black text-lg sm:text-xl w-6 sm:w-8 shrink-0 text-center" style={{ fontFamily: 'var(--font-heading)' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#01255f] text-sm sm:text-base truncate">{p.playerName}</p>
                    <p className="text-[10px] sm:text-xs text-[#5a6478]">#{p.playerNumber} · {p.appearances} apps{p.assists > 0 ? ` · ${p.assists}A` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-lg sm:text-xl text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>{p.goals}</p>
                    <p className="text-[9px] sm:text-[10px] text-[#5a6478] uppercase tracking-widest">Goals</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}

export function withResults(matches: Match[]): ResultMatch[] {
  return matches.map((m) => ({ ...m, result: computeMatchResult(m) }))
}
