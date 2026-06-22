'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ORG_NAME } from '@/lib/constants'
import type { AdminRole } from '@/lib/analytics/types'
import {
  LayoutDashboard,
  FileText,
  Users,
  Star,
  Handshake,
  Inbox,
  Mail,
  Globe,
  LogOut,
  ShoppingBag,
  Image as GalleryIcon,
  UserCheck,
  ArrowUpRight,
  ClipboardList,
  Newspaper,
  Menu,
  X,
  BarChart3,
  Trophy,
  Download,
  History,
  Scale,
} from 'lucide-react'

type NavItem = { href: string; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }

const superAdminNav: NavItem[] = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/blog', label: 'Blog Posts', Icon: FileText },
  { href: '/admin/players', label: 'Players', Icon: UserCheck },
  { href: '/admin/team', label: 'Mgmt. Staff', Icon: Users },
  { href: '/admin/ambassadors', label: 'Ambassadors', Icon: Star },
  { href: '/admin/partners', label: 'Partners', Icon: Handshake },
  { href: '/admin/shop', label: 'Shop', Icon: ShoppingBag },
  { href: '/admin/gallery', label: 'Gallery', Icon: GalleryIcon },
  { href: '/admin/contacts', label: 'Contacts', Icon: Inbox },
  { href: '/admin/inquiries', label: 'Inquiries', Icon: ClipboardList },
  { href: '/admin/newsletter', label: 'Newsletter', Icon: Newspaper },
  { href: '/admin/board', label: 'Board', Icon: Users },
]

const analyticsNav: NavItem[] = [
  { href: '/admin/analytics', label: 'Analytics', Icon: BarChart3 },
  { href: '/admin/analytics/squad', label: 'Squad', Icon: Users },
  { href: '/admin/analytics/matches', label: 'Matches', Icon: Trophy },
  { href: '/admin/analytics/players', label: 'Player Stats', Icon: UserCheck },
  { href: '/admin/analytics/comparison', label: 'Comparison', Icon: Scale },
  { href: '/admin/analytics/exports', label: 'Exports', Icon: Download },
  { href: '/admin/analytics/audit', label: 'Audit Log', Icon: History },
]

function AdminNav({
  pathname,
  onNavigate,
  role,
}: {
  pathname: string
  onNavigate: () => void
  role: AdminRole | null
}) {
  const router = useRouter()
  const isAnalyst = role === 'data_analyst'
  const navSections: { title?: string; items: NavItem[] }[] = isAnalyst
    ? [{ title: 'Game Stats', items: analyticsNav }]
    : [
        { items: superAdminNav },
        { title: 'Game Stats', items: analyticsNav },
      ]

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <>
      <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between lg:block">
        <div className="relative h-10 w-36 sm:h-12 sm:w-44">
          <Image src="/Logo.png" alt={ORG_NAME} fill className="object-contain object-left" sizes="176px" />
        </div>
        <button
          type="button"
          onClick={onNavigate}
          className="lg:hidden text-white/80 hover:text-white p-2 -mr-2 min-h-0 min-w-0"
          aria-label="Close menu"
        >
          <X size={22} />
        </button>
        <p className="hidden lg:block text-white/40 text-[10px] mt-2 uppercase tracking-widest">
          {isAnalyst ? 'Data Analyst' : 'Admin Portal'}
        </p>
      </div>

      <nav className="flex-1 py-3 sm:py-4 overflow-y-auto overscroll-contain">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="px-4 sm:px-5 pt-3 pb-1 text-[9px] uppercase tracking-widest text-white/30 font-bold">
                {section.title}
              </p>
            )}
            {section.items.map(({ href, label, Icon }) => {
              const active = pathname === href || (href !== '/admin' && href !== '/admin/analytics' && pathname.startsWith(href))
              const isDashboardActive = (href === '/admin' || href === '/admin/analytics') && pathname === href
              const isActive = active || isDashboardActive
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-4 sm:px-5 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#fee11b] text-[#01255f]'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} className="shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 sm:p-5 border-t border-white/10 space-y-3">
        {!isAnalyst && (
          <a
            href="https://server393.web-hosting.com:2096/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white/40 hover:text-white text-xs transition-colors"
          >
            <Mail size={13} />
            Webmail
            <ArrowUpRight size={11} />
          </a>
        )}
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-white/40 hover:text-white text-xs transition-colors"
        >
          <Globe size={13} />
          View Site
          <ArrowUpRight size={11} />
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 text-white/40 hover:text-red-400 text-xs transition-colors"
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/admin/login'
  const [menuOpen, setMenuOpen] = useState(false)
  const [role, setRole] = useState<AdminRole | null>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMenuOpen(false) }, [pathname])

  useEffect(() => {
    if (isLogin) return
    const controller = new AbortController()
    fetch('/api/admin/session', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role) setRole(data.role as AdminRole)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [isLogin])

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  if (isLogin) {
    return (
      <div className="min-h-screen bg-[#f5f7fc]" style={{ fontFamily: 'var(--font-body)' }}>
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f7fc]" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-[#01255f] border-b border-white/10 flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="text-white p-2 -ml-2 min-h-0 min-w-0"
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <Menu size={22} />
        </button>
        <span className="text-white text-xs font-bold uppercase tracking-widest">
          {role === 'data_analyst' ? 'Analyst' : 'Admin'}
        </span>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/70 hover:text-white p-2 -mr-2 text-xs font-semibold min-h-0 min-w-0"
        >
          Site
        </Link>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          aria-label="Close menu backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[min(100vw-3rem,17rem)] sm:w-56 bg-[#01255f] flex flex-col shadow-xl transition-transform duration-200 ease-out lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AdminNav pathname={pathname} onNavigate={() => setMenuOpen(false)} role={role} />
      </aside>

      <main className="min-w-0 w-full lg:pl-56 pt-14 lg:pt-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
