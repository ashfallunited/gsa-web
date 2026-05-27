'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Copy, Pencil } from 'lucide-react'
import AdminLoadError from '@/components/AdminLoadError'
import AnalyticsFilters, { type AnalyticsFiltersState } from '@/components/admin/analytics-filters'
import { SkeletonMatchCard } from '@/components/admin/skeleton'
import { fetchAdminJson } from '@/lib/admin-fetch'
import type { Match } from '@/lib/analytics/types'
import { displayTeamLabel } from '@/lib/teams'
import { computeMatchResult } from '@/lib/analytics/aggregation'

const RESULT_COLORS = { W: 'bg-green-100 text-green-800', D: 'bg-gray-100 text-gray-700', L: 'bg-red-100 text-red-800' }

export default function MatchesListPage() {
  const [filters, setFilters] = useState<AnalyticsFiltersState>({ team: 'first-team', season: '', competition: '' })
  const [statusFilter, setStatusFilter] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [seasons, setSeasons] = useState<string[]>([])
  const [competitions, setCompetitions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ team: filters.team })
      if (filters.season) params.set('season', filters.season)
      if (filters.competition) params.set('competition', filters.competition)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetchAdminJson<{ matches: Match[]; seasons: string[]; competitions: string[] }>(
        `/api/admin/matches?${params}`
      )
      setMatches(res.matches)
      setSeasons(res.seasons)
      setCompetitions(res.competitions)
    } catch {
      setError('Failed to load matches.')
    } finally {
      setLoading(false)
    }
  }, [filters, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const duplicate = async (id: string) => {
    const res = await fetch(`/api/admin/matches/${id}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const data = (await res.json()) as { id: string }
      window.location.href = `/admin/analytics/matches/${data.id}`
    }
  }

  return (
    <div className="p-5 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
            Matches
          </h1>
          <p className="text-sm text-[#5a6478] mt-1">Create, edit, and finalize match records.</p>
        </div>
        <Link
          href="/admin/analytics/matches/new"
          className="inline-flex items-center justify-center gap-2 bg-[#01255f] hover:bg-[#011840] text-white px-5 py-2.5 text-sm font-bold tracking-wide transition-colors"
        >
          <Plus size={16} />
          New Match
        </Link>
      </div>

      <div className="bg-white border border-gray-200 p-4 sm:p-5 mb-6 space-y-4">
        <AnalyticsFilters filters={filters} seasons={seasons} competitions={competitions} onChange={setFilters} />
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#01255f]"
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>
        </div>
      </div>

      {error && <AdminLoadError message={error} />}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonMatchCard key={i} />)}
        </div>
      )}

      {!loading && matches.length === 0 && (
        <div className="bg-white border border-gray-200 p-10 text-center text-[#5a6478] text-sm">
          No matches found. Create your first match to start tracking stats.
        </div>
      )}

      <div className="space-y-3">
        {matches.map((m) => {
          const result = m.status === 'final' ? computeMatchResult(m) : null
          return (
            <div key={m.id} className="bg-white border border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs text-[#5a6478]">{m.date}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${m.status === 'final' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {m.status}
                  </span>
                  {result && <span className={`text-[10px] font-bold px-1.5 py-0.5 ${RESULT_COLORS[result]}`}>{result}</span>}
                </div>
                <h2 className="font-bold text-[#01255f] text-lg truncate">
                  vs {m.opponent}
                  <span className="text-[#5a6478] font-normal text-sm ml-2">{displayTeamLabel(m.team)}</span>
                </h2>
                <p className="text-sm text-[#5a6478]">
                  {m.competition} · {m.season} · {m.homeAway} · {m.goalsFor}-{m.goalsAgainst}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => duplicate(m.id)}
                  className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-xs font-bold text-[#01255f] hover:bg-gray-50"
                  title="Duplicate as template"
                >
                  <Copy size={14} />
                  Duplicate
                </button>
                <Link
                  href={`/admin/analytics/matches/${m.id}`}
                  className="inline-flex items-center gap-1.5 bg-[#01255f] text-white px-3 py-2 text-xs font-bold hover:bg-[#011840]"
                >
                  <Pencil size={14} />
                  Edit
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
