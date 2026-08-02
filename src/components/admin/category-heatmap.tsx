'use client'

import { Pencil } from 'lucide-react'
import { categoryMetaFor } from '@/lib/evaluations/types'
import type { EvaluationRole, EvaluationSessionSummary } from '@/lib/evaluations/types'

// Sequential single-hue scale (on-brand navy) rather than red/green — clearer for ordinal 1-5 data.
const HEAT_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: '#eef1f8', text: '#5a6478' },
  2: { bg: '#c9d3e8', text: '#01255f' },
  3: { bg: '#8fa3cf', text: '#01255f' },
  4: { bg: '#4a68a8', text: '#ffffff' },
  5: { bg: '#01255f', text: '#ffffff' },
}

function shortDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

/** Session × category grid, color-coded by score — surfaces patterns faster than scanning numbers per session. */
export default function CategoryHeatmap({
  sessions,
  role,
  onSelectSession,
}: {
  sessions: EvaluationSessionSummary[]
  role: EvaluationRole
  onSelectSession?: (evaluationId: string) => void
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-[#5a6478] py-4 text-center">No sessions to show.</p>
  }

  const meta = categoryMetaFor(role)

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left text-[9px] uppercase tracking-widest text-[#5a6478] font-bold px-2 py-1 sticky left-0 bg-white border-r border-b border-gray-100">
              Session
            </th>
            {meta.map(({ key, short }) => (
              <th key={key} className="text-[9px] uppercase tracking-widest text-[#5a6478] font-bold px-1 py-1 whitespace-nowrap border-b border-gray-100">
                {short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td className="text-[#01255f] font-semibold px-2 py-1 whitespace-nowrap sticky left-0 bg-white border-r border-gray-100">
                {onSelectSession ? (
                  <button
                    type="button"
                    onClick={() => onSelectSession(s.id)}
                    className="flex items-center gap-1 hover:text-[#01255f]/70 transition-colors"
                    title="Edit this evaluation"
                  >
                    {shortDate(s.date)}
                    <Pencil size={10} className="text-[#5a6478]" />
                  </button>
                ) : (
                  shortDate(s.date)
                )}
              </td>
              {meta.map(({ key }) => {
                const value = Number((s.categories as Record<string, number>)[key]) || 0
                const colors = HEAT_COLORS[value] ?? HEAT_COLORS[1]
                return (
                  <td
                    key={key}
                    className="text-center font-bold border border-white"
                    style={{ backgroundColor: colors.bg, color: colors.text, width: 30, height: 28 }}
                  >
                    {value || '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
