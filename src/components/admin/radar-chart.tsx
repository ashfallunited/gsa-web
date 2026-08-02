'use client'

type RadarPoint = { label: string; value: number }

const RINGS = [0.2, 0.4, 0.6, 0.8, 1]

function polarPoint(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
}

function polygonPoints(
  data: RadarPoint[],
  max: number,
  cx: number,
  cy: number,
  radius: number,
  angleFor: (i: number) => number
) {
  return data.map((d, i) => {
    const ratio = max > 0 ? Math.max(0, Math.min(1, d.value / max)) : 0
    return polarPoint(cx, cy, radius * ratio, angleFor(i))
  })
}

/**
 * Spider/radar chart for N category averages. Works for any axis count (6 GK categories, 13 outfield).
 * Pass `compareData` (same length/order as `data`) to overlay a second polygon — e.g. squad average.
 */
export default function RadarChart({
  data,
  max,
  compareData,
  label = 'Player',
  compareLabel = 'Squad Avg',
  size = 340,
  color = '#01255f',
  compareColor = '#fee11b',
}: {
  data: RadarPoint[]
  max: number
  compareData?: RadarPoint[]
  label?: string
  compareLabel?: string
  size?: number
  color?: string
  compareColor?: string
}) {
  if (data.length === 0) return null

  const n = data.length
  // Generous enough that even the longest labels (e.g. "Discipline", "Work Rate") clear the
  // viewBox edge at the far-left/right axes — SVG clips anything outside its own bounds by default.
  const labelPad = 66
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - labelPad
  const angleFor = (i: number) => -90 + i * (360 / n)

  const dataPoints = polygonPoints(data, max, cx, cy, radius, angleFor)
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(' ')

  const comparePoints = compareData ? polygonPoints(compareData, max, cx, cy, radius, angleFor) : null
  const comparePath = comparePoints?.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto max-w-[420px] mx-auto"
        style={{ overflow: 'visible' }}
        role="img"
        aria-label="Category ratings radar chart"
      >
        {/* Grid rings */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={Array.from({ length: n }, (_, i) => {
              const p = polarPoint(cx, cy, radius * ring, angleFor(i))
              return `${p.x},${p.y}`
            }).join(' ')}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {data.map((_, i) => {
          const p = polarPoint(cx, cy, radius, angleFor(i))
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth={1} />
        })}

        {/* Comparison polygon (drawn first, underneath) */}
        {comparePath && <polygon points={comparePath} fill="none" stroke={compareColor} strokeWidth={2} strokeDasharray="4 3" />}
        {comparePoints?.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={compareColor} />)}

        {/* Data polygon */}
        <polygon points={dataPath} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
        ))}

        {/* Labels */}
        {data.map((d, i) => {
          const angle = angleFor(i)
          const p = polarPoint(cx, cy, radius + 16, angle)
          const cos = Math.cos((angle * Math.PI) / 180)
          const sin = Math.sin((angle * Math.PI) / 180)
          const anchor = cos > 0.15 ? 'start' : cos < -0.15 ? 'end' : 'middle'
          const dy = sin > 0.5 ? 8 : sin < -0.5 ? -2 : 3
          return (
            <text
              key={i}
              x={p.x}
              y={p.y + dy}
              textAnchor={anchor}
              fontSize={9.5}
              fontWeight={700}
              fill="#5a6478"
              style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
              {d.label}
            </text>
          )
        })}
      </svg>

      {compareData && (
        <div className="flex items-center justify-center gap-5 mt-1">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#5a6478]">
            <span className="w-3 h-[3px] rounded-full" style={{ backgroundColor: color }} /> {label}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#5a6478]">
            <svg width="14" height="3"><line x1="0" y1="1.5" x2="14" y2="1.5" stroke={compareColor} strokeWidth={2} strokeDasharray="3 2" /></svg>
            {compareLabel}
          </span>
        </div>
      )}
    </div>
  )
}
