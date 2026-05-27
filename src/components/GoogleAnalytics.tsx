'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { GA_MEASUREMENT_ID } from '@/lib/constants'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

function trackPageView(path: string) {
  window.gtag?.('config', GA_MEASUREMENT_ID, { page_path: path })
}

export default function GoogleAnalytics() {
  const pathname = usePathname()
  const isProduction = process.env.NODE_ENV === 'production'
  const isAdmin = pathname.startsWith('/admin')

  useEffect(() => {
    if (!isProduction || isAdmin) return
    trackPageView(pathname)
  }, [isProduction, isAdmin, pathname])

  if (!isProduction || isAdmin) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  )
}
