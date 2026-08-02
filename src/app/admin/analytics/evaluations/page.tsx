'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { toPng } from 'html-to-image'
import { Plus, TrendingUp, Download, Pencil, ChevronLeft } from 'lucide-react'
import PlayerAvatar from '@/components/admin/player-avatar'
import PlayerPicker from '@/components/admin/player-picker'
import AdminLoadError from '@/components/AdminLoadError'
import RadarChart from '@/components/admin/radar-chart'
import LineChart from '@/components/admin/line-chart'
import PieChart from '@/components/admin/pie-chart'
import CategoryHeatmap from '@/components/admin/category-heatmap'
import TeamLeaderboard from '@/components/admin/team-leaderboard'
import ExportDialog, { type ExportFormat, type ExportScope } from '@/components/admin/export-dialog'
import { inputClass, labelClass } from '@/components/admin/analytics-filters'
import { fetchAdminJson } from '@/lib/admin-fetch'
import { TEAM_LABELS, TEAM_SLUG, playerMatchesTeamFilter } from '@/lib/teams'
import { categoryMetaFor } from '@/lib/evaluations/types'
import { isoWeekKey } from '@/lib/evaluations/date-utils'
import type {
  EvaluationRole,
  MonthReport,
  TeamLeaderboard as TeamLeaderboardData,
  WeekReport,
  YearReport,
} from '@/lib/evaluations/types'

type PlayerOption = { id: string; name: string; number: number; position: string; team: string; image?: string }
type Period = 'week' | 'month' | 'year'
type AnyReport = WeekReport | MonthReport | YearReport

type ReportResponse = {
  player: { id: string; name: string; number: number; position: string; image?: string; team: string; role: EvaluationRole }
  period: Period
  hasData: boolean
  report: AnyReport
}

type TeamReportResponse = {
  period: Period
  outfield: TeamLeaderboardData
  goalkeeper: TeamLeaderboardData
}

function isWeekPeriod(period: Period, report: AnyReport): report is WeekReport {
  return period === 'week'
}
function isMonthPeriod(period: Period, report: AnyReport): report is MonthReport {
  return period === 'month'
}
function isYearPeriod(period: Period, report: AnyReport): report is YearReport {
  return period === 'year'
}

function shortDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function shortMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short' })
}

function radarDataFor(role: EvaluationRole, categoryAverages: Record<string, number>) {
  return categoryMetaFor(role).map(({ key, short }) => ({ label: short, value: categoryAverages[key] ?? 0 }))
}

function slugify(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, '-')
}

const today = new Date().toISOString().slice(0, 10)
const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(currentYear - i))

