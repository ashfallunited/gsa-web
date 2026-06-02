import type { Metadata } from 'next'
import { DM_Sans, Syne } from 'next/font/google'
import GlobalJsonLd from '@/components/GlobalJsonLd'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import {
  ORG_DESCRIPTION,
  ORG_NAME,
  SITE_HOME_TITLE,
  SITE_OG_IMAGE,
  SITE_PAGE_TITLE_SUFFIX,
  SITE_URL,
} from '@/lib/constants'
import './globals.css'

const body = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
})

const heading = Syne({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['600', '700', '800'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_HOME_TITLE,
    template: `%s | ${SITE_PAGE_TITLE_SUFFIX}`,
  },
  description: ORG_DESCRIPTION,
  keywords: [
    'Ashfall United',
    'Ashfall United Football Club',
    'Ashfall United Youth Development',
    'Ashfall United Football Academy',
    'football club Liberia',
    'youth sport Monrovia',
    'Liberia football',
    'Monrovia football club',
    'Youth Football Liberia',
    'Youth Development Liberia',
    'sport for development Africa',
    'Liberia education sport',
  ],
  authors: [{ name: ORG_NAME, url: SITE_URL }],
  creator: ORG_NAME,
  publisher: ORG_NAME,
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: SITE_URL,
    siteName: ORG_NAME,
    title: SITE_HOME_TITLE,
    description: ORG_DESCRIPTION,
    images: [
      {
        url: SITE_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${ORG_NAME} — Monrovia, Liberia`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_HOME_TITLE,
    description: ORG_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: '/favicon.png',
  },
  verification: {},
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable}`} data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        {/* Preconnect to image CDN (Supabase storage) — eliminates TCP handshake latency for all images */}
        <link rel="preconnect" href="https://fckzyvkbthqvmmjpvfxr.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fckzyvkbthqvmmjpvfxr.supabase.co" />
        {/* Preconnect to Google Analytics */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body>
        <GoogleAnalytics />
        <GlobalJsonLd />
        {children}
      </body>
    </html>
  )
}
