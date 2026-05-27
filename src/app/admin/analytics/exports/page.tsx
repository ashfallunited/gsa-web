'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import AnalyticsFilters, { type AnalyticsFiltersState } from '@/components/admin/analytics-filters'
import { fetchAdminJson } from '@/lib/admin-fetch'
import type { Match } from '@/lib/analytics/types'

export default function ExportsPage() {
  const [filters, setFilters] = useState<AnalyticsFiltersState>({ team: 'first-team', season: '', competition: '' })
  const [matches, setMatches] = useState<Match[]>([])
  const [seasons, setSeasons] = useState<string[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState('')

  useEffect(() => {
    const params = new URLSearchParams({ team: filters.team })
    if (filters.season) params.set('season', filters.season)
    fetchAdminJson<{ matches: Match[]; seasons: string[] }>(`/api/admin/matches?${params}`)
      .then((res) => {
        setMatches(res.matches)
        setSeasons(res.seasons)
        setSelectedMatchId('')
      })
      .catch(() => {})
  }, [filters])

  const exportUrl = (type: string, matchId?: string) => {
    const params = new URLSearchParams({ type, team: filters.team })
    if (filters.season) params.set('season', filters.season)
    if (matchId) params.set('matchId', matchId)
    return `/api/admin/analytics/export?${params}`
  }

  return (
    <div className="p-5 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
          Exports
        </h1>
        <p className="text-sm text-[#5a6478] mt-1">Download CSV reports for matches and season stats.</p>
      </div>

      <div className="bg-white border border-gray-200 p-4 sm:p-5 mb-6">
        <AnalyticsFilters filters={filters} seasons={seasons} competitions={[]} onChange={setFilters} />
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="font-bold text-[#01255f] mb-2">Season Player Stats</h2>
          <p className="text-sm text-[#5a6478] mb-4">All player totals for the selected team and season.</p>
          <a
            href={exportUrl('season-players')}
            className="inline-flex items-center gap-2 bg-[#01255f] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#011840]"
          >
            <Download size={16} />
            Download CSV
          </a>
        </div>

        <div className="bg-white border border-gray-200 p-5">
          <h2 className="font-bold text-[#01255f] mb-2">Squad Summary</h2>
          <p className="text-sm text-[#5a6478] mb-4">Compact squad overview with appearances and discipline.</p>
          <a
            href={exportUrl('squad-summary')}
            className="inline-flex items-center gap-2 bg-[#01255f] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#011840]"
          >
            <Download size={16} />
            Download CSV
          </a>
        </div>

        <div className="bg-white border border-gray-200 p-5">
          <h2 className="font-bold text-[#01255f] mb-2">Match Report</h2>
          <p className="text-sm text-[#5a6478] mb-4">Full player stat sheet for a single match.</p>
          <select
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="w-full border border-gray-200 px-3 py-2 text-sm mb-4 focus:outline-none focus:border-[#01255f]"
          >
            <option value="">Select a match…</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.date} — vs {m.opponent} ({m.goalsFor}-{m.goalsAgainst})
              </option>
            ))}
          </select>
          {selectedMatchId && (
            <a
              href={exportUrl('match-report', selectedMatchId)}
              className="inline-flex items-center gap-2 bg-[#01255f] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#011840]"
            >
              <Download size={16} />
              Download Match CSV
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
