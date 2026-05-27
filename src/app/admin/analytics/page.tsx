'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Target, Shield, Users, Goal, TrendingUp, Flag, Zap } from 'lucide-react'
import AdminLoadError from '@/components/AdminLoadError'
import AnalyticsFilters, { type AnalyticsFiltersState } from '@/components/admin/analytics-filters'
import SimpleBarChart from '@/components/admin/simple-bar-chart'
import StatCard from '@/components/admin/stat-card'
import PlayerAvatar from '@/components/admin/player-avatar'
import FormStrip from '@/components/admin/form-strip'
import { SkeletonDashboard } from '@/components/admin/skeleton'
import { fetchAdminJson } from '@/lib/admin-fetch'
import type { DashboardKpis, Match, PlayerSeasonTotals, GoalkeeperCleanSheetLeader } from '@/lib/analytics/types'
import { displayTeamLabel } from '@/lib/teams'

type DashboardData = {
  kpis: DashboardKpis
  topScorer: PlayerSeasonTotals | null
  topAssist: PlayerSeasonTotals | null
  topGk: GoalkeeperCleanSheetLeader | null
  recentMatches: (Match & { result: 'W' | 'D' | 'L' })[]
  topScorers: PlayerSeasonTotals[]
  topAssists: PlayerSeasonTotals[]
  discipline: PlayerSeasonTotals[]
  minutesLeaders: PlayerSeasonTotals[]
  gkCleanSheets: GoalkeeperCleanSheetLeader[]
  penaltyTotals: { taken: number; scored: number }
  totalCards: { yellow: number; red: number }
  goalsChart: { month: string; goals: number }[]
  seasons: string[]
  competitions: string[]
  playerCount: number
}

const RESULT_CLR = { W: 'bg-green-100 text-green-800', D: 'bg-gray-100 text-gray-700', L: 'bg-red-100 text-red-800' }

function fmt1(n: number): string {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1)
}

