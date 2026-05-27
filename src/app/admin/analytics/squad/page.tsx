'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, AlertTriangle, X } from 'lucide-react'
import AdminLoadError from '@/components/AdminLoadError'
import { inputClass, labelClass } from '@/components/admin/analytics-filters'
import { fetchAdminJson } from '@/lib/admin-fetch'
import { TEAM_LABELS, TEAM_SLUG } from '@/lib/teams'
import { SkeletonPlayerCard } from '@/components/admin/skeleton'

type Injury = { description?: string; injuredDate: string; expectedReturn?: string }

type SquadPlayer = {
  id: string
  name: string
  number: number
  position: string
  team: string
  image?: string
  source?: string
  showOnSite?: boolean
  injury?: Injury | null
}

const POS_LABELS: Record<string, string> = {
  goalkeeper: 'GK',
  defender: 'DEF',
  midfielder: 'MID',
  forward: 'FWD',
}

export default function AnalyticsSquadPage() {
  const [team, setTeam] = useState<string>(TEAM_SLUG.firstTeam)
  const [players, setPlayers] = useState<SquadPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', number: 0, position: 'midfielder' })
  const [statusFilter, setStatusFilter] = useState<'all' | 'official' | 'trial'>('all')
  const [injuryPlayerId, setInjuryPlayerId] = useState<string | null>(null)
  const [injuryForm, setInjuryForm] = useState({ description: '', injuredDate: new Date().toISOString().slice(0, 10), expectedReturn: '' })
  const [injuryError, setInjuryError] = useState('')
  const injuryFormRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchAdminJson<{ players: SquadPlayer[] }>(
        `/api/admin/analytics/players-list?team=${team}`
      )
      setPlayers(res.players)
    } catch {
      setError('Failed to load squad.')
    } finally {
      setLoading(false)
    }
  }, [team])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (injuryPlayerId) {
      setInjuryError('')
      setTimeout(() => injuryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }, [injuryPlayerId])

  const addPlayer = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/analytics/players-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, team, number: Number(form.number) }),
      })
      if (!res.ok) {
        setError('Failed to add player.')
        return
      }
      setForm({ name: '', number: 0, position: 'midfielder' })
      setShowForm(false)
      await load()
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const saveInjury = async (playerId: string) => {
    if (!injuryForm.injuredDate) return
    setSaving(true)
    setInjuryError('')
    try {
      const res = await fetch(`/api/admin/players/${playerId}`, {
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
      if (!res.ok) {
        setInjuryError('Failed to save injury. Please try again.')
        return
      }
      setInjuryPlayerId(null)
      await load()
    } catch {
      setInjuryError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const clearInjury = async (playerId: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/players/${playerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ injury: null }),
      })
      if (res.ok) await load()
    } finally {
      setSaving(false)
    }
  }

  const filteredPlayers = players.filter((player) => {
    if (statusFilter === 'all') return true
    const isTrial = player.source === 'trial' || player.showOnSite === false
    return statusFilter === 'trial' ? isTrial : !isTrial
  })

  return (
    <div className="p-5 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
            Squad
          </h1>
          <p className="text-sm text-[#5a6478] mt-1">
            Add players here before entering match stats. They appear on public team pages when photos are added by admin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 bg-[#01255f] hover:bg-[#011840] text-white px-5 py-2.5 text-sm font-bold"
        >
          <Plus size={16} />
          Add Player
        </button>
      </div>

      <div className="mb-6 space-y-3">
        <label className={labelClass}>Team</label>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className={`${inputClass} max-w-xs`}>
          {Object.entries(TEAM_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
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

      {showForm && (
        <div className="bg-white border border-gray-200 p-5 mb-6 space-y-4">
          <h2 className="font-bold text-[#01255f]">New Player</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
                placeholder="Player name"
              />
            </div>
            <div>
              <label className={labelClass}>Number</label>
              <input
                type="number"
                min={0}
                max={99}
                value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Position</label>
              <select
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                className={inputClass}
              >
                <option value="goalkeeper">Goalkeeper</option>
                <option value="defender">Defender</option>
                <option value="midfielder">Midfielder</option>
                <option value="forward">Forward</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addPlayer} disabled={saving} className="bg-[#01255f] text-white px-5 py-2 text-sm font-bold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Player'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 px-5 py-2 text-sm font-bold text-[#5a6478]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonPlayerCard key={i} />)}
        </div>
      )}

      {!loading && filteredPlayers.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 p-10 text-center">
          <p className="text-[#01255f] font-bold mb-2">No players in this squad yet</p>
          <p className="text-sm text-[#5a6478] mb-4">Add players to start recording match stats.</p>
          <button type="button" onClick={() => setShowForm(true)} className="bg-[#fee11b] text-[#01255f] px-5 py-2 text-sm font-bold">
            Add first player
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
        {filteredPlayers.map((p) => (
          <div key={p.id} className="group relative bg-[#01255f] overflow-hidden">
            {/* Jersey number watermark */}
            <div
              className="absolute bottom-2 right-2 text-[5rem] font-black text-white/10 leading-none select-none pointer-events-none z-0"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {p.number}
            </div>

            {/* Photo */}
            <div className="relative h-44 sm:h-52 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-7xl font-black text-white/10 leading-none"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {p.number || '—'}
                </span>
              </div>
              {p.image && (
                <img
                  src={p.image}
                  alt={p.name}
                  className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#01255f] via-[#01255f]/20 to-transparent z-10" />
            </div>

            {/* Info */}
            <div className="relative z-10 p-3 sm:p-4 -mt-8 sm:-mt-10">
              <div className="flex items-end justify-between mb-1.5">
                <span
                  className="text-[#fee11b] font-black text-xl sm:text-2xl leading-none"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {p.number}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[#fee11b] text-[#01255f]">
                  {POS_LABELS[p.position] ?? p.position}
                </span>
              </div>
              <h3
                className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {p.name}
              </h3>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span
                  className={`text-[9px] uppercase font-bold px-1.5 py-0.5 ${
                    p.source === 'trial' || p.showOnSite === false
                      ? 'bg-amber-400 text-amber-900'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {p.source === 'trial' || p.showOnSite === false ? 'Trial' : 'Official'}
                </span>
                {p.injury && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-red-500 text-white flex items-center gap-0.5">
                    <AlertTriangle size={9} /> Injured
                  </span>
                )}
              </div>
            </div>

            {/* Injury action bar */}
            <div className="flex items-center gap-1 px-3 py-2 border-t border-white/10 relative z-10">
              {p.injury ? (
                <>
                  <span className="text-[10px] text-white/50 flex-1 truncate">
                    {p.injury.expectedReturn ? `Returns ${p.injury.expectedReturn}` : 'No return date'}
                  </span>
                  <button
                    onClick={() => clearInjury(p.id)}
                    disabled={saving}
                    className="flex items-center gap-1 text-xs font-bold text-red-400 hover:bg-red-400/10 px-2 py-1.5 transition-colors ml-auto disabled:opacity-50"
                  >
                    <X size={11} /> Clear
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setInjuryForm({ description: '', injuredDate: new Date().toISOString().slice(0, 10), expectedReturn: '' })
                    setInjuryPlayerId(p.id)
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-white/50 hover:text-white hover:bg-white/10 px-2.5 py-1.5 transition-colors"
                >
                  <AlertTriangle size={11} /> Mark Injured
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Injury form panel */}
      {injuryPlayerId && (() => {
        const p = players.find((pl) => pl.id === injuryPlayerId)
        if (!p) return null
        return (
          <div ref={injuryFormRef} className="mt-4 bg-white border border-red-200 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#01255f] text-sm">
                Mark Injured — <span className="text-red-600">{p.name}</span>
              </p>
              <button onClick={() => setInjuryPlayerId(null)} className="text-[#5a6478] hover:text-[#01255f] p-1">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date of Injury</label>
                <input
                  type="date"
                  value={injuryForm.injuredDate}
                  onChange={(e) => setInjuryForm((f) => ({ ...f, injuredDate: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Expected Return</label>
                <input
                  type="date"
                  value={injuryForm.expectedReturn}
                  onChange={(e) => setInjuryForm((f) => ({ ...f, expectedReturn: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Description (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Hamstring strain"
                  value={injuryForm.description}
                  onChange={(e) => setInjuryForm((f) => ({ ...f, description: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
            {injuryError && (
              <p className="text-xs text-red-600 font-medium">{injuryError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => saveInjury(injuryPlayerId)}
                disabled={saving || !injuryForm.injuredDate}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 text-sm font-bold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Confirm Injury'}
              </button>
              <button onClick={() => setInjuryPlayerId(null)} className="border border-gray-200 px-5 py-2 text-sm font-bold text-[#5a6478]">
                Cancel
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
