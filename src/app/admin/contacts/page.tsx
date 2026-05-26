'use client'

import { useEffect, useState } from 'react'

type Contact = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  message: string
  read: boolean
  submittedAt: { seconds: number } | null
}

export default function AdminContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Contact | null>(null)

  useEffect(() => {
    fetch('/api/admin/contacts')
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts ?? []))
      .finally(() => setLoading(false))
  }, [])

  const markRead = async (id: string) => {
    await fetch('/api/admin/contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true }),
    })
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, read: true } : c)))
  }

  const openContact = (c: Contact) => {
    setSelected(c)
    if (!c.read) markRead(c.id)
  }

  const formatDate = (ts: Contact['submittedAt']) => {
    if (!ts) return '—'
    return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
            Enquiries
          </h1>
          <p className="text-[#5a6478] text-sm mt-1">
            {contacts.filter((c) => !c.read).length} unread of {contacts.length} total
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-[#5a6478] text-sm">
          Loading…
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-[#5a6478] text-sm">
          No enquiries yet.
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
          <div className="bg-white border border-gray-100 overflow-hidden">
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => openContact(c)}
                className={`w-full text-left px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-[#f5f7fc] transition-colors ${
                  selected?.id === c.id ? 'bg-[#f5f7fc]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm ${c.read ? 'font-medium text-[#5a6478]' : 'font-bold text-[#01255f]'}`}>
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-[#5a6478] truncate max-w-[180px]">{c.email}</p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] text-gray-400">{formatDate(c.submittedAt)}</span>
                    {!c.read && (
                      <span className="w-2 h-2 bg-[#fee11b] rounded-full" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1 truncate">{c.message}</p>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="bg-white border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="font-bold text-[#01255f] text-base">{selected.firstName} {selected.lastName}</h2>
                  <a href={`mailto:${selected.email}`} className="text-[#fee11b] text-sm hover:underline">{selected.email}</a>
                  {selected.phone && <p className="text-[#5a6478] text-xs mt-0.5">{selected.phone}</p>}
                </div>
                <span className="text-xs text-gray-400">{formatDate(selected.submittedAt)}</span>
              </div>
              <div className="border-t border-gray-100 pt-5">
                <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-3">Message</p>
                <p className="text-sm text-[#0d0d0d] leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </div>
              <div className="mt-5 pt-5 border-t border-gray-100">
                <a
                  href={`mailto:${selected.email}?subject=Re: Your Enquiry to Asfall United`}
                  className="inline-block bg-[#01255f] hover:bg-[#011840] text-white px-5 py-2.5 text-xs font-bold tracking-wide transition-colors"
                >
                  Reply via Email
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 p-10 text-center text-[#5a6478] text-sm">
              Select an enquiry to read.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
