'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback, use } from 'react'
import { Copy, Save, Trash2, Download, Plus, UserPlus } from 'lucide-react'
import AdminLoadError from '@/components/AdminLoadError'
import ComboInput from '@/components/admin/combo-input'
import { MatchStatDesktopTable, MatchStatMobileCard } from '@/components/admin/match-stat-grid'
import { inputClass, labelClass } from '@/components/admin/analytics-filters'
import { useAnalyticsLookups } from '@/lib/analytics/use-lookups'
import { fetchAdminJson } from '@/lib/admin-fetch'
import type { Match, MatchPlayerStat } from '@/lib/analytics/types'
import { TEAM_LABELS, playerMatchesTeamFilter } from '@/lib/teams'

type PlayerOption = { id: string; name: string; number: number; position: string; team: string }

type StatRow = {
  playerId: string
  started: boolean
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  notes: string
  headerGoals: number
  leftFootGoals: number
  rightFootGoals: number
  outsideBoxGoals: number
  penaltiesTaken: number
  penaltiesScored: number
  penaltiesSaved: number
  penaltiesFaced: number
  goalMinutes: number[]
  assistMinutes: number[]
}

function emptyStat(playerId: string): StatRow {
  return {
    playerId, started: false, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, notes: '',
    headerGoals: 0, leftFootGoals: 0, rightFootGoals: 0, outsideBoxGoals: 0,
    penaltiesTaken: 0, penaltiesScored: 0, penaltiesSaved: 0, penaltiesFaced: 0,
    goalMinutes: [], assistMinutes: [],
  }
}

