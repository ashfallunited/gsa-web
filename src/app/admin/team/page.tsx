'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import MemberEditor, { MemberData } from '@/components/MemberEditor'

type Member = MemberData & { id: string }

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22%3E%3C/svg%3E'

export default function AdminTeam() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)

  const load = () =>
    fetch('/api/admin/team')
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const del = async (id: string) => {
    if (!confirm('Remove this team member?')) return
    await fetch(`/api/admin/team/${id}`, { method: 'DELETE' })
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  const onSaved = () => { setAdding(false); setEditing(null); setLoading(true); load() }

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
            Management Staff
          </h1>
          <p className="text-[#5a6478] text-sm mt-1">{members.length} members</p>
        </div>
        {!adding && !editing && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] px-5 py-2.5 text-sm font-bold transition-colors"
          >
            <Plus size={16} />
            Add Member
          </button>
        )}
      </div>

      {(adding || editing) && (
        <div className="mb-8 max-w-2xl">
          <h2 className="text-sm font-bold text-[#01255f] uppercase tracking-widest mb-4">
            {editing ? 'Edit Member' : 'New Member'}
          </h2>
          <MemberEditor
            type="team"
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

      {!loading && members.length === 0 && !adding && (
        <div className="bg-white border border-dashed border-gray-300 p-12 text-center">
          <p className="text-[#01255f] font-bold mb-2">No team members yet</p>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 bg-[#fee11b] text-[#01255f] px-5 py-2 text-sm font-bold">
            <Plus size={14} />
            Add first member
          </button>
        </div>
      )}

      {!loading && members.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {members.map((m) => (
            <div key={m.id} className="group bg-white border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              {/* Photo */}
              <div className="relative h-44 sm:h-52 bg-[#f5f7fc] overflow-hidden shrink-0">
                {m.image ? (
                  <img
                    src={m.image}
                    alt={m.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#01255f]/5">
                    <span className="text-6xl font-black text-[#01255f]/15" style={{ fontFamily: 'var(--font-heading)' }}>
                      {m.name.charAt(0)}
                    </span>
                  </div>
                )}
                {/* Section badge top-right */}
                <span
                  className={`absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 ${
                    m.section === 'board' ? 'bg-[#01255f] text-[#fee11b]' : 'bg-white/90 text-[#01255f]'
                  }`}
                >
                  {m.section === 'board' ? 'Board' : 'Staff'}
                </span>
              </div>

              {/* Info */}
              <div className="p-3 sm:p-4 flex-1">
                <p className="font-black text-[#01255f] text-sm leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                  {m.name}
                </p>
                <p className="text-[#5a6478] text-xs mt-0.5 line-clamp-2">{m.role}</p>
              </div>

              {/* Actions */}
              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => { setEditing(m); setAdding(false) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-[#01255f] hover:bg-[#01255f] hover:text-white transition-colors"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <div className="w-px bg-gray-100" />
                <button
                  onClick={() => del(m.id)}
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