export default function EvaluationsReportPage() {
  const router = useRouter()
  const [team, setTeam] = useState<string>(TEAM_SLUG.firstTeam)
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [playersError, setPlayersError] = useState('')

  const [playerId, setPlayerId] = useState('')
  const [periodType, setPeriodType] = useState<Period>('week')
  const [week, setWeek] = useState(isoWeekKey(today))
  const [month, setMonth] = useState(today.slice(0, 7))
  const [year, setYear] = useState(String(currentYear))

  const [data, setData] = useState<ReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [teamReport, setTeamReport] = useState<TeamReportResponse | null>(null)
  const [teamReportLoading, setTeamReportLoading] = useState(false)
  const [teamReportError, setTeamReportError] = useState('')
  const [showAllOutfield, setShowAllOutfield] = useState(false)
  const [showAllGoalkeeper, setShowAllGoalkeeper] = useState(false)

  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const teamOverviewRef = useRef<HTMLDivElement>(null)
  const playerReportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoadingPlayers(true)
    fetchAdminJson<{ players: PlayerOption[] }>('/api/admin/analytics/players-list?team=all')
      .then((res) => setPlayers(res.players))
      .catch(() => setPlayersError('Failed to load players.'))
      .finally(() => setLoadingPlayers(false))
  }, [])

  const teamPlayers = useMemo(
    () => players.filter((p) => playerMatchesTeamFilter(p.team, team)),
    [players, team]
  )

  const periodParams = useCallback(() => {
    const params = new URLSearchParams({ period: periodType })
    if (periodType === 'week') params.set('week', week)
    else if (periodType === 'month') params.set('month', month)
    else params.set('year', year)
    return params
  }, [periodType, week, month, year])

  const loadTeamReport = useCallback(async () => {
    setTeamReportLoading(true)
    setTeamReportError('')
    setShowAllOutfield(false)
    setShowAllGoalkeeper(false)
    try {
      const params = periodParams()
      params.set('team', team)
      const res = await fetchAdminJson<TeamReportResponse>(`/api/admin/evaluations/team-report?${params}`)
      setTeamReport(res)
    } catch {
      setTeamReportError('Failed to load team overview.')
      setTeamReport(null)
    } finally {
      setTeamReportLoading(false)
    }
  }, [team, periodParams])

  useEffect(() => {
    if (!playerId) loadTeamReport()
  }, [loadTeamReport, playerId])

  const loadReport = useCallback(async () => {
    if (!playerId) {
      setData(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const params = periodParams()
      params.set('playerId', playerId)
      const res = await fetchAdminJson<ReportResponse>(`/api/admin/evaluations/report?${params}`)
      setData(res)
    } catch {
      setError('Failed to load report.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [playerId, periodParams])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const meta = data ? categoryMetaFor(data.player.role) : []
  const radarData = data
    ? meta.map(({ key, short }) => ({ label: short, value: (data.report.categoryAverages as Record<string, number>)[key] ?? 0 }))
    : []
  const squadRadarData = data
    ? meta.map(({ key, short }) => ({ label: short, value: (data.report.squadCategoryAverages as Record<string, number>)[key] ?? 0 }))
    : []

  const periodLabel = periodType === 'week' ? 'this week' : periodType === 'month' ? 'this month' : 'this year'

  const editSession = (evaluationId: string) => {
    router.push(`/admin/analytics/evaluations/new?id=${evaluationId}`)
  }

  const handleExport = async (format: ExportFormat, scope: ExportScope) => {
    setExportError('')
    setExporting(true)
    try {
      if (format === 'pdf') {
        const params = periodParams()
        if (scope === 'player') {
          params.set('playerId', playerId)
          window.open(`/api/admin/evaluations/report-pdf?${params}`, '_blank')
        } else {
          params.set('team', team)
          window.open(`/api/admin/evaluations/team-report-pdf?${params}`, '_blank')
        }
        setExportOpen(false)
      } else {
        const ref = scope === 'player' ? playerReportRef : teamOverviewRef
        if (!ref.current) {
          setExportError('Nothing to capture yet.')
          return
        }
        const dataUrl = await toPng(ref.current, { pixelRatio: 2, backgroundColor: '#ffffff' })
        const link = document.createElement('a')
        const safeName = scope === 'player'
          ? slugify(data?.player.name ?? 'player')
          : slugify(TEAM_LABELS[team as keyof typeof TEAM_LABELS] ?? team)
        link.download = `${safeName}-evaluations.png`
        link.href = dataUrl
        link.click()
        setExportOpen(false)
      }
    } catch {
      setExportError('Failed to generate export. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-6xl mx-auto">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
            Player Evaluations
          </h1>
          <p className="text-sm text-[#5a6478] mt-1">Weekly, monthly, and yearly performance report cards, built from training and match ratings.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 border border-gray-200 text-[#01255f] px-4 py-2.5 text-sm font-black hover:bg-gray-50"
          >
            <Download size={15} /> Export
          </button>
          <Link
            href="/admin/analytics/evaluations/new"
            className="inline-flex items-center gap-1.5 bg-[#fee11b] text-[#01255f] px-4 py-2.5 text-sm font-black"
          >
            <Plus size={15} /> New Evaluation
          </Link>
        </div>
      </div>

      {playersError && <AdminLoadError message={playersError} />}

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-4 sm:p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Team</label>
            <select
              value={team}
              onChange={(e) => {
                setTeam(e.target.value)
                setPlayerId('')
              }}
              className={inputClass}
            >
              {Object.entries(TEAM_LABELS)
                .filter(([v]) => v !== TEAM_SLUG.both)
                .map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Player (optional)</label>
            <PlayerPicker players={teamPlayers} value={playerId} onChange={setPlayerId} placeholder="Whole squad" disabled={loadingPlayers} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Time Period</label>
            <div className="grid grid-cols-3 gap-2">
              {(['week', 'month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodType(p)}
                  className={`py-2 text-sm font-bold uppercase tracking-wide border transition-colors ${
                    periodType === p ? 'bg-[#01255f] text-white border-[#01255f]' : 'bg-white text-[#5a6478] border-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>{periodType === 'week' ? 'Week' : periodType === 'month' ? 'Month' : 'Year'}</label>
            {periodType === 'week' && <input type="week" value={week} onChange={(e) => setWeek(e.target.value)} className={inputClass} />}
            {periodType === 'month' && <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputClass} />}
            {periodType === 'year' && (
              <select value={year} onChange={(e) => setYear(e.target.value)} className={inputClass}>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Team Overview — only when no player is selected */}
      {!playerId && (
        <div ref={teamOverviewRef} className="bg-white border border-gray-200 p-4 sm:p-5">
          <h2 className="font-bold text-[#01255f] mb-1">Team Overview</h2>
          <p className="text-xs text-[#5a6478] mb-4">
            Average total for {TEAM_LABELS[team as keyof typeof TEAM_LABELS] ?? team}, {periodLabel}. Select a player above to see their full report.
          </p>

          {teamReportLoading && <p className="text-sm text-[#5a6478] py-4 text-center">Loading team overview…</p>}
          {teamReportError && <AdminLoadError message={teamReportError} />}

          {!teamReportLoading && !teamReportError && teamReport && (
            <>
              {teamReport.outfield.entries.length === 0 && teamReport.goalkeeper.entries.length === 0 ? (
                <p className="text-sm text-[#5a6478] py-4 text-center">No evaluations recorded for the team {periodLabel}.</p>
              ) : (
                <div className={`grid gap-8 ${teamReport.outfield.entries.length > 0 && teamReport.goalkeeper.entries.length > 0 ? 'lg:grid-cols-2' : ''}`}>
                  {teamReport.outfield.entries.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold mb-3">
                        Outfield ({teamReport.outfield.entries.length})
                      </p>

                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-[#01255f] mb-1">Squad Category Averages</p>
                          <RadarChart data={radarDataFor('outfield', teamReport.outfield.categoryAverages)} max={5} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#01255f] mb-1">Where Players Peak</p>
                          <PieChart data={teamReport.outfield.topCategoryDistribution.map((c) => ({ label: c.label, value: c.count }))} />
                        </div>
                      </div>

                      <TeamLeaderboard
                        entries={showAllOutfield ? teamReport.outfield.entries : teamReport.outfield.entries.slice(0, 5)}
                        maxTotal={teamReport.outfield.maxTotal}
                        onSelect={setPlayerId}
                        selectedPlayerId={playerId}
                      />
                      {teamReport.outfield.entries.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setShowAllOutfield((v) => !v)}
                          className="text-xs font-bold text-[#01255f] hover:underline mt-2"
                        >
                          {showAllOutfield ? 'Show top 5 only' : `Show all ${teamReport.outfield.entries.length}`}
                        </button>
                      )}
                    </div>
                  )}
                  {teamReport.goalkeeper.entries.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold mb-3">
                        Goalkeepers ({teamReport.goalkeeper.entries.length})
                      </p>

                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-semibold text-[#01255f] mb-1">Squad Category Averages</p>
                          <RadarChart data={radarDataFor('goalkeeper', teamReport.goalkeeper.categoryAverages)} max={5} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#01255f] mb-1">Where Players Peak</p>
                          <PieChart data={teamReport.goalkeeper.topCategoryDistribution.map((c) => ({ label: c.label, value: c.count }))} />
                        </div>
                      </div>

                      <TeamLeaderboard
                        entries={showAllGoalkeeper ? teamReport.goalkeeper.entries : teamReport.goalkeeper.entries.slice(0, 5)}
                        maxTotal={teamReport.goalkeeper.maxTotal}
                        onSelect={setPlayerId}
                        selectedPlayerId={playerId}
                      />
                      {teamReport.goalkeeper.entries.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setShowAllGoalkeeper((v) => !v)}
                          className="text-xs font-bold text-[#01255f] hover:underline mt-2"
                        >
                          {showAllGoalkeeper ? 'Show top 5 only' : `Show all ${teamReport.goalkeeper.entries.length}`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Individual player report — only when a player is selected */}
      {playerId && (
        <div>
          <button
            type="button"
            onClick={() => setPlayerId('')}
            className="flex items-center gap-1 text-xs font-bold text-[#5a6478] hover:text-[#01255f] transition-colors mb-4"
          >
            <ChevronLeft size={14} /> Back to Team Overview
          </button>

          {loading && (
            <div className="bg-white border border-gray-200 p-10 text-center text-sm text-[#5a6478]">Loading report…</div>
          )}

          {!loading && error && <AdminLoadError message={error} />}

          {!loading && !error && data && !data.hasData && (
            <div className="bg-white border border-dashed border-gray-300 p-12 text-center">
              <p className="text-[#01255f] font-bold">No evaluations recorded for {data.player.name} {periodLabel}.</p>
              <p className="text-sm text-[#5a6478] mt-1">Record a session to see their report card here.</p>
            </div>
          )}

          {!loading && !error && data && data.hasData && (
            <div ref={playerReportRef} className="space-y-6">
              {/* Player header */}
              <div className="bg-white border border-gray-200 p-4 sm:p-5 flex flex-wrap items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <PlayerAvatar image={data.player.image} name={data.player.name} size={48} />
                  <div>
                    <p className="font-black text-[#01255f] text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{data.player.name}</p>
                    <p className="text-xs text-[#5a6478]">
                      #{data.player.number} · <span className="capitalize">{data.player.position}</span> · {TEAM_LABELS[team as keyof typeof TEAM_LABELS] ?? team}
                    </p>
                  </div>
                </div>
                {data.report.squadRank && (
                  <div className="flex items-center gap-2 bg-[#01255f] text-white px-4 py-2">
                    <TrendingUp size={14} className="text-[#fee11b]" />
                    <span className="text-sm font-bold">
                      #{data.report.squadRank.rank} <span className="text-white/60 font-normal">of {data.report.squadRank.outOf} in squad</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Summary + radar */}
              <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white border border-gray-200 p-4 sm:p-5">
                  <h2 className="font-bold text-[#01255f] mb-4">Category Ratings</h2>
                  <RadarChart data={radarData} compareData={squadRadarData} max={5} label="Player" compareLabel="Squad Avg" />
                </div>
                <div className="bg-white border border-gray-200 p-4 sm:p-5 flex flex-col">
                  <h2 className="font-bold text-[#01255f] mb-4">Summary</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-gray-100 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-[#5a6478]">Average Total</p>
                      <p className="text-2xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
                        {data.report.averageTotal} <span className="text-sm font-normal text-[#5a6478]">/ {data.report.maxTotal}</span>
                      </p>
                    </div>
                    <div className="border border-gray-100 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-[#5a6478]">Sessions</p>
                      <p className="text-2xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
                        {data.report.sessionCount}
                      </p>
                    </div>
                  </div>

                  {isMonthPeriod(periodType, data.report) && (
                    <div className="mt-3 border border-gray-100 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-[#5a6478]">Weeks With a Session</p>
                      <p className="text-lg font-black text-[#01255f]">
                        {data.report.weeksWithSessions} <span className="text-sm font-normal text-[#5a6478]">of {data.report.totalWeeksInMonth}</span>
                      </p>
                      {data.report.weeksWithSessions < data.report.totalWeeksInMonth && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 mt-2 inline-block">
                          Light month — some weeks had no recorded session.
                        </p>
                      )}
                    </div>
                  )}
                  {isYearPeriod(periodType, data.report) && (
                    <div className="mt-3 border border-gray-100 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-[#5a6478]">Months With a Session</p>
                      <p className="text-lg font-black text-[#01255f]">
                        {data.report.monthsWithSessions} <span className="text-sm font-normal text-[#5a6478]">of {data.report.totalMonthsInYear}</span>
                      </p>
                      {data.report.monthsWithSessions < data.report.totalMonthsInYear && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 mt-2 inline-block">
                          Some months had no recorded session.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Training vs Match split + Attendance */}
              <div className="bg-white border border-gray-200 p-4 sm:p-5">
                <h2 className="font-bold text-[#01255f] mb-4">Training vs Match &amp; Attendance</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold mb-2">Training vs Match</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="border border-gray-100 p-2.5">
                        <p className="text-[9px] uppercase tracking-widest text-[#5a6478]">Training</p>
                        <p className="font-black text-[#01255f]">
                          {data.report.typeSplit.training.sessionCount > 0 ? data.report.typeSplit.training.averageTotal : '—'}
                          <span className="text-[10px] font-normal text-[#5a6478]"> ({data.report.typeSplit.training.sessionCount})</span>
                        </p>
                      </div>
                      <div className="border border-gray-100 p-2.5">
                        <p className="text-[9px] uppercase tracking-widest text-[#5a6478]">Match</p>
                        <p className="font-black text-[#01255f]">
                          {data.report.typeSplit.match.sessionCount > 0 ? data.report.typeSplit.match.averageTotal : '—'}
                          <span className="text-[10px] font-normal text-[#5a6478]"> ({data.report.typeSplit.match.sessionCount})</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold mb-2">Attendance</p>
                    {data.report.attendance.sessionsHeld === 0 ? (
                      <p className="text-sm text-[#5a6478]">No team sessions recorded {periodLabel}.</p>
                    ) : (
                      <>
                        <p className="font-black text-[#01255f]">
                          {data.report.attendance.attended}/{data.report.attendance.sessionsHeld}
                          <span className="text-[10px] font-normal text-[#5a6478]"> ({data.report.attendance.attendanceRate}%)</span>
                        </p>
                        {data.report.attendance.absent > 0 ? (
                          <p className="text-[11px] text-amber-700 mt-1">
                            Missed: {data.report.attendance.absentDates.map(shortDate).join(', ')}
                          </p>
                        ) : (
                          <p className="text-[11px] text-green-700 mt-1">No sessions missed.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Trend chart(s) */}
              {isWeekPeriod(periodType, data.report) && (
                <div className="bg-white border border-gray-200 p-4 sm:p-5">
                  <h2 className="font-bold text-[#01255f] mb-4">Session-by-Session Trend</h2>
                  <LineChart
                    points={data.report.sessions.map((s) => ({ label: shortDate(s.date), value: s.total }))}
                    max={data.report.maxTotal}
                  />
                </div>
              )}
              {isMonthPeriod(periodType, data.report) && (
                <>
                  <div className="bg-white border border-gray-200 p-4 sm:p-5">
                    <h2 className="font-bold text-[#01255f] mb-4">Week-by-Week Trend</h2>
                    <LineChart
                      points={data.report.weeklyTrend.map((w) => ({ label: shortDate(w.weekStart), value: w.averageTotal }))}
                      max={data.report.maxTotal}
                    />
                  </div>
                  <div className="bg-white border border-gray-200 p-4 sm:p-5">
                    <h2 className="font-bold text-[#01255f] mb-1">Session-by-Session Trend</h2>
                    <p className="text-xs text-[#5a6478] mb-4">Finer detail behind the weekly averages above.</p>
                    <LineChart
                      points={data.report.sessionTrend.map((s) => ({ label: shortDate(s.date), value: s.total }))}
                      max={data.report.maxTotal}
                    />
                  </div>
                </>
              )}
              {isYearPeriod(periodType, data.report) && (
                <>
                  <div className="bg-white border border-gray-200 p-4 sm:p-5">
                    <h2 className="font-bold text-[#01255f] mb-4">Month-by-Month Trend</h2>
                    <LineChart
                      points={data.report.monthlyTrend.map((m) => ({ label: shortMonth(m.month), value: m.averageTotal }))}
                      max={data.report.maxTotal}
                    />
                  </div>
                  <div className="bg-white border border-gray-200 p-4 sm:p-5">
                    <h2 className="font-bold text-[#01255f] mb-1">Session-by-Session Trend</h2>
                    <p className="text-xs text-[#5a6478] mb-4">Finer detail behind the monthly averages above.</p>
                    <LineChart
                      points={data.report.sessionTrend.map((s) => ({ label: shortDate(s.date), value: s.total }))}
                      max={data.report.maxTotal}
                    />
                  </div>
                </>
              )}

              {/* Category heatmap */}
              <div className="bg-white border border-gray-200 p-4 sm:p-5">
                <h2 className="font-bold text-[#01255f] mb-1">Category Heatmap</h2>
                <p className="text-xs text-[#5a6478] mb-4">Score per category, session by session. Click a session to edit it.</p>
                <CategoryHeatmap sessions={data.report.sessions} role={data.player.role} onSelectSession={editSession} />
              </div>

              {/* Sessions list (week view) */}
              {isWeekPeriod(periodType, data.report) && (
                <div className="bg-white border border-gray-200 p-4 sm:p-5">
                  <h2 className="font-bold text-[#01255f] mb-4">Sessions This Week</h2>
                  {data.report.sessions.length === 0 ? (
                    <p className="text-sm text-[#5a6478]">No sessions.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {data.report.sessions.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => editSession(s.id)}
                            title="Edit this evaluation"
                            className="w-full py-2.5 flex items-center justify-between gap-3 text-sm text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs text-[#5a6478] w-16 shrink-0">{shortDate(s.date)}</span>
                              <span
                                className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 shrink-0 ${
                                  s.type === 'match' ? 'bg-[#fee11b] text-[#01255f]' : 'bg-gray-100 text-[#5a6478]'
                                }`}
                              >
                                {s.type}
                              </span>
                              <span className="text-[#01255f] font-medium truncate">{s.coachName}</span>
                              <Pencil size={11} className="text-[#5a6478] shrink-0" />
                            </div>
                            <span className="font-bold text-[#01255f] shrink-0">{s.total} / {s.maxTotal}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Comments */}
              <div className="bg-white border border-gray-200 p-4 sm:p-5">
                <h2 className="font-bold text-[#01255f] mb-4">Coach Comments</h2>
                {data.report.comments.length === 0 ? (
                  <p className="text-sm text-[#5a6478]">No comments recorded for this period.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.report.comments.map((c) => (
                      <li key={c.evaluationId} className="border-l-2 border-[#fee11b] pl-3">
                        <p className="text-xs text-[#5a6478] mb-0.5">{shortDate(c.date)} · <span className="font-bold text-[#01255f]">{c.coachName}</span></p>
                        <p className="text-sm text-[#01255f]">{c.comment}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <ExportDialog
        open={exportOpen}
        onClose={() => { setExportOpen(false); setExportError('') }}
        playerSelected={!!playerId}
        onExport={handleExport}
        exporting={exporting}
      />
      {exportOpen && exportError && (
        <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 shadow-lg">{exportError}</div>
        </div>
      )}
    </div>
  )
}
