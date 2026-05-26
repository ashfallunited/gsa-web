'use client'

import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ORG_NAME } from '@/lib/constants'
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
} from 'lucide-react'

const navItems = [
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

function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  if (pathname === '/admin/login') return null

  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-[#01255f] flex flex-col z-40 overflow-y-auto">
      <div className="p-5 border-b border-white/10">
        <div className="relative h-12 w-44">
          <Image src="/Logo.png" alt={ORG_NAME} fill className="object-contain object-left" sizes="176px" />
        </div>
        <p className="text-white/40 text-[10px] mt-2 uppercase tracking-widest">Admin Portal</p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#fee11b] text-[#01255f]'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-5 border-t border-white/10 space-y-3">
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
        <Link href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/40 hover:text-white text-xs transition-colors">
          <Globe size={13} />
          View Site
          <ArrowUpRight size={11} />
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-white/40 hover:text-red-400 text-xs transition-colors"
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/admin/login'

  return (
    <div className="min-h-screen bg-[#f5f7fc]" style={{ fontFamily: 'var(--font-body)' }}>
      <AdminNav />
      <main className={isLogin ? '' : 'ml-56'}>
        {children}
      </main>
    </div>
  )
}
