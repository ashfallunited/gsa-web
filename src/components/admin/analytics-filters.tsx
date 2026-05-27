'use client'

import { TEAM_LABELS, TEAM_SLUG } from '@/lib/teams'

const inputClass =
  'w-full border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#01255f] transition-colors'
const labelClass = 'block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5'

export type AnalyticsFiltersState = {
  team: string
  season: string
  competition: string
}

export default function AnalyticsFilters({
  filters,
  seasons,
  competitions,
  onChange,
}: {
  filters: AnalyticsFiltersState
  seasons: string[]
  competitions: string[]
  onChange: (next: AnalyticsFiltersState) => void
}) {
  const set = (field: keyof AnalyticsFiltersState) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    onChange({ ...filters, [field]: e.target.value })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className={labelClass}>Team</label>
        <select value={filters.team} onChange={set('team')} className={inputClass}>
          <option value="all">All teams</option>
          <option value={TEAM_SLUG.firstTeam}>{TEAM_LABELS[TEAM_SLUG.firstTeam]}</option>
          <option value={TEAM_SLUG.academy}>{TEAM_LABELS[TEAM_SLUG.academy]}</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Season</label>
        <select value={filters.season} onChange={set('season')} className={inputClass}>
          <option value="">All seasons</option>
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Competition</label>
        <select value={filters.competition} onChange={set('competition')} className={inputClass}>
          <option value="">All competitions</option>
          {competitions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export { inputClass, labelClass }
