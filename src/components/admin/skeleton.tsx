function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ''}`} />
}

export function SkeletonStatCard() {
  return (
    <div className="border border-gray-200 border-l-4 border-l-gray-200 bg-white p-4 sm:p-5 min-h-[7.5rem] flex flex-col justify-between shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Pulse className="h-2.5 w-24" />
        <Pulse className="h-7 w-7 rounded-sm" />
      </div>
      <div className="space-y-2">
        <Pulse className="h-8 w-10" />
        <Pulse className="h-2.5 w-20" />
      </div>
    </div>
  )
}

export function SkeletonTableRow({ cols }: { cols: number }) {
  const widths = ['w-28', 'w-36', 'w-16', 'w-32', 'w-14', 'w-20']
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-3">
          <Pulse className={`h-3.5 ${widths[i % widths.length]}`} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonListRow() {
  return (
    <li className="flex items-center gap-2 border-b border-gray-100 pb-2 animate-pulse">
      <Pulse className="h-3 w-4 rounded-none shrink-0" />
      <Pulse className="h-6 w-6 rounded-full shrink-0" />
      <Pulse className="h-3.5 flex-1" />
      <Pulse className="h-3.5 w-8 shrink-0" />
    </li>
  )
}

export function SkeletonMatchCard() {
  return (
    <div className="bg-white border border-gray-200 p-4 sm:p-5 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-3 w-10" />
          </div>
          <Pulse className="h-5 w-48" />
          <Pulse className="h-3 w-36" />
        </div>
        <div className="flex gap-2 shrink-0">
          <Pulse className="h-8 w-20" />
          <Pulse className="h-8 w-20" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonPlayerCard() {
  return (
    <div className="bg-[#01255f]/30 overflow-hidden animate-pulse">
      <div className="h-44 sm:h-52 bg-[#01255f]/20" />
      <div className="p-3 sm:p-4 space-y-2">
        <div className="flex justify-between items-center">
          <div className="h-6 w-8 bg-white/20 rounded" />
          <div className="h-4 w-10 bg-white/20 rounded" />
        </div>
        <div className="h-3.5 bg-white/20 rounded w-3/4" />
        <div className="h-3 bg-white/20 rounded w-1/3 mt-1" />
      </div>
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Two panels */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {[5, 6].map((rows, pi) => (
          <div key={pi} className="bg-white border border-gray-200 p-4 sm:p-5">
            <Pulse className="h-4 w-32 mb-5" />
            <ul className="space-y-2">
              {Array.from({ length: rows }).map((_, i) => (
                <SkeletonListRow key={i} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Matches table */}
      <div className="bg-white border border-gray-200 p-4 sm:p-5">
        <Pulse className="h-4 w-36 mb-5" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-gray-50 pb-3 animate-pulse">
              <Pulse className="h-3.5 w-20" />
              <Pulse className="h-3.5 w-32" />
              <Pulse className="h-3.5 w-12" />
              <Pulse className="h-3.5 w-28" />
              <Pulse className="h-3.5 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
