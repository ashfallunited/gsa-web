'use client'

import { useState } from 'react'

export default function PlayerAvatar({
  image,
  name,
  size = 32,
}: {
  image?: string
  name: string
  size?: number
}) {
  const [err, setErr] = useState(false)
  const initials = name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (!image || err) {
    return (
      <div
        className="shrink-0 rounded-full bg-[#01255f] flex items-center justify-center text-white font-bold select-none"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      src={image}
      alt={name}
      onError={() => setErr(true)}
      className="shrink-0 rounded-full object-cover object-top"
      style={{ width: size, height: size }}
    />
  )
}