function RankedList({
  title,
  items,
  empty,
  renderValue,
  renderSub,
}: {
  title: string
  items: PlayerSeasonTotals[]
  empty: string
  renderValue: (p: PlayerSeasonTotals) => React.ReactNode
  renderSub?: (p: PlayerSeasonTotals) => React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 p-4 sm:p-5">
      <h2 className="font-bold text-[#01255f] mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-[#5a6478]">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 6).map((p, i) => (
            <li key={p.playerId} className="flex items-center gap-2 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
              <span className="text-[#5a6478] text-xs w-5 shrink-0 text-center font-medium">{i + 1}</span>
              <PlayerAvatar image={p.playerImage} name={p.playerName} size={26} />
              <span className="min-w-0 truncate flex-1 text-sm font-semibold text-[#01255f]">{p.playerName}</span>
              <span className="font-bold text-sm shrink-0 text-[#01255f]">{renderValue(p)}</span>
              {renderSub && (
                <span className="text-xs text-[#5a6478] shrink-0 w-10 text-right">{renderSub(p)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DashboardBody({ data }: { data: DashboardData }) {
  const { kpis, penaltyTotals, totalCards, discipline } = data
  const mp = kpis.matchesPlayed
  const winRate = mp > 0 ? Math.round((kpis.wins / mp) * 100) : null
  const goalsPerGame = mp > 0 ? kpis.goalsFor / mp : null
  const concededPerGame = mp > 0 ? kpis.goalsAgainst / mp : null
  const penConv = penaltyTotals.taken > 0 ? Math.round((penaltyTotals.scored / penaltyTotals.taken) * 100) : null
  const topDiscipline = discipline[0]
  const csRate = mp > 0 ? Math.round((kpis.cleanSheets / mp) * 100) : null

  return (
    <>
      {/* — Team KPIs — */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-4">
        <StatCard
          label="Win Rate"
          value={winRate !== null ? `${winRate}%` : '—'}
          icon={TrendingUp}
          accent="green"
          sub={mp > 0 ? `${kpis.wins}W · ${kpis.draws}D · ${kpis.losses}L` : 'No finalized matches'}
        />
        <StatCard
          label="Goals / Game"
          value={goalsPerGame !== null ? fmt1(goalsPerGame) : '—'}
          icon={Target}
          accent="green"
          sub={`${kpis.goalsFor} total · GD ${kpis.goalDifference >= 0 ? '+' : ''}${kpis.goalDifference}`}
        />
        <StatCard
          label="Conceded / Game"
          value={concededPerGame !== null ? fmt1(concededPerGame) : '—'}
          icon={Goal}
          accent="red"
          sub={`${kpis.goalsAgainst} total conceded`}
        />
        <StatCard
          label="Clean Sheets"
          value={kpis.cleanSheets}
          icon={Shield}
          accent="green"
          sub={csRate !== null ? `${csRate}% of matches` : 'Team shutouts'}
        />
        <StatCard
          label="Penalty Conv."
          value={penConv !== null ? `${penConv}%` : '—'}
          icon={Zap}
          accent="gold"
          sub={penaltyTotals.taken > 0 ? `${penaltyTotals.scored}/${penaltyTotals.taken} scored` : 'No penalties recorded'}
        />
        <StatCard
          label="Discipline"
          value={totalCards.yellow + totalCards.red > 0 ? `${totalCards.yellow}Y · ${totalCards.red}R` : '—'}
          icon={Flag}
          accent="red"
          sub={topDiscipline
            ? `Most: ${topDiscipline.playerName.split(' ')[0]} (${topDiscipline.yellowCards}Y ${topDiscipline.redCards}R)`
            : 'No cards yet'}
        />
      </div>

      {/* — Team Form — */}
      {data.recentMatches.filter((m) => m.status === 'final').length > 0 && (
        <div className="bg-white border border-gray-200 p-4 sm:p-5 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] shrink-0">Team Form</p>
          <FormStrip
            results={data.recentMatches
              .filter((m) => m.status === 'final')
              .slice(0, 5)
              .map((m) => m.result)}
          />
          <p className="text-xs text-[#5a6478]">Last {Math.min(5, data.recentMatches.filter((m) => m.status === 'final').length)} matches</p>
        </div>
      )}

      {/* — Player Leaders — */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard
          label="Top Scorer"
          value={data.topScorer ? data.topScorer.goals : '—'}
          accent="gold"
          avatarName={data.topScorer?.playerName}
          avatarImage={data.topScorer?.playerImage}
          sub={data.topScorer ? `${data.topScorer.playerName} · ${data.topScorer.appearances} apps` : 'No goals yet'}
        />
        <StatCard
          label="Top Assist"
          value={data.topAssist ? data.topAssist.assists : '—'}
          accent="navy"
          avatarName={data.topAssist?.playerName}
          avatarImage={data.topAssist?.playerImage}
          sub={data.topAssist ? `${data.topAssist.playerName} · ${data.topAssist.appearances} apps` : 'No assists yet'}
        />
        <StatCard
          label="Top GK · Clean Sheets"
          value={data.topGk ? data.topGk.cleanSheets : '—'}
          accent="navy"
          avatarName={data.topGk?.playerName}
          avatarImage={data.topGk?.playerImage}
          sub={data.topGk ? `${data.topGk.playerName} #${data.topGk.playerNumber}` : 'No GK data yet'}
        />
      </div>

      {/* — Goals chart + Top Scorers — */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="bg-white border border-gray-200 p-4 sm:p-5">
          <h2 className="font-bold text-[#01255f] mb-4">Goals by Month</h2>
          <SimpleBarChart
            data={data.goalsChart.map((g) => ({ month: g.month, goals: g.goals }))}
            labelKey="month"
            valueKey="goals"
            color="#fee11b"
          />
        </div>
        <RankedList
          title="Top Scorers"
          items={data.topScorers}
          empty="No goals recorded yet."
          renderValue={(p) => `${p.goals}G`}
          renderSub={(p) => p.assists > 0 ? `${p.assists}A` : undefined}
        />
      </div>

      {/* — Top Assists + Minutes Leaders — */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <RankedList
          title="Top Assists"
          items={data.topAssists}
          empty="No assists recorded yet."
          renderValue={(p) => `${p.assists}A`}
          renderSub={(p) => p.goals > 0 ? `${p.goals}G` : undefined}
        />
        <RankedList
          title="Minutes Played"
          items={data.minutesLeaders}
          empty="No minute data yet."
          renderValue={(p) => `${p.minutes}'`}
          renderSub={(p) => `${p.appearances} apps`}
        />
      </div>

      {/* — Recent Matches — */}
      <div className="bg-white border border-gray-200 p-4 sm:p-5 mb-6">
        <h2 className="font-bold text-[#01255f] mb-4">Recent Matches</h2>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-[#5a6478] border-b">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Opponent</th>
                <th className="pb-2 pr-3">Score</th>
                <th className="pb-2 pr-3">Competition</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentMatches.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="py-2.5 pr-3 whitespace-nowrap">{m.date}</td>
                  <td className="py-2.5 pr-3">
                    <Link href={`/admin/analytics/matches/${m.id}`} className="font-medium text-[#01255f] hover:underline">
                      {m.opponent}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="font-bold">{m.goalsFor}–{m.goalsAgainst}</span>
                    {m.status === 'final' && (
                      <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 ${RESULT_CLR[m.result]}`}>{m.result}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-[#5a6478]">{m.competition}</td>
                  <td className="py-2.5 capitalize text-xs text-[#5a6478]">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden space-y-2">
          {data.recentMatches.map((m) => (
            <Link
              key={m.id}
              href={`/admin/analytics/matches/${m.id}`}
              className="flex items-center justify-between gap-3 border border-gray-100 p-3 hover:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="text-xs text-[#5a6478]">{m.date} · {displayTeamLabel(m.team)}</p>
                <p className="font-bold text-[#01255f] truncate">vs {m.opponent}</p>
                <p className="text-xs text-[#5a6478] mt-0.5">{m.competition}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-black text-lg text-[#01255f]">{m.goalsFor}–{m.goalsAgainst}</p>
                {m.status === 'final' && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 ${RESULT_CLR[m.result]}`}>{m.result}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

export default function AnalyticsDashboardPage() {
  const [filters, setFilters] = useState<AnalyticsFiltersState>({ team: 'first-team', season: '', competition: '' })
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ team: filters.team })
      if (filters.season) params.set('season', filters.season)
      if (filters.competition) params.set('competition', filters.competition)
      const res = await fetchAdminJson<DashboardData>(`/api/admin/analytics/dashboard?${params}`)
      setData(res)
    } catch {
      setError('Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
            Analytics Dashboard
          </h1>
          <p className="text-sm text-[#5a6478] mt-1">Season stats from finalized matches.</p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
          <Link
            href="/admin/analytics/squad"
            className="inline-flex items-center justify-center gap-2 border border-[#01255f] text-[#01255f] px-4 py-2.5 text-sm font-bold hover:bg-[#01255f]/5"
          >
            <Users size={16} />
            Manage Squad
          </Link>
          <Link
            href="/admin/analytics/matches/new"
            className="inline-flex items-center justify-center gap-2 bg-[#01255f] hover:bg-[#011840] text-white px-4 py-2.5 text-sm font-bold"
          >
            <Plus size={16} />
            New Match
          </Link>
        </div>
      </div>

      {data && data.playerCount === 0 && (
        <div className="mb-6 bg-[#fee11b]/20 border border-[#fee11b] px-4 py-3 text-sm text-[#01255f]">
          No squad players yet.{' '}
          <Link href="/admin/analytics/squad" className="font-bold underline">Add players</Link>
          {' '}before entering match stats.
        </div>
      )}

      <div className="bg-white border border-gray-200 p-4 sm:p-5 mb-6">
        <AnalyticsFilters
          filters={filters}
          seasons={data?.seasons ?? []}
          competitions={data?.competitions ?? []}
          onChange={setFilters}
        />
      </div>

      {error && <AdminLoadError message={error} />}
      {loading && !data && <SkeletonDashboard />}
      {data && <DashboardBody data={data} />}
    </div>
  )
}
