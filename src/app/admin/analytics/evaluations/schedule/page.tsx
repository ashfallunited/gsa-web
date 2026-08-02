'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { inputClass, labelClass } from '@/components/admin/analytics-filters'
import { fetchAdminJson } from '@/lib/admin-fetch'
import { TEAM_LABELS, TEAM_SLUG } from '@/lib/teams'
import type { ScheduleBreak, TrainingSchedule } from '@/lib/evaluations/types'

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const today = new Date().toISOString().slice(0, 10)

export default function EvaluationSchedulePage() {
  const [team, setTeam] = useState<string>(TEAM_SLUG.firstTeam)
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [breaks, setBreaks] = useState<ScheduleBreak[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [showAddBreak, setShowAddBreak] = useState(false)
  const [breakStart, setBreakStart] = useState(today)
  const [breakEnd, setBreakEnd] = useState(today)
  const [breakReason, setBreakReason] = useState('')
  const [savingBreak, setSavingBreak] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [scheduleRes, breaksRes] = await Promise.all([
        fetchAdminJson<{ schedule: TrainingSchedule }>(`/api/admin/evaluations/schedule?team=${team}`),
        fetchAdminJson<{ breaks: ScheduleBreak[] }>(`/api/admin/evaluations/breaks?team=${team}`),
      ])
      setWeekdays(scheduleRes.schedule.trainingWeekdays)
      setBreaks(breaksRes.breaks)
    } catch {
      setError('Failed to load schedule.')
    } finally {
      setLoading(false)
    }
  }, [team])

  useEffect(() => {
    load()
  }, [load])

  const toggleWeekday = (value: number) => {
    setWeekdays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort()))
  }

  const saveSchedule = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/admin/evaluations/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, trainingWeekdays: weekdays }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to save schedule.')
        return
      }
      setMessage('Training schedule saved.')
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const addBreak = async () => {
    if (!breakStart || !breakEnd) return
    setSavingBreak(true)
    setError('')
    try {
      const res = await fetch('/api/admin/evaluations/breaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, startDate: breakStart, endDate: breakEnd, reason: breakReason }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to add break.')
        return
      }
      setBreakReason('')
      setShowAddBreak(false)
      await load()
    } catch {
      setError('Network error.')
    } finally {
      setSavingBreak(false)
    }
  }

  const removeBreak = async (id: string) => {
    if (!confirm('Remove this break?')) return
    try {
      const res = await fetch(`/api/admin/evaluations/breaks/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to remove break.')
        return
      }
      setBreaks((prev) => prev.filter((b) => b.id !== id))
    } catch {
      setError('Network error.')
    }
  }

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-6xl mx-auto pb-24">
      <div className="mb-6 sm:mb-8">
        <Link href="/admin/analytics/evaluations" className="text-xs text-[#5a6478] hover:text-[#01255f] mb-2 inline-block">
          ← Back to evaluations
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
          Training Schedule
        </h1>
        <p className="text-sm text-[#5a6478] mt-1">
          Set the standard weekly training days so the attendance report can flag a session that never got logged, without
          holding it against any player.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">{error}</div>}
      {message && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 mb-4">{message}</div>}

      <div className="mb-6">
        <label className={labelClass}>Team</label>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className={`${inputClass} max-w-xs`}>
          {Object.entries(TEAM_LABELS)
            .filter(([v]) => v !== TEAM_SLUG.both)
            .map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
        </select>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 p-4 sm:p-6">
            <h2 className="font-bold text-[#01255f] mb-4">Standard Training Days</h2>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-5">
              {WEEKDAYS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleWeekday(value)}
                  className={`py-3 text-sm font-bold uppercase tracking-wide border transition-colors ${
                    weekdays.includes(value) ? 'bg-[#01255f] text-white border-[#01255f]' : 'bg-white text-[#5a6478] border-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={saveSchedule}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#fee11b] text-[#01255f] px-5 py-2.5 text-sm font-black disabled:opacity-50"
            >
              <Save size={15} /> {saving ? 'Saving…' : 'Save Schedule'}
            </button>
          </div>

          <div className="bg-white border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#01255f]">Breaks &amp; Holidays</h2>
              <button
                type="button"
                onClick={() => setShowAddBreak((v) => !v)}
                className="inline-flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 text-xs font-bold text-[#01255f] hover:bg-gray-50"
              >
                <Plus size={14} /> Add Break
              </button>
            </div>

            {showAddBreak && (
              <div className="border border-dashed border-[#01255f]/30 p-4 mb-4 bg-[#01255f]/5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Start Date</label>
                    <input type="date" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>End Date</label>
                    <input type="date" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Reason (optional)</label>
                    <input
                      type="text"
                      value={breakReason}
                      onChange={(e) => setBreakReason(e.target.value)}
                      placeholder="e.g. Christmas break"
                      className={inputClass}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addBreak}
                  disabled={savingBreak}
                  className="inline-flex items-center gap-1.5 bg-[#01255f] text-white px-4 py-2 text-xs font-bold disabled:opacity-50"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            )}

            {breaks.length === 0 ? (
              <p className="text-sm text-[#5a6478]">No breaks recorded for this team.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {breaks.map((b) => (
                  <li key={b.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <span className="text-[#01255f] font-medium">
                        {b.startDate}{b.endDate !== b.startDate ? ` – ${b.endDate}` : ''}
                      </span>
                      {b.reason && <span className="text-[#5a6478]"> · {b.reason}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBreak(b.id)}
                      title="Remove break"
                      className="text-[#5a6478] hover:text-red-600 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
