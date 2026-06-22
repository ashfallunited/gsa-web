'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Donation {
  id: string
  firstName: string
  lastName: string
  email: string
  country: string
  amountUsd: number
  paymentMethod: string
  status: string
  createdAt: string
}

interface ListResponse {
  data: Donation[]
  total: number
  limit: number
  offset: number
}

export default function DonationsAdminPage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  useEffect(() => {
    const fetchDonations = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (status) params.append('status', status)
        if (paymentMethod) params.append('paymentMethod', paymentMethod)

        const response = await fetch(`/api/admin/donations?${params.toString()}`)
        const data: ListResponse = await response.json()
        setDonations(data.data)
        setTotal(data.total)
      } catch (error) {
        console.error('Failed to fetch donations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDonations()
  }, [status, paymentMethod])

  const handleExport = async () => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (paymentMethod) params.append('paymentMethod', paymentMethod)

    window.location.href = `/api/admin/donations/export?${params.toString()}`
  }

  return (
    <div className="space-y-8 p-6 sm:p-10">
      <div>
        <h1 className="text-3xl font-bold text-[#01255f] mb-2">Donations</h1>
        <p className="text-[#5a6478]">Manage donor records and donations</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 p-6 space-y-4">
        <h2 className="font-bold text-[#01255f]">Filters</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-[#5a6478] mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-200 px-4 py-2 text-sm rounded"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#5a6478] mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-200 px-4 py-2 text-sm rounded"
            >
              <option value="">All methods</option>
              <option value="card">Card</option>
              <option value="mobile">Mobile Money</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="bg-[#01255f] text-white px-4 py-2 text-sm font-bold rounded hover:bg-[#011840]"
        >
          Export to CSV
        </button>
      </div>

      {/* Donations Table */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f5f7fc] border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-bold text-[#5a6478] uppercase">Donor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#5a6478] uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#5a6478] uppercase">Country</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#5a6478] uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#5a6478] uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#5a6478] uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#5a6478] uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#5a6478] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#5a6478]">
                    Loading donations...
                  </td>
                </tr>
              ) : donations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#5a6478]">
                    No donations found
                  </td>
                </tr>
              ) : (
                donations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-[#f5f7fc]">
                    <td className="px-6 py-4 text-sm text-[#01255f] font-medium">
                      {donation.firstName} {donation.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#5a6478]">{donation.email}</td>
                    <td className="px-6 py-4 text-sm text-[#5a6478]">{donation.country}</td>
                    <td className="px-6 py-4 text-sm text-[#01255f] font-bold">
                      ${donation.amountUsd.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#5a6478] capitalize">{donation.paymentMethod}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded text-xs font-bold uppercase ${
                          donation.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : donation.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : donation.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {donation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#5a6478]">
                      {new Date(donation.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/admin/donations/${donation.id}`}
                        className="text-[#01255f] hover:underline font-bold"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-[#5a6478]">
        Showing {donations.length} of {total} donations
      </div>
    </div>
  )
}
