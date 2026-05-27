'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Download, AlertTriangle, X } from 'lucide-react'
import AnalyticsFilters, { type AnalyticsFiltersState } from '@/components/admin/analytics-filters'
import AdminLoadError from '@/components/AdminLoadError'
import PlayerAvatar from '@/components/admin/player-avatar'
import FormStrip from '@/components/admin/form-strip'
import { SkeletonTableRow } from '@/components/admin/skeleton'
import { fetchAdminJson } from '@/lib/admin-fetch'
import type { PlayerSeasonTotals } from '@/lib/analytics/types'

type PlayerLogEntry = {
  matchDate: string
  opponent: string
  competition: string
  season: string
  result: 'W' | 'D' | 'L'
  matchStatus: string
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  started: boolean
  headerGoals?: number
  leftFootGoals?: number
  rightFootGoals?: number
  outsideBoxGoals?: number
  penaltiesTaken?: number
  penaltiesScored?: number
  penaltiesSaved?: number
  penaltiesFaced?: number
}

type Injury = { description?: string; injuredDate: string; expectedReturn?: string }

type PlayerMeta = {
  name: string
  number: number
  position: string
  team: string
  image?: string
  source?: string
  showOnSite?: boolean
  height?: number
  weight?: number
  preferredFoot?: string
  injury?: Injury | null
} | null

type PlayerLookup = {
  id: string
  image?: string
  source?: string
  showOnSite?: boolean
}

