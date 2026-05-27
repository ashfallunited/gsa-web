'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, AlertTriangle } from 'lucide-react'
import ImageUpload from '@/components/ImageUpload'
import { SkeletonPlayerCard } from '@/components/admin/skeleton'

import { IMAGE_PLACEHOLDER } from '@/lib/constants'
import AdminLoadError from '@/components/AdminLoadError'
import { AdminFetchError, fetchAdminJson } from '@/lib/admin-fetch'
import {
  TEAM_LABELS,
  TEAM_SLUG,
  displayTeamLabel,
  normalizeTeamSlug,
  playerMatchesTeamFilter,
} from '@/lib/teams'

const PLACEHOLDER = IMAGE_PLACEHOLDER

type Injury = { description?: string; injuredDate: string; expectedReturn?: string }

type Player = {
  id: string
  name: string
  number: number
  position: string
  team: string
  image: string
  order: number
  source?: string
  showOnSite?: boolean
  height?: number
  weight?: number
  preferredFoot?: 'left' | 'right' | 'both'
  injury?: Injury | null
}

const empty: Omit<Player, 'id'> = {
  name: '',
  number: 0,
  position: 'midfielder',
  team: TEAM_SLUG.firstTeam,
  image: '',
  order: 99,
  source: 'official',
  showOnSite: true,
  height: undefined,
  weight: undefined,
  preferredFoot: undefined,
}
const inputClass = 'w-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#01255f] transition-colors'
const labelClass = 'block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5'

