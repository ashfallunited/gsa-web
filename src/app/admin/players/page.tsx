'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import ImageUpload from '@/components/ImageUpload'

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

type Player = {
  id: string
  name: string
  number: number
  position: string
  team: string
  image: string
  order: number
}

const empty: Omit<Player, 'id'> = {
  name: '',
  number: 0,
  position: 'midfielder',
  team: TEAM_SLUG.firstTeam,
  image: '',
  order: 99,
}
const inputClass = 'w-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#01255f] transition-colors'
const labelClass = 'block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5'

const POS_LABELS: Record<string, string> = { goalkeeper: 'Goalkeeper', defender: 'Defender', midfielder: 'Midfielder', forward: 'Forward' }

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
      const res = playerId
        ? await fetch(`/api/admin/players/${playerId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        : await fetch('/api/admin/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, number: Number(data.number), order: Number(data.order) }) })
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Full Name</label>
          <input type="text" value={data.name} onChange={set('name')} className={inputClass} placeholder="Player full name" />
        </div>
        <div>
          <label className={labelClass}>Jersey Number</label>
          <input type="number" value={data.number} onChange={set('number')} className={inputClass} min={1} max={99} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Position</label>
          <select value={data.position} onChange={set('position')} className={inputClass}>
            {Object.entries(POS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Team</label>
          <select value={data.team} onChange={set('team')} className={inputClass}>
            {Object.entries(TEAM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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

  const del = async (id: string) => {
    if (!confirm('Remove this player?')) return
    await fetch(`/api/admin/players/${id}`, { method: 'DELETE' })
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  const onSaved = () => { setAdding(false); setEditing(null); setLoading(true); load() }

  const filtered = players.filter((p) => playerMatchesTeamFilter(p.team, teamFilter))

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>Players</h1>
          <p className="text-[#5a6478] text-sm mt-1">{players.length} total players</p>
        </div>
        {!adding && !editing && (
          <button onClick={() => setAdding(true)} className="bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] px-5 py-2.5 text-sm font-bold tracking-wide transition-colors">
            + Add Player
          </button>
        )}
      </div>

      {loadError && <AdminLoadError title="Could not load players" message={loadError} />}

      {(adding || editing) && (
        <div className="mb-8">
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

      {/* Team filter */}
      {!adding && !editing && (
        <div className="flex gap-2 mb-6">
          {(
            [
              ['all', 'All'],
              [TEAM_SLUG.firstTeam, TEAM_LABELS[TEAM_SLUG.firstTeam]],
              [TEAM_SLUG.academy, TEAM_LABELS[TEAM_SLUG.academy]],
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

      {loading ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
      ) : loadError ? null : filtered.length === 0 && !adding ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">
          No players yet.{' '}<button onClick={() => setAdding(true)} className="text-[#01255f] underline">Add the first one.</button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 overflow-hidden">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-[#f5f7fc] transition-colors">
              <div className="flex-shrink-0 w-12 h-12 bg-[#01255f]/10 overflow-hidden">
                <Image src={p.image || PLACEHOLDER} alt={p.name} width={48} height={48} className="w-full h-full object-cover object-top" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#01255f] text-sm">
                  <span className="text-[#fee11b] mr-1">#{p.number}</span> {p.name}
                </p>
                <p className="text-[#5a6478] text-xs capitalize">
                  {p.position} · {displayTeamLabel(p.team)}
                </p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => { setEditing(p); setAdding(false) }} className="text-xs font-bold text-[#01255f] hover:underline">Edit</button>
                <button onClick={() => del(p.id)} className="text-xs font-bold text-red-400 hover:text-red-600">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