export default function PlayerStatsPage() {
  const [filters, setFilters] = useState<AnalyticsFiltersState>({ team: 'first-team', season: '', competition: '' })
  const [totals, setTotals] = useState<PlayerSeasonTotals[]>([])
  const [seasons, setSeasons] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [log, setLog] = useState<PlayerLogEntry[]>([])
  const [selectedMeta, setSelectedMeta] = useState<PlayerMeta>(null)
  const [selectedTotal, setSelectedTotal] = useState<PlayerSeasonTotals | null>(null)
  const [playerLookup, setPlayerLookup] = useState<Record<string, PlayerLookup>>({})
  const [statusFilter, setStatusFilter] = useState<'all' | 'official' | 'trial'>('all')
  const [gradesheetSeason, setGradesheetSeason] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadingLog, setLoadingLog] = useState(false)
  const [error, setError] = useState('')
  const [showInjuryForm, setShowInjuryForm] = useState(false)
  const [injuryForm, setInjuryForm] = useState({ description: '', injuredDate: new Date().toISOString().slice(0, 10), expectedReturn: '' })
  const [savingInjury, setSavingInjury] = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)

  const loadTotals = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ team: filters.team })
      if (filters.season) params.set('season', filters.season)
      const res = await fetchAdminJson<{ totals: PlayerSeasonTotals[]; seasons: string[] }>(
        `/api/admin/analytics/players?${params}`
      )
      setTotals(res.totals)
      setSeasons(res.seasons)
      const playersRes = await fetchAdminJson<{ players: PlayerLookup[] }>(
        `/api/admin/analytics/players-list?team=${filters.team}`
      )
      const map: Record<string, PlayerLookup> = {}
      for (const player of playersRes.players) {
        map[player.id] = player
      }
      setPlayerLookup(map)
    } catch {
      setError('Failed to load player stats.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadPlayerLog = useCallback(async (playerId: string) => {
    setLoadingLog(true)
    const params = new URLSearchParams({ team: filters.team, playerId })
    if (filters.season) params.set('season', filters.season)
    try {
      const res = await fetchAdminJson<{ log: PlayerLogEntry[]; meta: PlayerMeta; total: PlayerSeasonTotals | null }>(
        `/api/admin/analytics/players?${params}`
      )
      setLog(res.log)
      setSelectedMeta(res.meta)
      setSelectedTotal(res.total)
    } finally {
      setLoadingLog(false)
    }
  }, [filters])

  const saveInjury = async () => {
    if (!selectedId || !injuryForm.injuredDate) return
    setSavingInjury(true)
    try {
      await fetch(`/api/admin/players/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          injury: {
            injuredDate: injuryForm.injuredDate,
            expectedReturn: injuryForm.expectedReturn || undefined,
            description: injuryForm.description || undefined,
          },
        }),
      })
      setShowInjuryForm(false)
      await loadPlayerLog(selectedId)
    } finally {
      setSavingInjury(false)
    }
  }

  const clearInjury = async () => {
    if (!selectedId) return
    setSavingInjury(true)
    try {
      await fetch(`/api/admin/players/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ injury: null }),
      })
      await loadPlayerLog(selectedId)
    } finally {
      setSavingInjury(false)
    }
  }

  useEffect(() => {
    loadTotals()
  }, [loadTotals])

  useEffect(() => {
    if (selectedId) {
      setShowInjuryForm(false)
      loadPlayerLog(selectedId)
      if (window.innerWidth < 1024) {
        setTimeout(() => profileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      }
    }
  }, [selectedId, loadPlayerLog])

  const filteredTotals = totals.filter((player) => {
    if (statusFilter === 'all') return true
    const lookup = playerLookup[player.playerId]
    const isTrial = lookup?.source === 'trial' || lookup?.showOnSite === false
    return statusFilter === 'trial' ? isTrial : !isTrial
  })

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
          Player Stats
        </h1>
        <p className="text-sm text-[#5a6478] mt-1">Season totals and per-match logs.</p>
      </div>

      <div className="bg-white border border-gray-200 p-4 sm:p-5 mb-6">
        <AnalyticsFilters filters={filters} seasons={seasons} competitions={[]} onChange={(f) => { setFilters(f); setSelectedId(null) }} />
        <div className="mt-3 flex flex-wrap gap-2">
          {(['all', 'official', 'trial'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatusFilter(item)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${
                statusFilter === item
                  ? 'bg-[#01255f] text-white'
                  : 'border border-gray-200 text-[#5a6478] hover:border-[#01255f]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error && <AdminLoadError message={error} />}

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-[#5a6478] border-b bg-gray-50">
                <th className="p-3">Player</th>
                <th className="p-3">Apps</th>
                <th className="p-3">Min</th>
                <th className="p-3">G</th>
                <th className="p-3">A</th>
                <th className="p-3">Y/R</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}
              {!loading && filteredTotals.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-[#5a6478]">No stats recorded yet.</td></tr>
              )}
              {filteredTotals.map((t) => (
                <tr
                  key={t.playerId}
                  onClick={() => setSelectedId(t.playerId)}
                  className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${selectedId === t.playerId ? 'bg-[#fee11b]/20' : ''}`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar image={playerLookup[t.playerId]?.image ?? t.playerImage} name={t.playerName} size={28} />
                      <div className="min-w-0">
                        <span className="font-medium text-[#01255f]">{t.playerName}</span>
                        <span className="text-[#5a6478] text-xs ml-1">#{t.playerNumber}</span>
                        <span className={`ml-2 text-[10px] uppercase font-bold px-1.5 py-0.5 ${playerLookup[t.playerId]?.source === 'trial' || playerLookup[t.playerId]?.showOnSite === false ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {playerLookup[t.playerId]?.source === 'trial' || playerLookup[t.playerId]?.showOnSite === false ? 'Trial' : 'Official'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{t.appearances}</td>
                  <td className="p-3">{t.minutes}</td>
                  <td className="p-3 font-bold">{t.goals}</td>
                  <td className="p-3">{t.assists}</td>
                  <td className="p-3 text-[#5a6478]">{t.yellowCards}/{t.redCards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4" ref={profileRef}>
          <div className="bg-white border border-gray-200 p-4 sm:p-5">
            <h2 className="font-bold text-[#01255f] mb-4">Player Profile</h2>
            {!selectedId && <p className="text-sm text-[#5a6478]">Select a player to view individual analytics.</p>}
            {selectedId && selectedMeta && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <PlayerAvatar image={selectedMeta.image} name={selectedMeta.name} size={64} />
                  <div className="min-w-0">
                    <p className="text-xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
                      {selectedMeta.name}
                    </p>
                    <p className="text-xs text-[#5a6478]">
                      #{selectedMeta.number} · {selectedMeta.position} · {selectedMeta.team}
                    </p>
                    {log.length > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] uppercase tracking-widest text-[#5a6478] font-bold shrink-0">Form</span>
                        <FormStrip
                          results={[...log].slice(0, 5).map((e) => e.result)}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {(selectedMeta.height || selectedMeta.weight || selectedMeta.preferredFoot) && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {selectedMeta.height && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#5a6478]">Height</p>
                        <p className="text-sm font-bold text-[#01255f]">{selectedMeta.height} cm</p>
                      </div>
                    )}
                    {selectedMeta.weight && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#5a6478]">Weight</p>
                        <p className="text-sm font-bold text-[#01255f]">{selectedMeta.weight} kg</p>
                      </div>
                    )}
                    {selectedMeta.preferredFoot && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#5a6478]">Pref. Foot</p>
                        <p className="text-sm font-bold text-[#01255f] capitalize">{selectedMeta.preferredFoot}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Injury status */}
                <div className="border-t border-gray-100 pt-3">
                  {selectedMeta.injury ? (
                    <div className="bg-red-50 border border-red-200 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                          <AlertTriangle size={12} /> Injured
                        </p>
                        <button
                          onClick={clearInjury}
                          disabled={savingInjury}
                          className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          <X size={11} /> Clear
                        </button>
                      </div>
                      <p className="text-xs text-red-600">Since {selectedMeta.injury.injuredDate}</p>
                      {selectedMeta.injury.expectedReturn && (
                        <p className="text-xs text-red-600">Returns {selectedMeta.injury.expectedReturn}</p>
                      )}
                      {selectedMeta.injury.description && (
                        <p className="text-xs text-[#5a6478] italic">{selectedMeta.injury.description}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      {!showInjuryForm ? (
                        <button
                          onClick={() => {
                            setInjuryForm({ description: '', injuredDate: new Date().toISOString().slice(0, 10), expectedReturn: '' })
                            setShowInjuryForm(true)
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#5a6478] hover:text-red-600 transition-colors"
                        >
                          <AlertTriangle size={12} /> Mark as Injured
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold">Log Injury</p>
                          <input
                            type="date"
                            value={injuryForm.injuredDate}
                            onChange={(e) => setInjuryForm((f) => ({ ...f, injuredDate: e.target.value }))}
                            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                          />
                          <input
                            type="date"
                            placeholder="Expected return"
                            value={injuryForm.expectedReturn}
                            onChange={(e) => setInjuryForm((f) => ({ ...f, expectedReturn: e.target.value }))}
                            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                          />
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            value={injuryForm.description}
                            onChange={(e) => setInjuryForm((f) => ({ ...f, description: e.target.value }))}
                            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveInjury}
                              disabled={savingInjury || !injuryForm.injuredDate}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 text-xs font-bold disabled:opacity-50"
                            >
                              {savingInjury ? 'Saving…' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setShowInjuryForm(false)}
                              className="border border-gray-200 px-4 py-2 text-xs font-bold text-[#5a6478]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label: 'Apps', value: selectedTotal?.appearances ?? 0 },
                    { label: 'Minutes', value: selectedTotal?.minutes ?? 0 },
                    { label: 'Goals', value: selectedTotal?.goals ?? 0 },
                    { label: 'Assists', value: selectedTotal?.assists ?? 0 },
                    { label: 'Yellow', value: selectedTotal?.yellowCards ?? 0 },
                    { label: 'Red', value: selectedTotal?.redCards ?? 0 },
                  ] as const).map(({ label, value }) => (
                    <div key={label} className="border border-gray-200 p-2">
                      <p className="text-[10px] uppercase tracking-widest text-[#5a6478]">{label}</p>
                      <p className="font-bold text-[#01255f]">{value}</p>
                    </div>
                  ))}
                </div>

                {selectedTotal && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold mb-2">Goal Breakdown</p>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { label: 'Header', value: selectedTotal.headerGoals },
                        { label: 'Left Foot', value: selectedTotal.leftFootGoals },
                        { label: 'Right Foot', value: selectedTotal.rightFootGoals },
                        { label: 'Out of Box', value: selectedTotal.outsideBoxGoals },
                      ] as const).map(({ label, value }) => (
                        <div key={label} className="border border-gray-200 p-2">
                          <p className="text-[10px] uppercase tracking-widest text-[#5a6478]">{label}</p>
                          <p className="font-bold text-[#01255f]">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTotal && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold mb-2">Penalty Stats</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { label: 'Taken', value: selectedTotal.penaltiesTaken },
                        { label: 'Scored', value: selectedTotal.penaltiesScored },
                        { label: 'Saved', value: selectedTotal.penaltiesSaved },
                        { label: 'Faced', value: selectedTotal.penaltiesFaced },
                      ] as const).map(({ label, value }) => (
                        <div key={label} className="border border-gray-200 p-2">
                          <p className="text-[10px] uppercase tracking-widest text-[#5a6478]">{label}</p>
                          <p className="font-bold text-[#01255f]">
                            {value}
                            {label === 'Scored' && selectedTotal.penaltiesTaken > 0 && (
                              <span className="text-xs font-normal text-[#5a6478] ml-1">
                                ({Math.round((selectedTotal.penaltiesScored / selectedTotal.penaltiesTaken) * 100)}%)
                              </span>
                            )}
                            {label === 'Saved' && selectedTotal.penaltiesFaced > 0 && (
                              <span className="text-xs font-normal text-[#5a6478] ml-1">
                                ({Math.round((selectedTotal.penaltiesSaved / selectedTotal.penaltiesFaced) * 100)}%)
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Season comparison */}
                {log.length > 0 && (() => {
                  const bySeason: Record<string, { apps: number; goals: number; assists: number; minutes: number }> = {}
                  for (const entry of log) {
                    const s = entry.season || '—'
                    if (!bySeason[s]) bySeason[s] = { apps: 0, goals: 0, assists: 0, minutes: 0 }
                    bySeason[s].apps++
                    bySeason[s].goals += entry.goals
                    bySeason[s].assists += entry.assists
                    bySeason[s].minutes += entry.minutes
                  }
                  const rows = Object.entries(bySeason).sort(([a], [b]) => b.localeCompare(a))
                  if (rows.length < 2) return null
                  return (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold mb-2">Season Comparison</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-[9px] uppercase tracking-widest text-[#5a6478] border-b border-gray-100">
                              <th className="pb-1.5 pr-3">Season</th>
                              <th className="pb-1.5 pr-2 text-center">Apps</th>
                              <th className="pb-1.5 pr-2 text-center">G</th>
                              <th className="pb-1.5 pr-2 text-center">A</th>
                              <th className="pb-1.5 text-center">Min</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(([season, s]) => (
                              <tr key={season} className="border-b border-gray-50 last:border-0">
                                <td className="py-1.5 pr-3 font-medium text-[#01255f]">{season}</td>
                                <td className="py-1.5 pr-2 text-center text-[#5a6478]">{s.apps}</td>
                                <td className="py-1.5 pr-2 text-center font-bold text-[#01255f]">{s.goals}</td>
                                <td className="py-1.5 pr-2 text-center text-[#5a6478]">{s.assists}</td>
                                <td className="py-1.5 text-center text-[#5a6478]">{s.minutes}&apos;</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })()}

                {/* Gradesheet download */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold">Download Report</p>
                  <div className="flex items-center gap-2">
                    <select
                      value={gradesheetSeason}
                      onChange={(e) => setGradesheetSeason(e.target.value)}
                      className="flex-1 border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#01255f]"
                    >
                      <option value="">All Time</option>
                      {seasons.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <a
                      href={`/api/admin/analytics/players/${selectedId}/gradesheet?team=${filters.team}${gradesheetSeason ? `&season=${gradesheetSeason}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-[#01255f] hover:bg-[#011840] text-white px-4 py-2 text-sm font-bold whitespace-nowrap"
                    >
                      <Download size={14} />
                      PDF
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 p-4 sm:p-5">
            <h2 className="font-bold text-[#01255f] mb-4">Match Log</h2>
            {!selectedId && <p className="text-sm text-[#5a6478]">Select a player to view their match-by-match stats.</p>}
            {selectedId && loadingLog && <p className="text-sm text-[#5a6478]">Loading player log…</p>}
            {selectedId && !loadingLog && log.length === 0 && <p className="text-sm text-[#5a6478]">No match entries for this player.</p>}
          <ul className="space-y-3">
            {log.map((entry, i) => (
              <li key={`${entry.matchDate}-${i}`} className="border-b border-gray-100 pb-3 text-sm">
                <div className="flex justify-between font-medium text-[#01255f]">
                  <span>{entry.matchDate} vs {entry.opponent}</span>
                  <span className={`text-xs px-1.5 py-0.5 ${entry.result === 'W' ? 'bg-green-100 text-green-800' : entry.result === 'L' ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}>
                    {entry.result}
                  </span>
                </div>
                <p className="text-xs text-[#5a6478] mt-0.5">{entry.competition} · {entry.minutes}&apos; {entry.started ? '(started)' : ''}</p>
                <p className="text-xs mt-1">{entry.goals}G {entry.assists}A · {entry.yellowCards}Y {entry.redCards}R</p>
                {(entry.penaltiesTaken ?? 0) > 0 || (entry.penaltiesSaved ?? 0) > 0 || (entry.penaltiesFaced ?? 0) > 0 ? (
                  <p className="text-[10px] text-[#5a6478] mt-0.5">
                    {(entry.penaltiesTaken ?? 0) > 0 && `Pen: ${entry.penaltiesScored ?? 0}/${entry.penaltiesTaken}`}
                    {(entry.penaltiesSaved ?? 0) > 0 && ` · Saved: ${entry.penaltiesSaved}/${entry.penaltiesFaced ?? 0}`}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
