'use client'

import { useState } from 'react'
import Image from 'next/image'

import { IMAGE_PLACEHOLDER } from '@/lib/constants'

const PLACEHOLDER = IMAGE_PLACEHOLDER

type Position = 'goalkeeper' | 'defender' | 'midfielder' | 'forward'

export type Player = {
  id: string
  name: string
  number: number
  position: Position
  team: string
  image: string
  stats?: {
    goals: number
    assists: number
    appearances: number
    minutes: number
  }
}

const POSITIONS: { key: Position | 'all'; label: string; short: string }[] = [
  { key: 'all', label: 'All Players', short: 'All' },
  { key: 'goalkeeper', label: 'Goalkeepers', short: 'GK' },
  { key: 'defender', label: 'Defenders', short: 'DEF' },
  { key: 'midfielder', label: 'Midfielders', short: 'MID' },
  { key: 'forward', label: 'Forwards', short: 'FWD' },
]

const POSITION_COLORS: Record<Position, string> = {
  goalkeeper: 'bg-[#fee11b] text-[#01255f]',
  defender: 'bg-[#fee11b] text-[#01255f]',
  midfielder: 'bg-[#fee11b] text-[#01255f]',
  forward: 'bg-[#fee11b] text-[#01255f]',
}

export default function PlayerGrid({ players }: { players: Player[] }) {
  const [active, setActive] = useState<Position | 'all'>('all')

  const filtered = active === 'all' ? players : players.filter((p) => p.position === active)

  const counts = {
    all: players.length,
    goalkeeper: players.filter((p) => p.position === 'goalkeeper').length,
    defender: players.filter((p) => p.position === 'defender').length,
    midfielder: players.filter((p) => p.position === 'midfielder').length,
    forward: players.filter((p) => p.position === 'forward').length,
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-10">
        {POSITIONS.map(({ key, label, short }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              active === key
                ? 'bg-[#fee11b] text-[#01255f]'
                : 'bg-white border border-gray-200 text-[#5a6478] hover:border-[#01255f] hover:text-[#01255f]'
            }`}
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{short}</span>
            <span className="ml-2 text-[10px] opacity-60">({counts[key]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-[#5a6478] text-sm">No players in this category yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {filtered.map((player) => (
            <div
              key={player.id}
              className="group relative bg-[#01255f] overflow-hidden"
            >
              {/* Jersey number watermark */}
              <div
                className="absolute bottom-2 right-2 text-[5rem] font-black text-white/10 leading-none select-none pointer-events-none z-0"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {player.number}
              </div>

              {/* Photo */}
              <div className="relative h-52 sm:h-60 overflow-hidden">
                <Image
                  src={player.image || PLACEHOLDER}
                  alt={player.name}
                  fill
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#01255f] via-[#01255f]/20 to-transparent" />
              </div>

              {/* Info */}
              <div className="relative z-10 p-3 sm:p-4 -mt-8 sm:-mt-10">
                <div className="flex items-end justify-between mb-1.5">
                  <span
                    className="text-[#fee11b] font-black text-xl sm:text-2xl leading-none"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {player.number}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 ${POSITION_COLORS[player.position]}`}>
                    {player.position === 'goalkeeper' ? 'GK' :
                     player.position === 'defender' ? 'DEF' :
                     player.position === 'midfielder' ? 'MID' : 'FWD'}
                  </span>
                </div>
                <h3
                  className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {player.name}
                </h3>
                {player.stats && (player.stats.goals > 0 || player.stats.assists > 0) && (
                  <div className="flex gap-2 mt-2">
                    {player.stats.goals > 0 && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-[#fee11b]/20 text-[#fee11b] px-1.5 py-0.5">
                        {player.stats.goals}G
                      </span>
                    )}
                    {player.stats.assists > 0 && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-white/10 text-white/80 px-1.5 py-0.5">
                        {player.stats.assists}A
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
