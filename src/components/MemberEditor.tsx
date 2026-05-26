'use client'

import { useState } from 'react'
import ImageUpload from '@/components/ImageUpload'

export type MemberData = {
  name: string
  role: string
  image: string
  order: number
  section: 'board' | 'staff'
}

export type AmbassadorData = {
  name: string
  title: string
  sport: string
  bio: string
  image: string
  order: number
}

type TeamProps = {
  type: 'team'
  initialData?: Partial<MemberData>
  memberId?: string
}

type AmbassadorProps = {
  type: 'ambassador'
  initialData?: Partial<AmbassadorData>
  memberId?: string
}

type Props = (TeamProps | AmbassadorProps) & { onSaved: () => void; onCancel: () => void }

const emptyTeam: MemberData = { name: '', role: '', image: '', order: 99, section: 'staff' }
const emptyAmbassador: AmbassadorData = { name: '', title: '', sport: '', bio: '', image: '', order: 99 }

const inputClass = 'w-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#01255f] transition-colors'
const labelClass = 'block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5'

export default function MemberEditor(props: Props) {
  const isTeam = props.type === 'team'
  const [data, setData] = useState(
    isTeam
      ? { ...emptyTeam, ...(props as TeamProps).initialData }
      : { ...emptyAmbassador, ...(props as AmbassadorProps).initialData }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setData((d) => ({ ...d, [field]: e.target.value }))

  const save = async () => {
    if (!(data as MemberData).name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const endpoint = isTeam ? '/api/admin/team' : '/api/admin/ambassadors'
      const res = props.memberId
        ? await fetch(`${endpoint}/${props.memberId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
        : await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

      if (res.ok) {
        props.onSaved()
      } else {
        setError('Failed to save. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      <ImageUpload
        label="Photo"
        value={(data as MemberData).image}
        onChange={(url) => setData((d) => ({ ...d, image: url }))}
        bucket="team-images"
        folder={isTeam ? 'team' : 'ambassadors'}
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Name</label>
          <input type="text" value={(data as MemberData).name} onChange={set('name')} className={inputClass} placeholder="Full name" />
        </div>
        <div>
          <label className={labelClass}>Display Order</label>
          <input
            type="number"
            value={(data as MemberData).order}
            onChange={(e) => setData((d) => ({ ...d, order: parseInt(e.target.value) || 99 }))}
            className={inputClass}
            min={1}
          />
        </div>
      </div>

      {isTeam ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Role / Title</label>
            <input type="text" value={(data as MemberData).role} onChange={set('role')} className={inputClass} placeholder="e.g. Head Coach" />
          </div>
          <div>
            <label className={labelClass}>Section</label>
            <select
              value={(data as MemberData).section}
              onChange={(e) => setData((d) => ({ ...d, section: e.target.value as 'board' | 'staff' }))}
              className={inputClass}
            >
              <option value="staff">Staff</option>
              <option value="board">Board</option>
            </select>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Title / Position</label>
              <input type="text" value={(data as AmbassadorData).title} onChange={set('title')} className={inputClass} placeholder="e.g. Professional Footballer" />
            </div>
            <div>
              <label className={labelClass}>Sport</label>
              <input type="text" value={(data as AmbassadorData).sport} onChange={set('sport')} className={inputClass} placeholder="e.g. Football" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              value={(data as AmbassadorData).bio}
              onChange={set('bio')}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Short biography…"
            />
          </div>
        </>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="bg-[#01255f] hover:bg-[#011840] text-white px-6 py-2.5 text-sm font-bold tracking-wide transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : props.memberId ? 'Update' : 'Add'}
        </button>
        <button
          onClick={props.onCancel}
          disabled={saving}
          className="border border-gray-200 px-4 py-2.5 text-sm text-[#5a6478] hover:border-[#01255f] hover:text-[#01255f] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
