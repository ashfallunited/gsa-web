'use client'

import { useEffect, useState, useCallback } from 'react'
import PlayerAvatar from '@/components/admin/player-avatar'
import AdminLoadError from '@/components/AdminLoadError'
import { fetchAdminJson } from '@/lib/admin-fetch'
import { inputClass, labelClass } from '@/components/admin/analytics-filters'
import { TEAM_LABELS, TEAM_SLUG } from '@/lib/teams'
import type { PlayerSeasonTotals } from '@/lib/analytics/types'

type PlayerLookup = { id: string; name?: string; number?: number; position?: string; team?: string; image?: string }

function makeZeroTotals(p: PlayerLookup): PlayerSeasonTotals {
  return {
    playerId: p.id,
    playerName: p.name ?? 'Unknown',
    playerNumber: p.number ?? 0,
    playerPosition: p.position ?? '',
    playerImage: p.image,
    team: p.team ?? '',
    appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0,
    yellowCards: 0, redCards: 0,
    headerGoals: 0, leftFootGoals: 0, rightFootGoals: 0, outsideBoxGoals: 0,
    penaltiesTaken: 0, penaltiesScored: 0, penaltiesSaved: 0, penaltiesFaced: 0,
  }
}

function per90(value: number, minutes: number) {
  if (minutes < 1) return 0
  return (value / minutes) * 90
}

function StatRow({
  label,
  a,
  b,
  format = (v) => String(v),
  accent = false,
}: {
  label: string
  a: number
  b: number
  format?: (v: number) => string
  accent?: boolean
}) {
  const max = Math.max(a, b, 0.01)
  const pctA = (a / max) * 100
  const pctB = (b / max) * 100
  const aWins = a > b
  const bWins = b > a

  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 border-b border-gray-100 last:border-0 ${accent ? 'bg-[#fee11b]/5 -mx-4 px-4 sm:-mx-6 sm:px-6' : ''}`}>
      {/* Player A side */}
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm font-black text-[#01255f]">
          {format(a)}
        </span>
        <div className="w-full flex justify-end h-2">
          <div
            className="h-2 rounded-sm transition-all duration-500 bg-[#01255f]"
            style={{ width: `${pctA}%` }}
          />
        </div>
      </div>

      {/* Label */}
      <div className="text-center w-16 sm:w-28 lg:w-36 shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-[#5a6478] font-bold">{label}</span>
      </div>

      {/* Player B side */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-black text-[#01255f]">
          {format(b)}
        </span>
        <div className="w-full h-2">
          <div
            className="h-2 rounded-sm transition-all duration-500 bg-[#fee11b]"
            style={{ width: `${pctB}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function PlayerPanel({
  total,
  lookup,
  side,
}: {
  total: PlayerSeasonTotals | null
  lookup?: PlayerLookup
  side: 'A' | 'B'
}) {
  const isA = side === 'A'

  if (!total) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-8 ${isA ? 'bg-[#01255f]' : 'bg-[#fee11b]'} min-h-[200px]`}>
        <p className={`text-sm font-bold ${isA ? 'text-white/40' : 'text-[#01255f]/40'}`}>
          Select Player {side}
        </p>
      </div>
    )
  }

  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-6 sm:p-8 ${isA ? 'bg-[#01255f]' : 'bg-[#fee11b]'}`}>
      <div className={`ring-4 ${isA ? 'ring-white/20' : 'ring-[#01255f]/20'} rounded-full`}>
        <PlayerAvatar image={lookup?.image} name={total.playerName} size={80} />
      </div>
      <p
        className={`mt-4 text-xl font-black text-center leading-tight ${isA ? 'text-white' : 'text-[#01255f]'}`}
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {total.playerName}
      </p>
      <p className={`text-xs mt-1 ${isA ? 'text-white/60' : 'text-[#01255f]/60'}`}>
        #{total.playerNumber} · <span className="capitalize">{total.playerPosition}</span>
      </p>
      <span
        className={`mt-3 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 ${
          isA ? 'bg-white/15 text-white' : 'bg-[#01255f]/15 text-[#01255f]'
        }`}
      >
        {total.team.replace(/-/g, ' ')}
      </span>
    </div>
  )
}

