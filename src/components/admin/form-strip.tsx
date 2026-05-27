const CLR = {
  W: 'bg-green-500 text-white',
  D: 'bg-gray-400 text-white',
  L: 'bg-red-500 text-white',
} as const

export default function FormStrip({
  results,
  size = 'md',
}: {
  results: ('W' | 'D' | 'L')[]
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[10px]'
  if (results.length === 0) return <span className="text-xs text-[#5a6478]">No results yet</span>
  return (
    <div className="flex items-center gap-1">
      {results.map((r, i) => (
        <span key={i} className={`${dim} ${CLR[r]} flex items-center justify-center font-black shrink-0`}>
          {r}
        </span>
      ))}
    </div>
  )
}
