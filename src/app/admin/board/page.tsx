'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import ImageUpload from '@/components/ImageUpload'

import { IMAGE_PLACEHOLDER } from '@/lib/constants'

const PLACEHOLDER = IMAGE_PLACEHOLDER

type Member = { id: string; name: string; role: string; image: string; order: number }
const empty: Omit<Member, 'id'> = { name: '', role: '', image: '', order: 99 }
const inputClass = 'w-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#01255f] transition-colors'
const labelClass = 'block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5'

function BoardForm({ initial, memberId, onSaved, onCancel }: {
  initial?: Partial<Omit<Member, 'id'>>
  memberId?: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [data, setData] = useState({ ...empty, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setData((d) => ({ ...d, [field]: e.target.value }))

  const save = async () => {
    if (!data.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      const res = memberId
        ? await fetch(`/api/admin/board/${memberId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        : await fetch('/api/admin/board', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, order: Number(data.order) }) })
      if (res.ok) { onSaved() } else { setError('Failed to save.') }
    } catch { setError('Network error.') } finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-gray-200 p-6 space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}
      <ImageUpload label="Photo" value={data.image} onChange={(url) => setData((d) => ({ ...d, image: url }))} bucket="team-images" folder="board" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Full Name</label>
          <input type="text" value={data.name} onChange={set('name')} className={inputClass} placeholder="Full name" />
        </div>
        <div>
          <label className={labelClass}>Display Order</label>
          <input type="number" value={data.order} onChange={(e) => setData((d) => ({ ...d, order: parseInt(e.target.value) || 99 }))} className={inputClass} min={1} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Role / Title</label>
        <input type="text" value={data.role} onChange={set('role')} className={inputClass} placeholder="e.g. Chairman" />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={save} disabled={saving} className="bg-[#01255f] hover:bg-[#011840] text-white px-6 py-2.5 text-sm font-bold tracking-wide transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : memberId ? 'Update' : 'Add'}
        </button>
        <button onClick={onCancel} disabled={saving} className="border border-gray-200 px-4 py-2.5 text-sm text-[#5a6478] hover:border-[#01255f] hover:text-[#01255f] transition-colors disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function AdminBoard() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)

  const load = () =>
    fetch('/api/admin/board')
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const del = async (id: string) => {
    if (!confirm('Remove this board member?')) return
    await fetch(`/api/admin/board/${id}`, { method: 'DELETE' })
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  const onSaved = () => { setAdding(false); setEditing(null); setLoading(true); load() }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full min-w-0">
      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>Board of Directors</h1>
          <p className="text-[#5a6478] text-sm mt-1">{members.length} members</p>
        </div>
        {!adding && !editing && (
          <button onClick={() => setAdding(true)} className="bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] px-5 py-2.5 text-sm font-bold tracking-wide transition-colors">
            + Add Member
          </button>
        )}
      </div>

      {(adding || editing) && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-[#01255f] uppercase tracking-widest mb-4">{editing ? 'Edit Member' : 'New Member'}</h2>
          <BoardForm initial={editing ?? undefined} memberId={editing?.id} onSaved={onSaved} onCancel={() => { setAdding(false); setEditing(null) }} />
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
      ) : members.length === 0 && !adding ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">
          No board members yet.{' '}
          <button onClick={() => setAdding(true)} className="text-[#01255f] underline">Add the first one.</button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 overflow-hidden">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-[#f5f7fc] transition-colors">
              <div className="flex-shrink-0 w-12 h-12 bg-gray-100 overflow-hidden">
                <Image src={m.image || PLACEHOLDER} alt={m.name} width={48} height={48} className="w-full h-full object-cover object-top" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#01255f] text-sm">{m.name}</p>
                <p className="text-[#5a6478] text-xs">{m.role}</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => { setEditing(m); setAdding(false) }} className="text-xs font-bold text-[#01255f] hover:underline">Edit</button>
                <button onClick={() => del(m.id)} className="text-xs font-bold text-red-400 hover:text-red-600">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