function buildStatRows(teamPlayers: PlayerOption[], existingStats: MatchPlayerStat[]): StatRow[] {
  const statMap = new Map(existingStats.map((s) => [s.playerId, s]))
  return teamPlayers.map((p) => {
    const existing = statMap.get(p.id)
    if (!existing) return emptyStat(p.id)
    return {
      playerId: p.id,
      started: existing.started,
      minutes: existing.minutes,
      goals: existing.goals,
      assists: existing.assists,
      yellowCards: existing.yellowCards,
      redCards: existing.redCards,
      notes: existing.notes,
      headerGoals: existing.headerGoals ?? 0,
      leftFootGoals: existing.leftFootGoals ?? 0,
      rightFootGoals: existing.rightFootGoals ?? 0,
      outsideBoxGoals: existing.outsideBoxGoals ?? 0,
      penaltiesTaken: existing.penaltiesTaken ?? 0,
      penaltiesScored: existing.penaltiesScored ?? 0,
      penaltiesSaved: existing.penaltiesSaved ?? 0,
      penaltiesFaced: existing.penaltiesFaced ?? 0,
      goalMinutes: existing.goalMinutes ?? [],
      assistMinutes: existing.assistMinutes ?? [],
    }
  })
}

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [match, setMatch] = useState<Match | null>(null)
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [statRows, setStatRows] = useState<StatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [newPlayer, setNewPlayer] = useState({ name: '', number: 0, position: 'midfielder' })

  const { lookups } = useAnalyticsLookups(match?.team ?? 'first-team')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [matchRes, playersRes, sessionRes] = await Promise.all([
        fetchAdminJson<{ match: Match; stats: MatchPlayerStat[] }>(`/api/admin/matches/${id}`),
        fetchAdminJson<{ players: PlayerOption[] }>(`/api/admin/analytics/players-list?team=all`),
        fetchAdminJson<{ isSuperAdmin: boolean }>('/api/admin/session'),
      ])

      setMatch(matchRes.match)
      setIsLocked(matchRes.match.status === 'final' && !sessionRes.isSuperAdmin)

      const teamPlayers = playersRes.players.filter((p) =>
        playerMatchesTeamFilter(p.team, matchRes.match.team)
      )
      setPlayers(teamPlayers)
      setStatRows(buildStatRows(teamPlayers, matchRes.stats))
    } catch {
      setError('Failed to load match.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const updateMatchField = (field: keyof Match, value: string | number) => {
    if (!match) return
    setMatch({ ...match, [field]: value })
  }

  const updateStat = (playerId: string, field: keyof StatRow, value: boolean | number | string) => {
    setStatRows((rows) => rows.map((r) => (r.playerId === playerId ? { ...r, [field]: value } : r)))
  }

  const updateStatMinute = (
    playerId: string,
    field: 'goalMinutes' | 'assistMinutes',
    index: number,
    value: number
  ) => {
    setStatRows((rows) =>
      rows.map((r) => {
        if (r.playerId !== playerId) return r
        const arr = [...(r[field] ?? [])]
        arr[index] = value
        return { ...r, [field]: arr }
      })
    )
  }

  const saveMatch = async () => {
    if (!match) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch(`/api/admin/matches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(match),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to save match.')
        return
      }
      setMessage('Match saved.')
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const saveStats = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const activeStats = statRows.filter(
        (r) =>
          r.minutes > 0 || r.started || r.goals > 0 || r.assists > 0 || r.yellowCards > 0 || r.redCards > 0 ||
          r.penaltiesTaken > 0 || r.penaltiesSaved > 0 || r.penaltiesFaced > 0
      )
      const res = await fetch(`/api/admin/matches/${id}/stats`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: activeStats }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to save stats.')
        return
      }
      setMessage(`Saved ${activeStats.length} player stat rows.`)
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const addPlayer = async () => {
    if (!match || !newPlayer.name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/analytics/players-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPlayer, team: match.team, number: Number(newPlayer.number) }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        setError(payload.error ?? 'Failed to add player.')
        return
      }
      const created = (await res.json()) as PlayerOption
      setPlayers((prev) => [...prev, created])
      setStatRows((prev) => [...prev, emptyStat(created.id)])
      setNewPlayer({ name: '', number: 0, position: 'midfielder' })
      setShowAddPlayer(false)
      setMessage(`Added ${created.name} to squad.`)
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const duplicate = async () => {
    const res = await fetch(`/api/admin/matches/${id}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const data = (await res.json()) as { id: string }
      window.location.href = `/admin/analytics/matches/${data.id}`
    }
  }

  const remove = async () => {
    if (!confirm('Delete this match and all player stats?')) return
    const res = await fetch(`/api/admin/matches/${id}`, { method: 'DELETE' })
    if (res.ok) window.location.href = '/admin/analytics/matches'
    else {
      const data = await res.json().catch(() => ({}))
      setError((data as { error?: string }).error ?? 'Cannot delete match.')
    }
  }

  const playerName = (playerId: string) => players.find((p) => p.id === playerId)?.name ?? playerId

  if (loading) return <div className="p-8 text-sm text-[#5a6478]">Loading match…</div>
  if (error && !match) return <div className="p-8"><AdminLoadError message={error} /></div>
  if (!match) return null

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/analytics/matches" className="text-xs text-[#5a6478] hover:text-[#01255f] mb-2 inline-block">
          ← Back to matches
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
              vs {match.opponent}
            </h1>
            <p className="text-sm text-[#5a6478] mt-1">{match.date} · {match.competition} · {match.season}</p>
            {isLocked && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 mt-2 inline-block">
                Finalized — core fields and stats are locked for analysts.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/admin/analytics/export?type=match-report&matchId=${id}`} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-bold text-[#01255f] hover:bg-gray-50">
              <Download size={14} /> Export
            </a>
            <button type="button" onClick={duplicate} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-bold text-[#01255f] hover:bg-gray-50">
              <Copy size={14} /> Duplicate
            </button>
            {!isLocked && (
              <button type="button" onClick={remove} className="inline-flex items-center gap-1.5 border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">{error}</div>}
      {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 mb-4">{message}</div>}

      <div className="bg-white border border-gray-200 p-4 sm:p-6 space-y-4 mb-6">
        <h2 className="font-bold text-[#01255f]">Match Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Team</label>
            <select value={match.team} onChange={(e) => updateMatchField('team', e.target.value)} className={inputClass} disabled={isLocked}>
              {Object.entries(TEAM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <ComboInput label="Season" listId="edit-season" value={match.season} options={lookups.seasons} onChange={(v) => updateMatchField('season', v)} disabled={isLocked} />
          <div>
            <label className={labelClass}>Date</label>
            <input type="date" value={match.date} onChange={(e) => updateMatchField('date', e.target.value)} className={inputClass} disabled={isLocked} />
          </div>
          <ComboInput label="Opponent" listId="edit-opponent" value={match.opponent} options={lookups.opponents} onChange={(v) => updateMatchField('opponent', v)} disabled={isLocked} />
          <ComboInput label="Competition / League" listId="edit-competition" value={match.competition} options={lookups.competitions} onChange={(v) => updateMatchField('competition', v)} disabled={isLocked} />
          <div>
            <label className={labelClass}>Home / Away</label>
            <select value={match.homeAway} onChange={(e) => updateMatchField('homeAway', e.target.value)} className={inputClass} disabled={isLocked}>
              <option value="home">Home</option>
              <option value="away">Away</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Goals For</label>
            <input type="number" min={0} value={match.goalsFor} onChange={(e) => updateMatchField('goalsFor', Number(e.target.value))} className={inputClass} disabled={isLocked} />
          </div>
          <div>
            <label className={labelClass}>Goals Against</label>
            <input type="number" min={0} value={match.goalsAgainst} onChange={(e) => updateMatchField('goalsAgainst', Number(e.target.value))} className={inputClass} disabled={isLocked} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={match.status} onChange={(e) => updateMatchField('status', e.target.value)} className={inputClass} disabled={isLocked}>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea value={match.notes} onChange={(e) => updateMatchField('notes', e.target.value)} rows={2} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Highlight Video URL <span className="font-normal normal-case text-gray-400">(YouTube link)</span></label>
          <input
            type="url"
            value={match.highlightUrl ?? ''}
            onChange={(e) => setMatch({ ...match, highlightUrl: e.target.value || undefined })}
            className={inputClass}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
        <div>
          <label className={labelClass}>Match Report <span className="font-normal normal-case text-gray-400">(public writeup)</span></label>
          <textarea
            value={match.report ?? ''}
            onChange={(e) => setMatch({ ...match, report: e.target.value || undefined })}
            rows={5}
            className={inputClass}
            placeholder="Write a match report — key moments, standout performances, tactical notes…"
          />
        </div>
        <button type="button" onClick={saveMatch} disabled={saving} className="inline-flex items-center gap-2 bg-[#01255f] text-white px-5 py-2 text-sm font-bold disabled:opacity-50">
          <Save size={14} /> Save Match
        </button>
      </div>

      <div className="bg-white border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-bold text-[#01255f]">Player Stats</h2>
          <div className="flex flex-wrap gap-2">
            {!isLocked && (
              <>
                <button type="button" onClick={() => setShowAddPlayer((v) => !v)} className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-bold text-[#01255f]">
                  <UserPlus size={14} /> Add Player
                </button>
                <button type="button" onClick={saveStats} disabled={saving} className="inline-flex items-center gap-2 bg-[#fee11b] text-[#01255f] px-4 py-2 text-sm font-bold disabled:opacity-50">
                  <Save size={14} /> Save Stats
                </button>
              </>
            )}
          </div>
        </div>

        {showAddPlayer && !isLocked && (
          <div className="border border-dashed border-[#01255f]/30 p-4 mb-4 space-y-3 bg-[#01255f]/5">
            <p className="text-sm font-bold text-[#01255f]">Quick add player to this squad</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" placeholder="Name" value={newPlayer.name} onChange={(e) => setNewPlayer((p) => ({ ...p, name: e.target.value }))} className={inputClass} />
              <input type="number" placeholder="#" min={0} max={99} value={newPlayer.number} onChange={(e) => setNewPlayer((p) => ({ ...p, number: Number(e.target.value) }))} className={inputClass} />
              <select value={newPlayer.position} onChange={(e) => setNewPlayer((p) => ({ ...p, position: e.target.value }))} className={inputClass}>
                <option value="goalkeeper">Goalkeeper</option>
                <option value="defender">Defender</option>
                <option value="midfielder">Midfielder</option>
                <option value="forward">Forward</option>
              </select>
            </div>
            <button type="button" onClick={addPlayer} disabled={saving} className="inline-flex items-center gap-1.5 bg-[#01255f] text-white px-4 py-2 text-xs font-bold">
              <Plus size={14} /> Save Player
            </button>
          </div>
        )}

        {players.length === 0 && (
          <div className="text-center py-10 border border-dashed border-gray-300">
            <p className="font-bold text-[#01255f] mb-2">No players in this squad</p>
            <p className="text-sm text-[#5a6478] mb-4">Add players before entering match stats.</p>
            <Link href="/admin/analytics/squad" className="inline-flex items-center gap-2 bg-[#fee11b] text-[#01255f] px-4 py-2 text-sm font-bold mr-2">
              Manage Squad
            </Link>
            <button type="button" onClick={() => setShowAddPlayer(true)} className="inline-flex items-center gap-2 border border-[#01255f] text-[#01255f] px-4 py-2 text-sm font-bold">
              Quick Add
            </button>
          </div>
        )}

        {players.length > 0 && (
          <>
            <MatchStatDesktopTable
              rows={statRows}
              playerName={playerName}
              isLocked={isLocked}
              onChange={updateStat}
              onMinuteChange={(playerId, field, index, value) => updateStatMinute(playerId, field, index, value)}
            />
            <div className="md:hidden space-y-3 mt-4 pb-20">
              {statRows.map((row) => (
                <MatchStatMobileCard
                  key={row.playerId}
                  name={playerName(row.playerId)}
                  row={row}
                  isLocked={isLocked}
                  onChange={(field, value) => updateStat(row.playerId, field, value)}
                  onMinuteChange={(field, index, value) => updateStatMinute(row.playerId, field, index, value)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sticky save bar — mobile only */}
      {!isLocked && players.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
          <button
            type="button"
            onClick={saveStats}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-[#fee11b] text-[#01255f] py-3 text-sm font-black disabled:opacity-50"
          >
            <Save size={15} /> {saving ? 'Saving…' : 'Save Stats'}
          </button>
          <button
            type="button"
            onClick={saveMatch}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-[#01255f] text-white px-4 py-3 text-sm font-bold disabled:opacity-50"
          >
            <Save size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
