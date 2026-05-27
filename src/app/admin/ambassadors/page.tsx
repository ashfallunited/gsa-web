'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import MemberEditor, { AmbassadorData } from '@/components/MemberEditor'

type Ambassador = AmbassadorData & { id: string }

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22%3E%3C/svg%3E'

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

  const onSaved = () => { setAdding(false); setEditing(null); setLoading(true); load() }

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
            Ambassadors
          </h1>
          <p className="text-[#5a6478] text-sm mt-1">{ambassadors.length} ambassadors</p>
        </div>
        {!adding && !editing && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] px-5 py-2.5 text-sm font-bold transition-colors"
          >
            <Plus size={16} />
            Add Ambassador
          </button>
        )}
      </div>

      {(adding || editing) && (
        <div className="mb-8 max-w-2xl">
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

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 overflow-hidden animate-pulse">
              <div className="h-44 sm:h-52 bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && ambassadors.length === 0 && !adding && (
        <div className="bg-white border border-dashed border-gray-300 p-12 text-center">
          <p className="text-[#01255f] font-bold mb-2">No ambassadors yet</p>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 bg-[#fee11b] text-[#01255f] px-5 py-2 text-sm font-bold">
            <Plus size={14} />
            Add first ambassador
          </button>
        </div>
      )}

      {!loading && ambassadors.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {ambassadors.map((a) => (
            <div key={a.id} className="group bg-white border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              {/* Photo */}
              <div className="relative h-44 sm:h-52 bg-[#f5f7fc] overflow-hidden shrink-0">
                {a.image ? (
                  <img
                    src={a.image}
                    alt={a.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl font-black text-[#01255f]/10" style={{ fontFamily: 'var(--font-heading)' }}>
                      {a.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#01255f]/60 via-transparent to-transparent" />
              </div>

              {/* Info */}
              <div className="p-3 sm:p-4 flex-1">
                <p className="font-black text-[#01255f] text-sm leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                  {a.name}
                </p>
                <p className="text-[#5a6478] text-xs mt-0.5 line-clamp-1">{a.title}</p>
                {a.sport && (
                  <span className="mt-1.5 inline-block text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-[#fee11b] text-[#01255f]">
                    {a.sport}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => { setEditing(a); setAdding(false) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-[#01255f] hover:bg-[#01255f] hover:text-white transition-colors"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <div className="w-px bg-gray-100" />
                <button
                  onClick={() => del(a.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-red-400 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} />
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
