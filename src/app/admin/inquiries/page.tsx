'use client'

import { useEffect, useState } from 'react'
import { formatInquiryMultiValue } from '@/lib/inquiry-options'

type Inquiry = {
  id: string
  inquiryType: 'volunteer' | 'partnership'
  firstName: string
  lastName: string
  email: string
  phone?: string
  organization?: string
  message: string
  availability?: string | string[]
  skills?: string | string[]
  partnershipType?: string
  read?: boolean
  submittedAt?: { seconds: number }
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'volunteer' | 'partnership'>('all')

  const load = () =>
    fetch('/api/admin/inquiries')
      .then((r) => r.json())
      .then((d) => setInquiries(d.inquiries ?? []))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const markRead = async (id: string) => {
    await fetch('/api/admin/inquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true }),
    })
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)))
  }

  const formatDate = (ts?: { seconds: number }) => {
    if (!ts?.seconds) return '—'
    return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const filtered =
    filter === 'all' ? inquiries : inquiries.filter((i) => i.inquiryType === filter)

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
            Inquiries
          </h1>
          <p className="text-[#5a6478] text-sm mt-1">Volunteer and partnership submissions</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'volunteer', 'partnership'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors ${
                filter === f
                  ? 'bg-[#01255f] text-white border-[#01255f]'
                  : 'bg-white text-[#5a6478] border-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">No inquiries yet.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((inq) => (
            <div
              key={inq.id}
              className={`bg-white border p-6 ${inq.read ? 'border-gray-100' : 'border-[#fee11b] border-l-4'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <span className="text-[9px] uppercase tracking-widest font-bold text-[#fee11b] bg-[#01255f] px-2 py-0.5">
                    {inq.inquiryType}
                  </span>
                  <h2 className="font-bold text-[#01255f] mt-2">
                    {inq.firstName} {inq.lastName}
                  </h2>
                  <p className="text-sm text-[#5a6478]">
                    <a href={`mailto:${inq.email}`} className="hover:underline">
                      {inq.email}
                    </a>
                    {inq.phone ? ` · ${inq.phone}` : ''}
                  </p>
                </div>
                <p className="text-xs text-gray-400">{formatDate(inq.submittedAt)}</p>
              </div>

              {inq.organization && (
                <p className="text-sm text-[#5a6478] mb-2">
                  <span className="font-bold">Organisation:</span> {inq.organization}
                </p>
              )}
              {inq.partnershipType && (
                <p className="text-sm text-[#5a6478] mb-2">
                  <span className="font-bold">Type:</span> {inq.partnershipType}
                </p>
              )}
              {formatInquiryMultiValue(inq.availability) && (
                <p className="text-sm text-[#5a6478] mb-2">
                  <span className="font-bold">Availability:</span> {formatInquiryMultiValue(inq.availability)}
                </p>
              )}
              {formatInquiryMultiValue(inq.skills) && (
                <p className="text-sm text-[#5a6478] mb-2">
                  <span className="font-bold">Skills & interests:</span> {formatInquiryMultiValue(inq.skills)}
                </p>
              )}

              <p className="text-sm text-[#0d0d0d] leading-relaxed whitespace-pre-wrap">{inq.message}</p>

              {!inq.read && (
                <button
                  type="button"
                  onClick={() => markRead(inq.id)}
                  className="mt-4 text-xs font-bold text-[#01255f] underline"
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
