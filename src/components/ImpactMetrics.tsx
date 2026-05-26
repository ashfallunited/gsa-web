'use client'

import { useEffect, useRef, useState } from 'react'

const metrics = [
  { value: 5000, suffix: '+', label: 'Youth Reached', sub: 'Across Monrovia since founding' },
  { value: 40000, suffix: '+', label: 'Meals Provided', sub: 'Through our nutrition programme' },
  { value: 65000, suffix: '+', label: 'Education Hours', sub: 'Delivered to participants' },
  { value: 92, suffix: '%', label: 'School Retention', sub: 'Of enrolled participants' },
]

function useCounter(target: number, running: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!running) return
    const step = Math.ceil(target / 80)
    let cur = 0
    const t = setInterval(() => {
      cur = Math.min(cur + step, target)
      setVal(cur)
      if (cur >= target) clearInterval(t)
    }, 20)
    return () => clearInterval(t)
  }, [target, running])
  return val
}

function Metric({ m, running }: { m: (typeof metrics)[0]; running: boolean }) {
  const val = useCounter(m.value, running)
  return (
    <div className="border-l-2 border-[#fee11b] pl-5 sm:pl-6 py-2">
      <div
        className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-1"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {val.toLocaleString()}{m.suffix}
      </div>
      <div className="text-[#fee11b] font-semibold text-xs sm:text-sm mb-1">{m.label}</div>
      <div className="text-white/50 text-[11px] sm:text-xs">{m.sub}</div>
    </div>
  )
}

export default function ImpactMetrics() {
  const ref = useRef<HTMLDivElement>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setRunning(true) },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section id="impact" className="py-16 sm:py-24 lg:py-32 bg-[#01255f]" ref={ref}>
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">

        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16 items-start">
          <div>
            <span className="label label-light">Our Impact</span>
            <h2
              className="text-2xl sm:text-3xl sm:text-4xl font-bold text-white leading-tight mt-2"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Numbers That
              <br />Tell Our Story
            </h2>
            <p className="text-white/60 text-sm leading-relaxed mt-4 max-w-xs">
              Every figure represents a young person in Monrovia whose life has been
              touched by our work.
            </p>
            <div className="mt-6 h-px w-10 bg-[#fee11b]" />
          </div>

          <div className="grid grid-cols-2 gap-6 sm:gap-8">
            {metrics.map((m) => (
              <Metric key={m.label} m={m} running={running} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
