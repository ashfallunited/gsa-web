'use client'

import { useState } from 'react'

type PieSlice = { label: string; value: number }

const PALETTE = ['#01255f', '#fee11b', '#4a68a8', '#5a6478', '#8fa3cf', '#c9a227', '#2f4b8a', '#9aa5b8', '#c9d3e8', '#7c8ba1']
// Readable text color for each palette color above, paired by index.
const TEXT_ON = ['#ffffff', '#01255f', '#ffffff', '#ffffff', '#01255f', '#01255f', '#ffffff', '#01255f', '#01255f', '#ffffff']

function polarPoint(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarPoint(cx, cy, r, startAngle)
  const end = polarPoint(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

export default function PieChart({ data, size = 180 }: { data: PieSlice[]; size?: number }) {
  const [selected, setSelected] = useState<number | null>(null)
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (data.length === 0 || total === 0) {
    return <p className="text-sm text-[#5a6478] py-6 text-center">No data yet.</p>
  }

  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 2
  const labelR = r * 0.65

  const slices = data.reduce<Array<PieSlice & { start: number; end: number; color: string; textColor: string; pct: number }>>(
    (acc, d, i) => {
      const start = acc.length > 0 ? acc[acc.length - 1].end : -90
      const pct = (d.value / total) * 100
      const end = start + (d.value / total) * 360
      acc.push({ ...d, start, end, color: PALETTE[i % PALETTE.length], textColor: TEXT_ON[i % TEXT_ON.length], pct })
      return acc
    },
    []
  )

  const toggle = (i: number) => setSelected((prev) => (prev === i ? null : i))
  const activeSlice = selected !== null ? slices[selected] : null

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        style={{ width: size, height: size }}
        role="img"
        aria-label="Highest-rated category distribution"
      >
        {slices.length === 1 ? (
          <g onClick={() => toggle(0)} style={{ cursor: 'pointer' }}>
            <circle cx={cx} cy={cy} r={r} fill={slices[0].color} />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill={slices[0].textColor}>
              {Math.round(slices[0].pct)}%
            </text>
          </g>
        ) : (
          slices.map((s, i) => {
            const mid = (s.start + s.end) / 2
            const labelPos = polarPoint(cx, cy, labelR, mid)
            return (
              <g key={i} onClick={() => toggle(i)} style={{ cursor: 'pointer' }}>
                <path
                  d={arcPath(cx, cy, r, s.start, s.end)}
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  opacity={selected === null || selected === i ? 1 : 0.5}
                />
                {s.pct >= 6 && (
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10.5}
                    fontWeight={700}
                    fill={s.textColor}
                  >
                    {Math.round(s.pct)}%
                  </text>
                )}
              </g>
            )
          })
        )}
      </svg>
      <p className="text-xs text-center min-h-[1rem]">
        {activeSlice ? (
          <span className="font-bold text-[#01255f]">
            {activeSlice.label}: {activeSlice.value} ({Math.round(activeSlice.pct)}%)
          </span>
        ) : (
          <span className="text-[#5a6478]">Tap a slice for details</span>
        )}
      </p>
    </div>
  )
}
