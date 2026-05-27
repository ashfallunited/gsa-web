'use client'

import type { LucideIcon } from 'lucide-react'
import PlayerAvatar from '@/components/admin/player-avatar'

type StatCardProps = {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  accent?: 'navy' | 'gold' | 'green' | 'red'
  avatarImage?: string
  avatarName?: string
}

const ACCENT = {
  navy: 'border-l-[#01255f] bg-white',
  gold: 'border-l-[#fee11b] bg-white',
  green: 'border-l-emerald-500 bg-white',
  red: 'border-l-red-500 bg-white',
}

const ICON_BG = {
  navy: 'bg-[#01255f]/10 text-[#01255f]',
  gold: 'bg-[#fee11b]/30 text-[#01255f]',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
}

export default function StatCard({ label, value, sub, icon: Icon, accent = 'navy', avatarImage, avatarName }: StatCardProps) {
  return (
    <div
      className={`border border-gray-200 border-l-4 ${ACCENT[accent]} p-4 sm:p-5 min-h-[7.5rem] flex flex-col justify-between shadow-sm`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] leading-tight">{label}</p>
        {avatarName ? (
          <PlayerAvatar image={avatarImage} name={avatarName} size={28} />
        ) : Icon ? (
          <span className={`shrink-0 p-1.5 rounded-sm ${ICON_BG[accent]}`}>
            <Icon size={14} strokeWidth={2.5} />
          </span>
        ) : null}
      </div>
      <div>
        <p
          className="text-xl sm:text-2xl lg:text-3xl font-black text-[#01255f] leading-none break-words"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-[#5a6478] mt-1.5 leading-snug line-clamp-2">{sub}</p>}
      </div>
    </div>
  )
}
