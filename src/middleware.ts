import { NextRequest, NextResponse } from 'next/server'
import { isAnalystAllowedAdminPath } from '@/lib/analytics/permissions'
import { verifySession, COOKIE } from '@/lib/session'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = req.cookies.get(COOKIE)?.value
    const session = token ? await verifySession(token) : null
    if (!session) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (session.role === 'data_analyst') {
      if (pathname === '/admin') {
        return NextResponse.redirect(new URL('/admin/analytics', req.url))
      }
      if (!isAnalystAllowedAdminPath(pathname)) {
        return NextResponse.redirect(new URL('/admin/analytics', req.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
