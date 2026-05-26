'use client'

import { useEffect, useState } from 'react'
import MemberEditor, { AmbassadorData } from '@/components/MemberEditor'
import Image from 'next/image'

type Ambassador = AmbassadorData & { id: string }

export default function AdminAmbassadors() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Ambassador | null>(null)

  const load = () =>
    fetch('/api/admin/ambassadors')
      .then((r) => r.json())
      .then((d) => setAmbassadors(d.ambassadors ?? []))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const del = async (id: string) => {
    if (!confirm('Remove this ambassador?')) return
    await fetch(`/api/admin/ambassadors/${id}`, { method: 'DELETE' })
    setAmbassadors((prev) => prev.filter((a) => a.id !== id))
  }

  const onSaved = () => {
    setAdding(false)
    setEditing(null)
    setLoading(true)
    load()
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
            Ambassadors
          </h1>
          <p className="text-[#5a6478] text-sm mt-1">{ambassadors.length} ambassadors</p>
        </div>
        {!adding && !editing && (
          <button
            onClick={() => setAdding(true)}
            className="bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] px-5 py-2.5 text-sm font-bold tracking-wide transition-colors"
          >
            + Add Ambassador
          </button>
        )}
      </div>

      {(adding || editing) && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-[#01255f] uppercase tracking-widest mb-4">
            {editing ? 'Edit Ambassador' : 'New Ambassador'}
          </h2>
          <MemberEditor
            type="ambassador"
            initialData={editing ?? undefined}
            memberId={editing?.id}
            onSaved={onSaved}
            onCancel={() => { setAdding(false); setEditing(null) }}
          />
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
      ) : ambassadors.length === 0 && !adding ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">
          No ambassadors yet.{' '}
          <button onClick={() => setAdding(true)} className="text-[#01255f] underline">Add the first one.</button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 overflow-hidden">
          {ambassadors.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-[#f5f7fc] transition-colors"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-gray-100 overflow-hidden">
                {a.image ? (
                  <Image src={a.image} alt={a.name} width={48} height={48} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg font-bold">
                    {a.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#01255f] text-sm">{a.name}</p>
                <p className="text-[#5a6478] text-xs">{a.title}{a.sport ? ` · ${a.sport}` : ''}</p>
              </div>
              <div className="flex-shrink-0 text-[10px] text-gray-400 mr-4">Order: {a.order}</div>
              <div className="flex gap-3 flex-shrink-0">
                <button
                  onClick={() => { setEditing(a); setAdding(false) }}
                  className="text-xs font-bold text-[#01255f] hover:underline"
                >
                  Edit
                </button>
                <button onClick={() => del(a.id)} className="text-xs font-bold text-red-400 hover:text-red-600">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
