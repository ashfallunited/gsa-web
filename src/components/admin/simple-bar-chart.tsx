'use client'

export default function SimpleBarChart({
  data,
  labelKey,
  valueKey,
  color = '#01255f',
}: {
  data: Record<string, string | number>[]
  labelKey: string
  valueKey: string
  color?: string
}) {
  if (data.length === 0) {
    return <p className="text-sm text-[#5a6478] py-6 text-center">No data for this filter.</p>
  }

  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1)

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const value = Number(item[valueKey]) || 0
        const width = `${Math.round((value / max) * 100)}%`
        return (
          <div key={String(item[labelKey])}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#01255f]">{String(item[labelKey])}</span>
              <span className="text-[#5a6478]">{value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-sm overflow-hidden">
              <div className="h-full transition-all duration-500" style={{ width, backgroundColor: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
