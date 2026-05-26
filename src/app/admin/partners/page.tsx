'use client'

import { useEffect, useState } from 'react'
import ImageUpload from '@/components/ImageUpload'

type Partner = {
  id: string
  name: string
  logo: string
  url: string
  order: number
}

const inputClass = 'w-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#01255f] transition-colors'
const labelClass = 'block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5'

type FormState = { name: string; logo: string; url: string; order: number }
const emptyForm: FormState = { name: '', logo: '', url: '', order: 99 }

export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () =>
    fetch('/api/admin/partners')
      .then((r) => r.json())
      .then((d) => setPartners(d.partners ?? []))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const save = async () => {
    if (!form.name.trim()) { setError('Partner name is required.'); return }
    if (!form.logo.trim()) { setError('Logo is required.'); return }
    setSaving(true); setError('')
    try {
      const res = editingId
        ? await fetch(`/api/admin/partners/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch('/api/admin/partners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })

      if (res.ok) {
        setForm(emptyForm); setEditingId(null); setShowForm(false)
        setLoading(true); load()
      } else {
        setError('Failed to save.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Remove this partner?')) return
    await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' })
    setPartners((prev) => prev.filter((p) => p.id !== id))
  }

  const startEdit = (p: Partner) => {
    setForm({ name: p.name, logo: p.logo, url: p.url, order: p.order })
    setEditingId(p.id); setShowForm(true)
  }

  const cancel = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); setError('') }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
            Partners
          </h1>
          <p className="text-[#5a6478] text-sm mt-1">{partners.length} partners</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] px-5 py-2.5 text-sm font-bold tracking-wide transition-colors"
          >
            + Add Partner
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 p-6 mb-8 space-y-5">
          <h2 className="text-sm font-bold text-[#01255f] uppercase tracking-widest">
            {editingId ? 'Edit Partner' : 'New Partner'}
          </h2>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

          <ImageUpload
            label="Partner Logo"
            value={form.logo}
            onChange={(url) => setForm((f) => ({ ...f, logo: url }))}
            bucket="blog-images"
            folder="partners"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Partner Name</label>
              <input type="text" value={form.name} onChange={set('name')} className={inputClass} placeholder="e.g. UNICEF" />
            </div>
            <div>
              <label className={labelClass}>Display Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 99 }))}
                className={inputClass}
                min={1}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Website URL <span className="font-normal normal-case text-gray-400">(optional)</span></label>
            <input type="url" value={form.url} onChange={set('url')} className={inputClass} placeholder="https://example.org" />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="bg-[#01255f] hover:bg-[#011840] text-white px-6 py-2.5 text-sm font-bold tracking-wide transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : editingId ? 'Update' : 'Add Partner'}
            </button>
            <button
              onClick={cancel}
              disabled={saving}
              className="border border-gray-200 px-4 py-2.5 text-sm text-[#5a6478] hover:border-[#01255f] hover:text-[#01255f] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
      ) : partners.length === 0 && !showForm ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">
          No partners yet.{' '}
          <button onClick={() => setShowForm(true)} className="text-[#01255f] underline">Add the first one.</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {partners.map((p) => (
            <div key={p.id} className="bg-white border border-gray-100 p-4 flex flex-col gap-3 hover:border-[#01255f]/20 transition-colors">
              <div className="h-16 flex items-center justify-center bg-gray-50 px-4">
                <img src={p.logo} alt={p.name} className="max-h-12 max-w-full w-auto object-contain" />
              </div>
              <div>
                <p className="font-bold text-[#01255f] text-sm truncate">{p.name}</p>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#5a6478] hover:underline truncate block">
                    {p.url}
                  </a>
                )}
                <p className="text-[10px] text-gray-400">Order: {p.order}</p>
              </div>
              <div className="flex gap-3 mt-auto">
                <button onClick={() => startEdit(p)} className="text-xs font-bold text-[#01255f] hover:underline">Edit</button>
                <button onClick={() => del(p.id)} className="text-xs font-bold text-red-400 hover:text-red-600">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
