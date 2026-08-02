'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState, useCallback, useMemo } from 'react'
import { Save, UserPlus, Plus, Trash2 } from 'lucide-react'
import ComboInput from '@/components/admin/combo-input'
import PlayerPicker from '@/components/admin/player-picker'
import RatingInput from '@/components/admin/rating-input'
import AdminLoadError from '@/components/AdminLoadError'
import { inputClass, labelClass } from '@/components/admin/analytics-filters'
import { useAnalyticsLookups } from '@/lib/analytics/use-lookups'
import { fetchAdminJson } from '@/lib/admin-fetch'
import { TEAM_LABELS, TEAM_SLUG, playerMatchesTeamFilter } from '@/lib/teams'
import { categoryMetaFor, roleForPosition, EVAL_MAX_TOTAL, type EvaluationRole, type PlayerEvaluation } from '@/lib/evaluations/types'

type PlayerOption = { id: string; name: string; number: number; position: string; team: string; image?: string }
type Coach = { id: string; name: string; active: boolean }

const currentYear = new Date().getFullYear()

function defaultCategories(role: EvaluationRole): Record<string, number> {
  return Object.fromEntries(categoryMetaFor(role).map(({ key }) => [key, 3]))
}

export default function NewEvaluationPage() {
  return (
    <Suspense fallback={<div className="p-4 sm:p-8 lg:p-10 max-w-6xl mx-auto text-sm text-[#5a6478]">Loading…</div>}>
      <EvaluationForm />
    </Suspense>
  )
}

function EvaluationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')

  const [team, setTeam] = useState<string>(TEAM_SLUG.firstTeam)
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [coachId, setCoachId] = useState('')
  const [type, setType] = useState<'training' | 'match'>('training')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [season, setSeason] = useState(`${currentYear}/${currentYear + 1}`)
  const [playerId, setPlayerId] = useState('')
  const [categories, setCategories] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')

  const [showAddCoach, setShowAddCoach] = useState(false)
  const [newCoachName, setNewCoachName] = useState('')
  const [savingCoach, setSavingCoach] = useState(false)

  const { lookups } = useAnalyticsLookups(team)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [playersRes, coachesRes] = await Promise.all([
        fetchAdminJson<{ players: PlayerOption[] }>(`/api/admin/analytics/players-list?team=all`),
        fetchAdminJson<{ coaches: Coach[] }>('/api/admin/coaches'),
      ])
      setPlayers(playersRes.players)
      setCoaches(coachesRes.coaches)

      if (editId) {
        const evalRes = await fetchAdminJson<{ evaluation: PlayerEvaluation }>(`/api/admin/evaluations/${editId}`)
        const ev = evalRes.evaluation
        setTeam(ev.team)
        setCoachId(ev.coachId)
        setType(ev.type)
        setDate(ev.date)
        setSeason(ev.season)
        setPlayerId(ev.playerId)
        setCategories(ev.categories as Record<string, number>)
        setComment(ev.comment)
      }
    } catch {
      setError(editId ? 'Failed to load evaluation.' : 'Failed to load players and coaches.')
    } finally {
      setLoading(false)
    }
  }, [editId])

  useEffect(() => {
    load()
  }, [load])

  const teamPlayers = useMemo(
    () => players.filter((p) => playerMatchesTeamFilter(p.team, team)),
    [players, team]
  )

  const selectedPlayer = useMemo(() => teamPlayers.find((p) => p.id === playerId) ?? null, [teamPlayers, playerId])
  const role = roleForPosition(selectedPlayer?.position)
  const categoryMeta = categoryMetaFor(role)
  const maxTotal = EVAL_MAX_TOTAL[role]
  const total = categoryMeta.reduce((sum, { key }) => sum + (categories[key] ?? 0), 0)

  const selectPlayer = (id: string) => {
    setPlayerId(id)
    const player = teamPlayers.find((p) => p.id === id)
    setCategories(defaultCategories(roleForPosition(player?.position)))
  }

  const setRating = (key: string, value: number) => {
    setCategories((prev) => ({ ...prev, [key]: value }))
  }

  const activeCoaches = coaches.filter((c) => c.active)

  const addCoach = async () => {
    if (!newCoachName.trim()) return
    setSavingCoach(true)
    setError('')
    try {
      const created = await fetchAdminJson<{ id: string }>('/api/admin/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCoachName.trim(), active: true }),
      })
      setCoaches((prev) => [...prev, { id: created.id, name: newCoachName.trim(), active: true }])
      setCoachId(created.id)
      setNewCoachName('')
      setShowAddCoach(false)
    } catch {
      setError('Failed to add coach.')
    } finally {
      setSavingCoach(false)
    }
  }

  const save = async () => {
    if (!playerId) {
      setError('Select a player.')
      return
    }
    if (!coachId) {
      setError('Select a coach.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const url = editId ? `/api/admin/evaluations/${editId}` : '/api/admin/evaluations'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, playerId, coachId, type, date, season, categories, comment }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to save evaluation.')
        return
      }
      if (editId) {
        router.push('/admin/analytics/evaluations')
        return
      }
      setMessage(`Saved evaluation for ${selectedPlayer?.name ?? 'player'}.`)
      setComment('')
      setPlayerId('')
      setCategories({})
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!editId) return
    if (!confirm('Delete this evaluation? This cannot be undone.')) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/evaluations/${editId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to delete evaluation.')
        return
      }
      router.push('/admin/analytics/evaluations')
    } catch {
      setError('Network error.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-6xl mx-auto pb-24">
      <div className="mb-6 sm:mb-8">
        <Link href="/admin/analytics/evaluations" className="text-xs text-[#5a6478] hover:text-[#01255f] mb-2 inline-block">
          ← Back to evaluations
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
          {editId ? 'Edit Evaluation' : 'Player Evaluation'}
        </h1>
        <p className="text-sm text-[#5a6478] mt-1">
          {editId ? "Update this session's category ratings." : "Rate a player's training session or match performance."}
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">{error}</div>}
      {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 mb-4">{message}</div>}

      {loading ? (
        <div className="bg-white border border-gray-200 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
      ) : (
        <div className="bg-white border border-gray-200 p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Team</label>
              <select
                value={team}
                onChange={(e) => {
                  setTeam(e.target.value)
                  setPlayerId('')
                  setCategories({})
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
              <label className={labelClass}>Coach</label>
              <div className="flex gap-2">
                <select value={coachId} onChange={(e) => setCoachId(e.target.value)} className={inputClass}>
                  <option value="">Select coach…</option>
                  {activeCoaches.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddCoach((v) => !v)}
                  title="Add coach"
                  className="shrink-0 border border-gray-200 px-3 text-[#01255f] hover:bg-gray-50"
                >
                  <UserPlus size={16} />
                </button>
              </div>
            </div>
          </div>

          {showAddCoach && (
            <div className="border border-dashed border-[#01255f]/30 p-3 flex gap-2 items-end bg-[#01255f]/5">
              <div className="flex-1">
                <label className={labelClass}>New coach name</label>
                <input
                  type="text"
                  value={newCoachName}
                  onChange={(e) => setNewCoachName(e.target.value)}
                  placeholder="e.g. Jay Sumbo"
                  className={inputClass}
                />
              </div>
              <button
                type="button"
                onClick={addCoach}
                disabled={savingCoach || !newCoachName.trim()}
                className="inline-flex items-center gap-1.5 bg-[#01255f] text-white px-4 py-2 text-xs font-bold disabled:opacity-50"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Training / Match</label>
              <div className="grid grid-cols-2 gap-2">
                {(['training', 'match'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 text-sm font-bold uppercase tracking-wide border transition-colors ${
                      type === t ? 'bg-[#01255f] text-white border-[#01255f]' : 'bg-white text-[#5a6478] border-gray-200'
                    }`}
                  >
                    {t === 'training' ? 'Training' : 'Match'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ComboInput
              label="Season"
              listId="eval-season"
              value={season}
              options={lookups.seasons}
              onChange={setSeason}
              placeholder="2025/2026"
            />
            <div>
              <label className={labelClass}>Player</label>
              <PlayerPicker players={teamPlayers} value={playerId} onChange={selectPlayer} placeholder="Select player…" />
            </div>
          </div>

          {selectedPlayer && (
            <>
              <div className="flex items-center justify-between border border-gray-100 bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#5a6478]">Position</p>
                  <p className="text-sm font-bold text-[#01255f] capitalize">{selectedPlayer.position}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#5a6478] bg-white border border-gray-200 px-2 py-1">
                  {role === 'goalkeeper' ? 'Goalkeeper Form' : 'Outfield Form'}
                </span>
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-4">
                {categoryMeta.map(({ key, label }) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="text-sm font-semibold text-[#01255f]">{label}</label>
                    <RatingInput value={categories[key] ?? 3} onChange={(v) => setRating(key, v)} />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between bg-[#01255f] text-white px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-widest">Total</span>
                <span className="text-xl font-black" style={{ fontFamily: 'var(--font-heading)' }}>
                  {total} <span className="text-sm font-normal text-white/60">/ {maxTotal}</span>
                </span>
              </div>

              <div>
                <label className={labelClass}>Coach&apos;s Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Notes on this session…"
                  className={inputClass}
                />
              </div>
            </>
          )}

          {!selectedPlayer && teamPlayers.length === 0 && (
            <AdminLoadError title="No players in this squad" message="Add players to the squad before recording evaluations." />
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || !selectedPlayer}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#fee11b] text-[#01255f] px-6 py-3 text-sm font-black disabled:opacity-50"
            >
              <Save size={15} /> {saving ? 'Saving…' : editId ? 'Update Evaluation' : 'Save Evaluation'}
            </button>
            {editId && (
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-red-200 text-red-700 px-6 py-3 text-sm font-black disabled:opacity-50 hover:bg-red-50"
              >
                <Trash2 size={15} /> {deleting ? 'Deleting…' : 'Delete Evaluation'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
