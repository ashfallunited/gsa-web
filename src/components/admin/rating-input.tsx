'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

export default function RatingInput({
  value,
  onChange,
  max = 5,
  disabled = false,
}: {
  value: number
  onChange: (value: number) => void
  max?: number
  disabled?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value

  return (
    <div className="flex" onMouseLeave={() => setHover(null)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const filled = n <= display
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`Rate ${n} of ${max}`}
            aria-pressed={value === n}
            className="p-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Star
              size={28}
              strokeWidth={1.5}
              className={filled ? 'text-[#fee11b]' : 'text-gray-300'}
              fill={filled ? '#fee11b' : 'none'}
            />
          </button>
        )
      })}
    </div>
  )
}
