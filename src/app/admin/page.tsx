import { getCollectionCount } from '@/lib/firestore-count'
import { getAdminDb } from '@/lib/firebase-admin'
import Link from 'next/link'

type SeasonRecord = { season: string; w: number; d: number; l: number } | null

async function getSeasonRecord(): Promise<SeasonRecord> {
  try {
    const db = getAdminDb()
    const snap = await db.collection('matches').where('status', '==', 'final').get()
    if (snap.empty) return null

    const bySeasonDesc = new Map<string, { w: number; d: number; l: number }>()
    for (const doc of snap.docs) {
      const data = doc.data()
      const season = String(data.season ?? '')
      if (!season) continue
      const gf = Number(data.goalsFor ?? 0)
      const ga = Number(data.goalsAgainst ?? 0)
      const rec = bySeasonDesc.get(season) ?? { w: 0, d: 0, l: 0 }
      if (gf > ga) rec.w++
      else if (gf < ga) rec.l++
      else rec.d++
      bySeasonDesc.set(season, rec)
    }

    const latestSeason = [...bySeasonDesc.keys()].sort().at(-1)
    if (!latestSeason) return null
    return { season: latestSeason, ...bySeasonDesc.get(latestSeason)! }
  } catch {
    return null
  }
}

async function getStats() {
  const [contacts, posts, unread, published, orders, products, subscribers, inquiries, squadSize, record] =
    await Promise.all([
      getCollectionCount('contacts'),
      getCollectionCount('blog_posts'),
      getCollectionCount('contacts', ['read', '==', false]),
      getCollectionCount('blog_posts', ['status', '==', 'published']),
      getCollectionCount('orders'),
      getCollectionCount('products'),
      getCollectionCount('newsletter_subscribers'),
      getCollectionCount('inquiries', ['read', '==', false]),
      getCollectionCount('players'),
      getSeasonRecord(),
    ])

  return { contacts, posts, unread, published, orders, products, subscribers, inquiries, squadSize, record }
}

export default async function AdminDashboard() {
  const stats = await getStats().catch(() => ({
    contacts: 0,
    posts: 0,
    unread: 0,
    published: 0,
    orders: 0,
    products: 0,
    subscribers: 0,
    inquiries: 0,
    squadSize: 0,
    record: null as SeasonRecord,
  }))

  const recordStr = stats.record
    ? `${stats.record.w}W · ${stats.record.d}D · ${stats.record.l}L`
    : '—'

  const engagementCards = [
    { label: 'Total Enquiries', value: stats.contacts, sub: `${stats.unread} unread`, href: '/admin/contacts' },
    { label: 'Volunteer & Partnership', value: stats.inquiries, sub: 'Unread inquiries', href: '/admin/inquiries' },
    { label: 'Newsletter', value: stats.subscribers, sub: 'Subscribers', href: '/admin/newsletter' },
    { label: 'Total Orders', value: stats.orders, sub: 'Shop purchases', href: '/admin/shop' },
    { label: 'Blog Posts', value: stats.posts, sub: `${stats.published} published`, href: '/admin/blog' },
  ]

  const quickLinks = [
    { href: '/admin/blog/new', label: 'Write New Post' },
    { href: '/admin/inquiries', label: 'View Inquiries' },
    { href: '/admin/newsletter', label: 'Newsletter List' },
    { href: '/', label: 'View Public Site' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
          Dashboard
        </h1>
        <p className="text-[#5a6478] text-sm mt-1">Welcome back, Admin.</p>
      </div>

      {/* Football stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
        <Link
          href="/admin/analytics"
          className="bg-[#01255f] text-white p-4 sm:p-5 hover:bg-[#011840] transition-colors min-w-0"
        >
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-2">
            {stats.record ? `Season Record · ${stats.record.season}` : 'Season Record'}
          </p>
          <p className="text-2xl sm:text-3xl font-black leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
            {recordStr}
          </p>
          <p className="text-xs text-white/60 mt-1.5">View analytics →</p>
        </Link>
        <Link
          href="/admin/players"
          className="bg-white border border-gray-100 p-4 sm:p-5 hover:border-[#01255f]/30 transition-colors min-w-0"
        >
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-2">Squad Size</p>
          <p className="text-2xl sm:text-3xl font-black text-[#01255f] leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
            {stats.squadSize}
          </p>
          <p className="text-xs text-[#5a6478] mt-1.5">Registered players →</p>
        </Link>
      </div>

      {/* Engagement cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-10">
        {engagementCards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-white border border-gray-100 p-4 sm:p-6 hover:border-[#01255f]/30 transition-colors min-w-0"
          >
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-2">{c.label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
              {c.value}
            </p>
            <p className="text-xs text-[#5a6478] mt-1">{c.sub}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-gray-100 p-4 sm:p-6">
        <h2 className="text-sm font-bold text-[#01255f] uppercase tracking-widest mb-4">Quick Links</h2>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
          {quickLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[#01255f] border border-gray-200 px-4 py-2 hover:bg-[#f5f7fc] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
