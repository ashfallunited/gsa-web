'use client'

type LinePoint = { label: string; value: number }

/** Trend line for a small ordered series (weeks in a month, or sessions in a week/month). */
export default function LineChart({
  points,
  max,
  height = 160,
  color = '#01255f',
}: {
  points: LinePoint[]
  max?: number
  height?: number
  color?: string
}) {
  if (points.length === 0) {
    return <p className="text-sm text-[#5a6478] py-6 text-center">No data for this period.</p>
  }

  const padX = 28
  const padTop = 16
  const padBottom = 28
  const pointGap = 64
  const width = Math.max(280, padX * 2 + Math.max(1, points.length - 1) * pointGap)
  const innerHeight = height - padTop - padBottom
  const effectiveMax = max ?? Math.max(...points.map((p) => p.value), 1)

  const xFor = (i: number) => (points.length === 1 ? width / 2 : padX + i * ((width - padX * 2) / (points.length - 1)))
  const yFor = (v: number) => padTop + innerHeight - (effectiveMax > 0 ? (v / effectiveMax) * innerHeight : 0)

  const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value), ...p }))
  const linePath = coords.map((c) => `${c.x},${c.y}`).join(' ')

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend chart">
        {/* Baseline */}
        <line x1={padX} y1={padTop + innerHeight} x2={width - padX} y2={padTop + innerHeight} stroke="#e5e7eb" strokeWidth={1} />

        {coords.length > 1 && (
          <polyline points={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={3.5} fill={color} />
            <text x={c.x} y={padTop + innerHeight + 16} textAnchor="middle" fontSize={9} fill="#5a6478" fontWeight={600}>
              {c.label}
            </text>
            <text x={c.x} y={c.y - 8} textAnchor="middle" fontSize={9.5} fill="#01255f" fontWeight={700}>
              {c.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