export default function ComparisonPage() {
  const [team, setTeam] = useState<string>(TEAM_SLUG.firstTeam)
  const [season, setSeason] = useState('')
  const [allTotals, setAllTotals] = useState<PlayerSeasonTotals[]>([])
  const [allPlayers, setAllPlayers] = useState<PlayerLookup[]>([])
  const [playerLookup, setPlayerLookup] = useState<Record<string, PlayerLookup>>({})
  const [seasons, setSeasons] = useState<string[]>([])
  const [playerA, setPlayerA] = useState('')
  const [playerB, setPlayerB] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ team })
      if (season) params.set('season', season)
      const [totalsRes, listRes] = await Promise.all([
        fetchAdminJson<{ totals: PlayerSeasonTotals[]; seasons: string[] }>(`/api/admin/analytics/players?${params}`),
        fetchAdminJson<{ players: PlayerLookup[] }>(`/api/admin/analytics/players-list?team=${team}`),
      ])
      setAllTotals(totalsRes.totals)
      setSeasons(totalsRes.seasons)
      setAllPlayers(listRes.players as PlayerLookup[])
      const map: Record<string, PlayerLookup> = {}
      for (const p of listRes.players) map[p.id] = p as PlayerLookup
      setPlayerLookup(map)
    } catch {
      setError('Failed to load player data.')
    } finally {
      setLoading(false)
    }
  }, [team, season])

  useEffect(() => {
    load()
    setPlayerA('')
    setPlayerB('')
  }, [load])

  const totalA = allTotals.find((t) => t.playerId === playerA) ?? (playerLookup[playerA] ? makeZeroTotals(playerLookup[playerA]) : null)
  const totalB = allTotals.find((t) => t.playerId === playerB) ?? (playerLookup[playerB] ? makeZeroTotals(playerLookup[playerB]) : null)

  const stats = totalA && totalB
    ? [
        { label: 'Appearances', a: totalA.appearances, b: totalB.appearances },
        { label: 'Starts', a: totalA.starts, b: totalB.starts },
        { label: 'Minutes', a: totalA.minutes, b: totalB.minutes },
        { label: 'Goals', a: totalA.goals, b: totalB.goals, accent: true },
        { label: 'Assists', a: totalA.assists, b: totalB.assists, accent: true },
        { label: 'Yellow Cards', a: totalA.yellowCards, b: totalB.yellowCards },
        { label: 'Red Cards', a: totalA.redCards, b: totalB.redCards },
        {
          label: 'Goals / 90',
          a: per90(totalA.goals, totalA.minutes),
          b: per90(totalB.goals, totalB.minutes),
          format: (v: number) => v.toFixed(2),
          accent: true,
        },
        {
          label: 'Assists / 90',
          a: per90(totalA.assists, totalA.minutes),
          b: per90(totalB.assists, totalB.minutes),
          format: (v: number) => v.toFixed(2),
          accent: true,
        },
      ]
    : []

  const playerOptions = allPlayers.length > 0
    ? allPlayers.map((p) => ({ id: p.id, name: p.name ?? 'Unknown', number: p.number ?? 0 }))
    : allTotals.map((t) => ({ id: t.playerId, name: t.playerName, number: t.playerNumber }))

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1
          className="text-2xl sm:text-3xl font-black text-[#01255f]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Comparison Matrix
        </h1>
        <p className="text-sm text-[#5a6478] mt-1">Compare two players head to head.</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-4 sm:p-5 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Team</label>
          <select value={team} onChange={(e) => setTeam(e.target.value)} className={inputClass}>
            <option value="all">All teams</option>
            <option value={TEAM_SLUG.firstTeam}>{TEAM_LABELS[TEAM_SLUG.firstTeam]}</option>
            <option value={TEAM_SLUG.academy}>{TEAM_LABELS[TEAM_SLUG.academy]}</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Season</label>
          <select value={season} onChange={(e) => setSeason(e.target.value)} className={inputClass}>
            <option value="">All seasons</option>
            {seasons.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Player selectors */}
      <div className="bg-white border border-gray-200 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0 divide-gray-100">
          <div className="p-4">
            <label className={labelClass}>Player A</label>
            <select
              value={playerA}
              onChange={(e) => setPlayerA(e.target.value)}
              className={inputClass}
              disabled={loading}
            >
              <option value="">Select player…</option>
              {playerOptions.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === playerB}>
                  #{p.number} {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="p-4">
            <label className={labelClass}>Player B</label>
            <select
              value={playerB}
              onChange={(e) => setPlayerB(e.target.value)}
              className={inputClass}
              disabled={loading}
            >
              <option value="">Select player…</option>
              {playerOptions.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === playerA}>
                  #{p.number} {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <AdminLoadError message={error} />}

      {loading && (
        <div className="bg-white border border-gray-200 p-10 text-center text-sm text-[#5a6478]">
          Loading squad data…
        </div>
      )}

      {!loading && (!playerA || !playerB) && (
        <div className="bg-white border border-dashed border-gray-300 p-12 text-center">
          <p className="text-[#01255f] font-bold">Select two players above to compare</p>
          <p className="text-sm text-[#5a6478] mt-1">Stats are shown side by side with per-90 breakdowns.</p>
        </div>
      )}

      {totalA && totalB && (
        <div className="bg-white border border-gray-200 overflow-hidden">
          {/* Player header panels */}
          <div className="flex flex-col xs:flex-row sm:flex-row">
            <PlayerPanel total={totalA} lookup={playerLookup[playerA]} side="A" />

            {/* VS divider */}
            <div className="flex flex-row sm:flex-col items-center justify-center bg-white px-3 sm:px-5 z-10 shrink-0 py-2 sm:py-0">
              <div className="h-px w-full sm:w-px sm:h-auto sm:flex-1 bg-gray-200" />
              <span
                className="text-xs sm:text-sm font-black text-[#5a6478] py-2 sm:py-3 px-3 sm:px-0"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                VS
              </span>
              <div className="h-px w-full sm:w-px sm:h-auto sm:flex-1 bg-gray-200" />
            </div>

            <PlayerPanel total={totalB} lookup={playerLookup[playerB]} side="B" />
          </div>

          {/* Stat rows */}
          <div className="px-4 sm:px-6 py-2">
            {stats.map((s) => (
              <StatRow
                key={s.label}
                label={s.label}
                a={s.a}
                b={s.b}
                format={s.format}
                accent={s.accent}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 px-4 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-5 h-2.5 bg-[#01255f] rounded-sm" />
              <span className="text-xs font-bold text-[#5a6478]">{totalA.playerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-2.5 bg-[#fee11b] rounded-sm" />
              <span className="text-xs font-bold text-[#5a6478]">{totalB.playerName}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
