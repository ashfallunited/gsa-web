'use client'

import { useEffect, useState } from 'react'
import AdminLoadError from '@/components/AdminLoadError'
import { AdminFetchError, fetchAdminJson } from '@/lib/admin-fetch'

type Subscriber = {
  id: string
  email: string
  source?: string
  subscribedAt?: { seconds: number }
}

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAdminJson<{ subscribers: Subscriber[] }>('/api/admin/newsletter')
      .then((d) => {
        setSubscribers(d.subscribers ?? [])
        setError('')
      })
      .catch((e: unknown) => {
        setSubscribers([])
        setError(
          e instanceof AdminFetchError
            ? e.message
            : 'Failed to load subscribers. Please try again.'
        )
      })
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (ts?: { seconds: number }) => {
    if (!ts?.seconds) return '—'
    return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full min-w-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
          Newsletter
        </h1>
        <p className="text-[#5a6478] text-sm mt-1">{subscribers.length} subscribers</p>
      </div>

      {error && <AdminLoadError title="Could not load subscribers" message={error} />}

      {loading ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
      ) : !error && subscribers.length === 0 ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">
          No subscribers yet.
        </div>
      ) : !error ? (
        <div className="bg-white border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-[#5a6478]">Email</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-[#5a6478]">Source</th>
                <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-[#5a6478]">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-[#01255f]">{s.email}</td>
                  <td className="px-5 py-3 text-[#5a6478]">{s.source ?? 'website'}</td>
                  <td className="px-5 py-3 text-[#5a6478]">{formatDate(s.subscribedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
