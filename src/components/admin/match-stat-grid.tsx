'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export type StatRow = {
  playerId: string
  started: boolean
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  headerGoals?: number
  leftFootGoals?: number
  rightFootGoals?: number
  outsideBoxGoals?: number
  penaltiesTaken?: number
  penaltiesScored?: number
  penaltiesSaved?: number
  penaltiesFaced?: number
}

type NumField = keyof Omit<StatRow, 'playerId' | 'started'>

const inputCls = 'w-full border border-gray-200 bg-white px-2 py-2.5 text-sm focus:outline-none focus:border-[#01255f]'
const tableInputCls = 'border border-gray-200 px-1 py-1 text-xs focus:outline-none focus:border-[#01255f]'

const GOAL_DETAIL: { label: string; field: NumField; max: number }[] = [
  { label: 'Header', field: 'headerGoals', max: 20 },
  { label: 'Left Foot', field: 'leftFootGoals', max: 20 },
  { label: 'Right Foot', field: 'rightFootGoals', max: 20 },
  { label: 'Out of Box', field: 'outsideBoxGoals', max: 20 },
]

const PEN_DETAIL: { label: string; field: NumField; max: number }[] = [
  { label: 'Taken', field: 'penaltiesTaken', max: 20 },
  { label: 'Scored', field: 'penaltiesScored', max: 20 },
  { label: 'Saved', field: 'penaltiesSaved', max: 20 },
  { label: 'Faced', field: 'penaltiesFaced', max: 20 },
]

export function MatchStatMobileCard({
  name,
  row,
  isLocked,
  onChange,
}: {
  name: string
  row: StatRow
  isLocked: boolean
  onChange: (field: keyof StatRow, value: boolean | number) => void
}) {
  const [expanded, setExpanded] = useState((row.goals ?? 0) > 0)

  const basicFields: { label: string; field: NumField; max: number }[] = [
    { label: 'Min', field: 'minutes', max: 120 },
    { label: 'G', field: 'goals', max: 20 },
    { label: 'A', field: 'assists', max: 20 },
    { label: 'Y', field: 'yellowCards', max: 2 },
    { label: 'R', field: 'redCards', max: 1 },
  ]

  return (
    <div className="border border-gray-200 p-3 sm:p-4 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-[#01255f] text-sm truncate">{name}</p>
        <label className="flex items-center gap-2 text-xs font-semibold text-[#5a6478] shrink-0 cursor-pointer py-1">
          <input
            type="checkbox"
            checked={row.started}
            disabled={isLocked}
            onChange={(e) => onChange('started', e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          Started
        </label>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {basicFields.map(({ label, field, max }) => (
          <div key={field}>
            <label className="block text-[9px] uppercase tracking-widest text-[#5a6478] mb-1 text-center">{label}</label>
            <input
              type="number"
              min={0}
              max={max}
              value={(row[field] as number | undefined) ?? 0}
              disabled={isLocked}
              onChange={(e) => onChange(field, Number(e.target.value))}
              className={inputCls + ' text-center'}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#5a6478] hover:text-[#01255f] transition-colors py-1 w-full"
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        Goal &amp; Penalty Detail
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-200 pt-3">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[#5a6478] font-bold mb-2">Goal Breakdown</p>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_DETAIL.map(({ label, field, max }) => (
                <div key={field}>
                  <label className="block text-[9px] uppercase tracking-widest text-[#5a6478] mb-0.5">{label}</label>
                  <input
                    type="number"
                    min={0}
                    max={max}
                    value={(row[field] as number | undefined) ?? 0}
                    disabled={isLocked}
                    onChange={(e) => onChange(field, Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] uppercase tracking-widest text-[#5a6478] font-bold mb-2">Penalty Stats</p>
            <div className="grid grid-cols-2 gap-2">
              {PEN_DETAIL.map(({ label, field, max }) => (
                <div key={field}>
                  <label className="block text-[9px] uppercase tracking-widest text-[#5a6478] mb-0.5">{label}</label>
                  <input
                    type="number"
                    min={0}
                    max={max}
                    value={(row[field] as number | undefined) ?? 0}
                    disabled={isLocked}
                    onChange={(e) => onChange(field, Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function MatchStatDesktopTable({
  rows,
  playerName,
  isLocked,
  onChange,
}: {
  rows: StatRow[]
  playerName: (id: string) => string
  isLocked: boolean
  onChange: (playerId: string, field: keyof StatRow, value: boolean | number) => void
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const numInput = (pid: string, field: keyof StatRow, val: number, max: number, w = 'w-10') => (
    <input
      type="number"
      min={0}
      max={max}
      value={val}
      disabled={isLocked}
      onChange={(e) => onChange(pid, field, Number(e.target.value))}
      className={`${w} ${tableInputCls}`}
    />
  )

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-widest text-[#5a6478] border-b">
            <th className="pb-2 pr-2">Player</th>
            <th className="pb-2 px-1">Start</th>
            <th className="pb-2 px-1">Min</th>
            <th className="pb-2 px-1">G</th>
            <th className="pb-2 px-1">A</th>
            <th className="pb-2 px-1">Y</th>
            <th className="pb-2 px-1">R</th>
            <th className="pb-2 pl-2 text-right w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isExpanded = expandedRows.has(row.playerId)
            return (
              <React.Fragment key={row.playerId}>
                <tr className="border-b border-gray-50">
                  <td className="py-2 pr-2 font-medium text-[#01255f] whitespace-nowrap">{playerName(row.playerId)}</td>
                  <td className="py-2 px-1">
                    <input
                      type="checkbox"
                      checked={row.started}
                      disabled={isLocked}
                      onChange={(e) => onChange(row.playerId, 'started', e.target.checked)}
                    />
                  </td>
                  <td className="py-2 px-1">{numInput(row.playerId, 'minutes', row.minutes, 120, 'w-14')}</td>
                  <td className="py-2 px-1">{numInput(row.playerId, 'goals', row.goals, 20)}</td>
                  <td className="py-2 px-1">{numInput(row.playerId, 'assists', row.assists, 20)}</td>
                  <td className="py-2 px-1">{numInput(row.playerId, 'yellowCards', row.yellowCards, 2)}</td>
                  <td className="py-2 px-1">{numInput(row.playerId, 'redCards', row.redCards, 1)}</td>
                  <td className="py-2 pl-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggle(row.playerId)}
                      title="Goal & Penalty Detail"
                      className="text-[#5a6478] hover:text-[#01255f] transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="bg-[#f5f7fc] border-b border-gray-100">
                    <td colSpan={8} className="px-3 py-3">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-[#5a6478] font-bold mb-2">Goal Breakdown</p>
                          <div className="grid grid-cols-4 gap-2">
                            {GOAL_DETAIL.map(({ label, field, max }) => (
                              <div key={field}>
                                <label className="block text-[9px] uppercase tracking-widest text-[#5a6478] mb-1">{label}</label>
                                {numInput(row.playerId, field, (row[field] as number | undefined) ?? 0, max)}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-[#5a6478] font-bold mb-2">Penalty Stats</p>
                          <div className="grid grid-cols-4 gap-2">
                            {PEN_DETAIL.map(({ label, field, max }) => (
                              <div key={field}>
                                <label className="block text-[9px] uppercase tracking-widest text-[#5a6478] mb-1">{label}</label>
                                {numInput(row.playerId, field, (row[field] as number | undefined) ?? 0, max)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
