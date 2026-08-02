'use client'

import PlayerAvatar from '@/components/admin/player-avatar'
import type { TeamLeaderboardEntry } from '@/lib/evaluations/types'

export default function TeamLeaderboard({
  entries,
  maxTotal,
  onSelect,
  selectedPlayerId,
  emptyLabel = 'No evaluations recorded for this period.',
}: {
  entries: TeamLeaderboardEntry[]
  maxTotal: number
  onSelect?: (playerId: string) => void
  selectedPlayerId?: string
  emptyLabel?: string
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-[#5a6478] py-4 text-center">{emptyLabel}</p>
  }

  return (
    <ul className="space-y-1.5">
      {entries.map((e, i) => {
        const width = maxTotal > 0 ? Math.round((e.averageTotal / maxTotal) * 100) : 0
        return (
          <li key={e.playerId}>
            <button
              type="button"
              onClick={() => onSelect?.(e.playerId)}
              disabled={!onSelect}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 text-left transition-colors ${
                onSelect ? 'hover:bg-gray-50 cursor-pointer' : ''
              } ${selectedPlayerId === e.playerId ? 'bg-[#fee11b]/15' : ''}`}
            >
              <span className="text-[#5a6478] text-xs w-5 shrink-0 text-center font-medium">{i + 1}</span>
              <PlayerAvatar image={e.playerImage} name={e.playerName} size={26} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#01255f] truncate">#{e.playerNumber} {e.playerName}</p>
                <div className="h-1.5 bg-gray-100 rounded-sm overflow-hidden mt-1">
                  <div className="h-full bg-[#01255f] transition-all duration-500" style={{ width: `${width}%` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-[#01255f]">
                  {e.averageTotal}<span className="text-[10px] font-normal text-[#5a6478]">/{maxTotal}</span>
                </p>
                <p className="text-[9px] text-[#5a6478]">{e.sessionCount} sess.</p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
