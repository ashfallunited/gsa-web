'use client'

import { useEffect, useState } from 'react'
import AdminLoadError from '@/components/AdminLoadError'
import { SkeletonTableRow } from '@/components/admin/skeleton'
import { fetchAdminJson } from '@/lib/admin-fetch'
import type { AuditLogEntry } from '@/lib/analytics/types'

function formatTime(ts?: AuditLogEntry['createdAt']): string {
  if (!ts?.seconds) return '—'
  return new Date(ts.seconds * 1000).toLocaleString()
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchAdminJson<{ logs: AuditLogEntry[] }>('/api/admin/analytics/audit?limit=200')
      setLogs(res.logs)
    } catch {
      setError('Failed to load audit log.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="p-5 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
          Audit Log
        </h1>
        <p className="text-sm text-[#5a6478] mt-1">Track of all analytics data changes.</p>
      </div>

      {error && <AdminLoadError message={error} />}

      <div className="bg-white border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-[#5a6478] border-b bg-gray-50">
              <th className="p-3">Time</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Summary</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} cols={4} />)}
            {!loading && logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-50">
                <td className="p-3 whitespace-nowrap text-[#5a6478]">{formatTime(log.createdAt)}</td>
                <td className="p-3">
                  <span className="font-medium text-[#01255f]">{log.actor}</span>
                  <span className="text-[10px] text-[#5a6478] ml-1 uppercase">({log.actorRole.replace('_', ' ')})</span>
                </td>
                <td className="p-3">
                  <span className="text-[10px] font-bold uppercase bg-gray-100 px-2 py-0.5">{log.action}</span>
                </td>
                <td className="p-3 text-[#01255f]">{log.summary}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-[#5a6478]">No audit entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
