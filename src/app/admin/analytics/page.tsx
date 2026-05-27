'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Target, Shield, Trophy, Users, Goal, Handshake } from 'lucide-react'
import AdminLoadError from '@/components/AdminLoadError'
import AnalyticsFilters, { type AnalyticsFiltersState } from '@/components/admin/analytics-filters'
import SimpleBarChart from '@/components/admin/simple-bar-chart'
import StatCard from '@/components/admin/stat-card'
import PlayerAvatar from '@/components/admin/player-avatar'
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
  gkCleanSheets: GoalkeeperCleanSheetLeader[]
  goalsChart: { month: string; goals: number }[]
  seasons: string[]
  competitions: string[]
  playerCount: number
}

const RESULT_COLORS = { W: 'bg-green-100 text-green-800', D: 'bg-gray-100 text-gray-700', L: 'bg-red-100 text-red-800' }

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

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard label="Goals Scored" value={data.kpis.goalsFor} icon={Target} accent="green" sub={`${data.kpis.matchesPlayed} matches`} />
            <StatCard label="Goals Conceded" value={data.kpis.goalsAgainst} icon={Goal} accent="red" sub={`GD ${data.kpis.goalDifference >= 0 ? '+' : ''}${data.kpis.goalDifference}`} />
            <StatCard
              label="Top Scorer"
              value={data.topScorer ? data.topScorer.goals : '—'}
              accent="gold"
              avatarName={data.topScorer?.playerName}
              avatarImage={data.topScorer?.playerImage}
              sub={data.topScorer ? `${data.topScorer.playerName} #${data.topScorer.playerNumber}` : 'No goals yet'}
            />
            <StatCard
              label="Top Assist"
              value={data.topAssist ? data.topAssist.assists : '—'}
              accent="navy"
              avatarName={data.topAssist?.playerName}
              avatarImage={data.topAssist?.playerImage}
              sub={data.topAssist ? `${data.topAssist.playerName} #${data.topAssist.playerNumber}` : 'No assists yet'}
            />
            <StatCard label="Clean Sheets" value={data.kpis.cleanSheets} icon={Shield} accent="green" sub="Team shutouts" />
            <StatCard
              label="Top GK (CS)"
              value={data.topGk ? data.topGk.cleanSheets : '—'}
              accent="navy"
              avatarName={data.topGk?.playerName}
              avatarImage={data.topGk?.playerImage}
              sub={data.topGk ? `${data.topGk.playerName} #${data.topGk.playerNumber}` : 'No GK data yet'}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white border border-gray-200 p-4 sm:p-5">
              <h2 className="font-bold text-[#01255f] mb-4">Goals by Month</h2>
              <SimpleBarChart
                data={data.goalsChart.map((g) => ({ month: g.month, goals: g.goals }))}
                labelKey="month"
                valueKey="goals"
                color="#fee11b"
              />
            </div>
            <div className="bg-white border border-gray-200 p-4 sm:p-5">
              <h2 className="font-bold text-[#01255f] mb-4">Top Scorers</h2>
              {data.topScorers.length === 0 ? (
                <p className="text-sm text-[#5a6478]">No goals recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.topScorers.slice(0, 6).map((p, i) => (
                    <li key={p.playerId} className="flex items-center gap-2 border-b border-gray-100 pb-2">
                      <span className="text-[#5a6478] text-xs w-4 shrink-0 text-center">{i + 1}</span>
                      <PlayerAvatar image={p.playerImage} name={p.playerName} size={24} />
                      <span className="min-w-0 truncate flex-1 text-sm font-semibold text-[#01255f]">{p.playerName}</span>
                      <span className="font-bold text-sm shrink-0">{p.goals}G</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

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
                        <span className="font-bold">{m.goalsFor}-{m.goalsAgainst}</span>
                        {m.status === 'final' && (
                          <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 ${RESULT_COLORS[m.result]}`}>{m.result}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-[#5a6478]">{m.competition}</td>
                      <td className="py-2.5 capitalize text-xs">{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3">
              {data.recentMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/admin/analytics/matches/${m.id}`}
                  className="block border border-gray-100 p-3 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-[#5a6478]">{m.date} · {displayTeamLabel(m.team)}</p>
                      <p className="font-bold text-[#01255f] truncate">vs {m.opponent}</p>
                      <p className="text-xs text-[#5a6478] mt-0.5">{m.competition}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-lg text-[#01255f]">{m.goalsFor}-{m.goalsAgainst}</p>
                      {m.status === 'final' && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 ${RESULT_COLORS[m.result]}`}>{m.result}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