const POS_LABELS: Record<string, string> = { goalkeeper: 'Goalkeeper', defender: 'Defender', midfielder: 'Midfielder', forward: 'Forward' }
const POS_SHORT: Record<string, string> = { goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD' }

function PlayerForm({ initial, playerId, onSaved, onCancel }: {
  initial?: Partial<Omit<Player, 'id'>>
  playerId?: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [data, setData] = useState({
    ...empty,
    ...initial,
    team: normalizeTeamSlug(initial?.team ?? empty.team),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setData((d) => ({ ...d, [field]: e.target.value }))

  const save = async () => {
    if (!data.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...data,
        number: Number(data.number),
        order: Number(data.order),
        showOnSite: data.source === 'trial' ? false : data.showOnSite ?? true,
      }
      const res = playerId
        ? await fetch(`/api/admin/players/${playerId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/admin/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) { onSaved() } else { setError('Failed to save.') }
    } catch { setError('Network error.') } finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-gray-200 p-6 space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

      <ImageUpload
        label="Player Photo"
        value={data.image}
        onChange={(url) => setData((d) => ({ ...d, image: url }))}
        bucket="team-images"
        folder="players"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Full Name</label>
          <input type="text" value={data.name} onChange={set('name')} className={inputClass} placeholder="Player full name" />
        </div>
        <div>
          <label className={labelClass}>Jersey Number</label>
          <input type="number" value={data.number} onChange={set('number')} className={inputClass} min={1} max={99} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Position</label>
          <select value={data.position} onChange={set('position')} className={inputClass}>
            {Object.entries(POS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Team</label>
          <select value={data.team} onChange={set('team')} className={inputClass}>
            <option value={TEAM_SLUG.firstTeam}>{TEAM_LABELS[TEAM_SLUG.firstTeam]}</option>
            <option value={TEAM_SLUG.academy}>{TEAM_LABELS[TEAM_SLUG.academy]}</option>
            <option value={TEAM_SLUG.both}>{TEAM_LABELS[TEAM_SLUG.both]}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Player Type</label>
          <select value={data.source ?? 'official'} onChange={set('source')} className={inputClass}>
            <option value="official">Official</option>
            <option value="trial">Trial</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Visibility</label>
          <select
            value={String(data.showOnSite ?? true)}
            onChange={(e) => setData((d) => ({ ...d, showOnSite: e.target.value === 'true' }))}
            className={inputClass}
          >
            <option value="true">Visible on public site</option>
            <option value="false">Hidden from public site</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Height (cm)</label>
          <input
            type="number"
            value={data.height ?? ''}
            min={100}
            max={250}
            onChange={(e) => setData((d) => ({ ...d, height: e.target.value ? Number(e.target.value) : undefined }))}
            className={inputClass}
            placeholder="e.g. 180"
          />
        </div>
        <div>
          <label className={labelClass}>Weight (kg)</label>
          <input
            type="number"
            value={data.weight ?? ''}
            min={30}
            max={150}
            onChange={(e) => setData((d) => ({ ...d, weight: e.target.value ? Number(e.target.value) : undefined }))}
            className={inputClass}
            placeholder="e.g. 75"
          />
        </div>
        <div>
          <label className={labelClass}>Preferred Foot</label>
          <select
            value={data.preferredFoot ?? ''}
            onChange={(e) => setData((d) => ({ ...d, preferredFoot: (e.target.value || undefined) as Player['preferredFoot'] }))}
            className={inputClass}
          >
            <option value="">Not set</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Display order (within position)</label>
        <input type="number" value={data.order} onChange={set('order')} className={inputClass} min={1} />
        <p className="text-xs text-[#5a6478] mt-1.5 leading-relaxed">
          Squad pages list players by position (GK → DEF → MID → FWD). Lower numbers appear first within each
          group.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={save} disabled={saving} className="bg-[#01255f] hover:bg-[#011840] text-white px-6 py-2.5 text-sm font-bold tracking-wide transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : playerId ? 'Update' : 'Add Player'}
        </button>
        <button onClick={onCancel} disabled={saving} className="border border-gray-200 px-4 py-2.5 text-sm text-[#5a6478] hover:border-[#01255f] hover:text-[#01255f] transition-colors disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function AdminPlayers() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Player | null>(null)
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [loadError, setLoadError] = useState('')

  const load = () => {
    setLoading(true)
    fetchAdminJson<{ players: Player[] }>('/api/admin/players')
      .then((d) => {
        setPlayers(d.players ?? [])
        setLoadError('')
      })
      .catch((e: unknown) => {
        setPlayers([])
        setLoadError(
          e instanceof AdminFetchError ? e.message : 'Failed to load players. Please try again.'
        )
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (editing || adding) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [editing, adding])

  const del = async (id: string) => {
    if (!confirm('Remove this player?')) return
    const res = await fetch(`/api/admin/players/${id}`, { method: 'DELETE' })
    if (!res.ok) { setLoadError('Failed to remove player. Please try again.'); return }
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  const promote = async (id: string) => {
    const res = await fetch(`/api/admin/players/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'official', showOnSite: true }),
    })
    if (!res.ok) { setLoadError('Failed to promote player.'); return }
    setPlayers((prev) => prev.map((p) => p.id === id ? { ...p, source: 'official', showOnSite: true } : p))
  }

  const onSaved = () => { setAdding(false); setEditing(null); setLoading(true); load() }

  const filtered = players.filter((p) => playerMatchesTeamFilter(p.team, teamFilter))

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>Players</h1>
          <p className="text-[#5a6478] text-sm mt-1">{players.length} total players</p>
        </div>
        {!adding && !editing && (
          <button
            onClick={() => setAdding(true)}
            className="bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] px-5 py-2.5 text-sm font-bold tracking-wide transition-colors"
          >
            + Add Player
          </button>
        )}
      </div>

      {loadError && <AdminLoadError title="Could not load players" message={loadError} />}

      {(adding || editing) && (
        <div className="mb-8 max-w-2xl">
          <h2 className="text-sm font-bold text-[#01255f] uppercase tracking-widest mb-4">
            {editing ? 'Edit Player' : 'New Player'}
          </h2>
          <PlayerForm
            initial={editing ?? undefined}
            playerId={editing?.id}
            onSaved={onSaved}
            onCancel={() => { setAdding(false); setEditing(null) }}
          />
        </div>
      )}

      {!adding && !editing && (
        <div className="flex flex-wrap gap-2 mb-6">
          {(
            [
              ['all', 'All'],
              [TEAM_SLUG.firstTeam, TEAM_LABELS[TEAM_SLUG.firstTeam]],
              [TEAM_SLUG.academy, TEAM_LABELS[TEAM_SLUG.academy]],
              [TEAM_SLUG.both, TEAM_LABELS[TEAM_SLUG.both]],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTeamFilter(v)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${teamFilter === v ? 'bg-[#01255f] text-white' : 'border border-gray-200 text-[#5a6478] hover:border-[#01255f]'}`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonPlayerCard key={i} />)}
        </div>
      )}

      {!loading && !loadError && filtered.length === 0 && !adding && (
        <div className="bg-white border border-dashed border-gray-300 p-10 text-center">
          <p className="text-[#01255f] font-bold mb-2">No players yet</p>
          <button onClick={() => setAdding(true)} className="bg-[#fee11b] text-[#01255f] px-5 py-2 text-sm font-bold">
            Add the first player
          </button>
        </div>
      )}

      {!loading && !adding && !editing && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {filtered.map((p) => (
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
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span
                      className="text-7xl font-black text-white/10 leading-none"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {p.number || '—'}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#01255f] via-[#01255f]/20 to-transparent" />
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
                    {POS_SHORT[p.position] ?? p.position}
                  </span>
                </div>
                <h3
                  className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {p.name}
                </h3>
                <p className="text-white/40 text-[10px] mt-0.5">{displayTeamLabel(p.team)}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 ${
                      p.source === 'trial' ? 'bg-amber-400 text-amber-900' : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {p.source === 'trial' ? 'Trial' : 'Official'}
                  </span>
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 ${
                      p.showOnSite === false ? 'bg-white/10 text-white/40' : 'bg-[#fee11b]/20 text-[#fee11b]'
                    }`}
                  >
                    {p.showOnSite === false ? 'Hidden' : 'Visible'}
                  </span>
                  {p.injury && (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-red-500 text-white flex items-center gap-0.5">
                      <AlertTriangle size={9} /> Injured
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 px-3 py-2 border-t border-white/10 relative z-10">
                <button
                  onClick={() => { setEditing(p); setAdding(false) }}
                  className="flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 px-2.5 py-1.5 transition-colors"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                {p.source === 'trial' && (
                  <button
                    onClick={() => promote(p.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-400/10 px-2.5 py-1.5 transition-colors"
                  >
                    Promote
                  </button>
                )}
                <button
                  onClick={() => del(p.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:bg-red-400/10 px-2.5 py-1.5 transition-colors ml-auto"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
