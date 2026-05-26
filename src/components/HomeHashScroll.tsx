'use client'

import { useEffect } from 'react'

/** Scroll to `location.hash` after landing on the homepage from another route. */
export default function HomeHashScroll() {
  useEffect(() => {
    const scrollToHash = () => {
      const { hash } = window.location
      if (!hash) return
      const target = document.querySelector(hash)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    scrollToHash()
    window.addEventListener('hashchange', scrollToHash)
    return () => window.removeEventListener('hashchange', scrollToHash)
  }, [])

  return null
}
