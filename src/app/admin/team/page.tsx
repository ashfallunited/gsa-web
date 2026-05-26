'use client'

import { useEffect, useState } from 'react'
import MemberEditor, { MemberData } from '@/components/MemberEditor'
import Image from 'next/image'

type Member = MemberData & { id: string }

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
            Management Members
          </h1>
          <p className="text-[#5a6478] text-sm mt-1">{members.length} members</p>
        </div>
        {!adding && !editing && (
          <button
            onClick={() => setAdding(true)}
            className="bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] px-5 py-2.5 text-sm font-bold tracking-wide transition-colors"
          >
            + Add Member
          </button>
        )}
      </div>

      {(adding || editing) && (
        <div className="mb-8">
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

      {loading ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
      ) : members.length === 0 && !adding ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">
          No team members yet.{' '}
          <button onClick={() => setAdding(true)} className="text-[#01255f] underline">Add the first one.</button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 overflow-hidden">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-[#f5f7fc] transition-colors"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-gray-100 overflow-hidden">
                {m.image ? (
                  <Image src={m.image} alt={m.name} width={48} height={48} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg font-bold">
                    {m.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#01255f] text-sm">{m.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[#5a6478] text-xs">{m.role}</p>
                  <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 ${m.section === 'board' ? 'bg-[#01255f] text-white' : 'bg-[#f5f7fc] text-[#5a6478] border border-gray-200'}`}>
                    {m.section === 'board' ? 'Board' : 'Staff'}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 text-[10px] text-gray-400 mr-4">Order: {m.order}</div>
              <div className="flex gap-3 flex-shrink-0">
                <button
                  onClick={() => { setEditing(m); setAdding(false) }}
                  className="text-xs font-bold text-[#01255f] hover:underline"
                >
                  Edit
                </button>
                <button onClick={() => del(m.id)} className="text-xs font-bold text-red-400 hover:text-red-600">
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
