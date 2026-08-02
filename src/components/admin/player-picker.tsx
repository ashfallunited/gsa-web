'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import PlayerAvatar from '@/components/admin/player-avatar'

export type PlayerPickerOption = { id: string; name: string; number: number; image?: string }

/** Player select with avatar + name — a native <select> can't render images, so this is a custom listbox. */
export default function PlayerPicker({
  players,
  value,
  onChange,
  placeholder = 'Select player…',
  disabled = false,
}: {
  players: PlayerPickerOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const selected = players.find((p) => p.id === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return players
    return players.filter((p) => p.name.toLowerCase().includes(q) || String(p.number).includes(q))
  }, [players, query])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        className="w-full flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-sm text-left focus:outline-none focus:border-[#01255f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selected ? (
          <>
            <PlayerAvatar image={selected.image} name={selected.name} size={24} />
            <span className="flex-1 min-w-0 truncate text-[#01255f] font-medium">#{selected.number} {selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-[#5a6478]">{placeholder}</span>
        )}
        <ChevronDown size={16} className={`text-[#5a6478] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 shadow-lg max-h-[min(20rem,60vh)] flex flex-col">
          <div className="p-2 border-b border-gray-100 shrink-0">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players…"
              className="w-full border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#01255f]"
            />
          </div>
          <ul className="overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-[#5a6478] text-center">No players found.</li>
            )}
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.id)
                    close()
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                    p.id === value ? 'bg-[#fee11b]/15' : ''
                  }`}
                >
                  <PlayerAvatar image={p.image} name={p.name} size={28} />
                  <span className="min-w-0 truncate text-sm text-[#01255f] font-medium">#{p.number} {p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
