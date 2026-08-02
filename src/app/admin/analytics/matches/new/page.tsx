'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import ComboInput from '@/components/admin/combo-input'
import ImageUpload from '@/components/ImageUpload'
import { inputClass, labelClass } from '@/components/admin/analytics-filters'
import { useAnalyticsLookups } from '@/lib/analytics/use-lookups'
import { TEAM_LABELS, TEAM_SLUG } from '@/lib/teams'

const currentYear = new Date().getFullYear()

export default function NewMatchPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState({
    team: TEAM_SLUG.firstTeam,
    season: `${currentYear}/${currentYear + 1}`,
    competition: 'League',
    date: new Date().toISOString().slice(0, 10),
    opponent: '',
    opponentLogo: '',
    homeAway: 'home' as const,
    goalsFor: 0,
    goalsAgainst: 0,
    status: 'draft' as const,
    notes: '',
  })

  const { lookups } = useAnalyticsLookups(data.team)

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value
      setData((d) => ({ ...d, [field]: value }))
    }

  const save = async () => {
    if (!data.opponent.trim()) {
      setError('Opponent is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        setError(payload.error ?? 'Failed to create match.')
        return
      }
      const { id } = (await res.json()) as { id: string }
      router.push(`/admin/analytics/matches/${id}`)
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-3xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <Link href="/admin/analytics/matches" className="text-xs text-[#5a6478] hover:text-[#01255f] mb-2 inline-block">
          ← Back to matches
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
          New Match
        </h1>
      </div>

      <div className="bg-white border border-gray-200 p-4 sm:p-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Team</label>
            <select value={data.team} onChange={set('team')} className={inputClass}>
              {Object.entries(TEAM_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <ComboInput
            label="Season"
            listId="new-match-season"
            value={data.season}
            options={lookups.seasons}
            onChange={(season) => setData((d) => ({ ...d, season }))}
            placeholder="2025/2026"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Date</label>
            <input type="date" value={data.date} onChange={set('date')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Home / Away</label>
            <select value={data.homeAway} onChange={set('homeAway')} className={inputClass}>
              <option value="home">Home</option>
              <option value="away">Away</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>

        <ComboInput
          label="Opponent"
          listId="new-match-opponent"
          value={data.opponent}
          options={lookups.opponents}
          onChange={(opponent) => setData((d) => ({ ...d, opponent }))}
          placeholder="Select or type opponent"
        />

        <ImageUpload
          value={data.opponentLogo}
          onChange={(url) => setData((d) => ({ ...d, opponentLogo: url }))}
          bucket="team-images"
          folder="opponent-logos"
          label="Opponent Logo (optional — falls back to a default shield if left blank)"
        />

        <ComboInput
          label="Competition / League"
          listId="new-match-competition"
          value={data.competition}
          options={lookups.competitions}
          onChange={(competition) => setData((d) => ({ ...d, competition }))}
          placeholder="League, cup, friendly…"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Goals For</label>
            <input type="number" inputMode="numeric" min={0} max={99} value={data.goalsFor} onChange={set('goalsFor')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Goals Against</label>
            <input type="number" inputMode="numeric" min={0} max={99} value={data.goalsAgainst} onChange={set('goalsAgainst')} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select value={data.status} onChange={set('status')} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea value={data.notes} onChange={set('notes')} rows={3} className={inputClass} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-[#01255f] hover:bg-[#011840] text-white px-6 py-2.5 text-sm font-bold disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Match'}
          </button>
          <Link href="/admin/analytics/matches" className="text-center border border-gray-200 px-6 py-2.5 text-sm font-bold text-[#5a6478] hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
