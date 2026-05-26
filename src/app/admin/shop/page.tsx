'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import ImageUpload from '@/components/ImageUpload'

import { IMAGE_PLACEHOLDER } from '@/lib/constants'

const PLACEHOLDER = IMAGE_PLACEHOLDER

type Product = { id: string; name: string; price: number; image: string; description: string; category: string; available: boolean; order: number; sizes?: string[] }
type Order = {
  id: string
  customerName: string
  email: string
  phone: string
  whatsapp: string
  address: string
  notes: string
  contactMethods: string[]
  total: number
  status: string
  items: { name: string; quantity: number; price: number; size?: string }[]
  createdAt: { seconds: number } | null
}

const empty: Omit<Product, 'id'> = { name: '', price: 0, image: '', description: '', category: 'Jersey', available: true, order: 99, sizes: [] }
const inputClass = 'w-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#01255f] transition-colors'
const labelClass = 'block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

function ProductForm({ initial, productId, onSaved, onCancel }: {
  initial?: Partial<Omit<Product, 'id'>>
  productId?: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [data, setData] = useState({ ...empty, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setData((d) => ({ ...d, [field]: e.target.value }))

  const save = async () => {
    if (!data.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...data, price: parseFloat(String(data.price)) || 0, order: Number(data.order) }
      const res = productId
        ? await fetch(`/api/admin/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) { onSaved() } else { setError('Failed to save.') }
    } catch { setError('Network error.') } finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-gray-200 p-6 space-y-5">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}
      <ImageUpload label="Product Image" value={data.image} onChange={(url) => setData((d) => ({ ...d, image: url }))} bucket="website_files" folder="products" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Product Name</label>
          <input type="text" value={data.name} onChange={set('name')} className={inputClass} placeholder="e.g. Home Jersey 2024" />
        </div>
        <div>
          <label className={labelClass}>Price (USD)</label>
          <input type="number" value={data.price} onChange={set('price')} className={inputClass} min={0} step="0.01" placeholder="0.00" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Category</label>
          <select value={data.category} onChange={set('category')} className={inputClass}>
            {['Jersey', 'Training Kit', 'Accessories', 'Footwear', 'Other'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Display Order</label>
          <input type="number" value={data.order} onChange={set('order')} className={inputClass} min={1} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea value={data.description} onChange={set('description')} rows={2} className={`${inputClass} resize-none`} placeholder="Brief product description" />
      </div>
      <div>
        <label className={labelClass}>Available Sizes</label>
        <div className="flex flex-wrap gap-2">
          {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
            <label key={size} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(data.sizes || []).includes(size)}
                onChange={(e) => {
                  const sizes = data.sizes || []
                  if (e.target.checked) {
                    setData((d) => ({ ...d, sizes: [...sizes, size] }))
                  } else {
                    setData((d) => ({ ...d, sizes: sizes.filter((s) => s !== size) }))
                  }
                }}
                className="w-4 h-4 accent-[#01255f]"
              />
              <span className="text-sm text-[#5a6478]">{size}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="available"
          checked={data.available}
          onChange={(e) => setData((d) => ({ ...d, available: e.target.checked }))}
          className="w-4 h-4 accent-[#01255f]"
        />
        <label htmlFor="available" className="text-sm text-[#5a6478]">Available for purchase</label>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={save} disabled={saving} className="bg-[#01255f] hover:bg-[#011840] text-white px-6 py-2.5 text-sm font-bold tracking-wide transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : productId ? 'Update' : 'Add Product'}
        </button>
        <button onClick={onCancel} disabled={saving} className="border border-gray-200 px-4 py-2.5 text-sm text-[#5a6478] hover:border-[#01255f] hover:text-[#01255f] transition-colors disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function AdminShop() {
  const [tab, setTab] = useState<'products' | 'orders'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const loadProducts = () =>
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoadingProducts(false))

  const loadOrders = () => {
    setLoadingOrders(true)
    fetch('/api/admin/orders')
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoadingOrders(false))
  }

  useEffect(() => { loadProducts() }, [])
  useEffect(() => { if (tab === 'orders') loadOrders() }, [tab])

  const delProduct = async (id: string) => {
    if (!confirm('Remove this product?')) return
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const updateOrderStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
  }

  const onSaved = () => { setAdding(false); setEditing(null); setLoadingProducts(true); loadProducts() }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>Shop</h1>
          <p className="text-[#5a6478] text-sm mt-1">Manage products and orders</p>
        </div>
        {tab === 'products' && !adding && !editing && (
          <button onClick={() => setAdding(true)} className="bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] px-5 py-2.5 text-sm font-bold tracking-wide transition-colors">
            + Add Product
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-gray-200">
        {(['products', 'orders'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setAdding(false); setEditing(null) }}
            className={`px-5 py-2.5 text-sm font-bold capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-[#01255f] text-[#01255f]' : 'border-transparent text-[#5a6478] hover:text-[#01255f]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Products tab */}
      {tab === 'products' && (
        <>
          {(adding || editing) && (
            <div className="mb-8">
              <h2 className="text-sm font-bold text-[#01255f] uppercase tracking-widest mb-4">{editing ? 'Edit Product' : 'New Product'}</h2>
              <ProductForm initial={editing ?? undefined} productId={editing?.id} onSaved={onSaved} onCancel={() => { setAdding(false); setEditing(null) }} />
            </div>
          )}

          {loadingProducts ? (
            <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
          ) : products.length === 0 && !adding ? (
            <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">
              No products yet.{' '}<button onClick={() => setAdding(true)} className="text-[#01255f] underline">Add the first one.</button>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 overflow-hidden">
              {products.map((p) => (
                <div key={p.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-[#f5f7fc] transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 overflow-hidden">
                    <Image src={p.image || PLACEHOLDER} alt={p.name} width={48} height={48} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#01255f] text-sm">{p.name}</p>
                    <p className="text-[#5a6478] text-xs">{p.category} · ${p.price.toFixed(2)}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 ${p.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.available ? 'Available' : 'Sold Out'}
                  </span>
                  <div className="flex gap-3 flex-shrink-0">
                    <button onClick={() => { setEditing(p); setAdding(false) }} className="text-xs font-bold text-[#01255f] hover:underline">Edit</button>
                    <button onClick={() => delProduct(p.id)} className="text-xs font-bold text-red-400 hover:text-red-600">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Orders tab */}
      {tab === 'orders' && (
        <>
          {loadingOrders ? (
            <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">No orders yet.</div>
          ) : (
            <div className="bg-white border border-gray-100 overflow-hidden">
              {orders.map((o) => (
                <div key={o.id} className="border-b border-gray-50 last:border-0">
                  <div
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[#f5f7fc] transition-colors cursor-pointer"
                    onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#01255f] text-sm">{o.customerName}</p>
                      <p className="text-[#5a6478] text-xs">{o.email} · {o.items?.length ?? 0} items · ${o.total?.toFixed(2)}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 capitalize ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {o.status}
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expandedOrder === o.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {expandedOrder === o.id && (
                    <div className="px-6 pb-5 bg-[#f5f7fc] border-t border-gray-100 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3 pt-3 text-xs text-[#5a6478]">
                        <div><span className="font-bold text-[#01255f]">Phone:</span> {o.phone || '—'}</div>
                        <div><span className="font-bold text-[#01255f]">WhatsApp:</span> {o.whatsapp || '—'}</div>
                        <div><span className="font-bold text-[#01255f]">Address:</span> {o.address || '—'}</div>
                        <div><span className="font-bold text-[#01255f]">Preferred Contact:</span> {o.contactMethods?.length ? o.contactMethods.join(', ') : '—'}</div>
                      </div>
                      {o.notes && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-2">Notes</p>
                          <p className="text-xs text-[#01255f] leading-relaxed">{o.notes}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-2">Items</p>
                        {o.items?.map((item, i) => (
                            <p key={i} className="text-xs text-[#01255f]">
                              {item.name} × {item.quantity}
                              {item.size ? ` (${item.size})` : ''}
                              {' '}— ${(item.price * item.quantity).toFixed(2)}
                            </p>
                        ))}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-2">Update Status</p>
                        <div className="flex flex-wrap gap-2">
                          {['pending', 'processing', 'completed', 'cancelled'].map((s) => (
                            <button
                              key={s}
                              onClick={() => updateOrderStatus(o.id, s)}
                              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${o.status === s ? 'bg-[#01255f] text-white' : 'border border-gray-200 text-[#5a6478] hover:border-[#01255f]'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
