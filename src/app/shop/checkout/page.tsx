'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCart } from '@/context/CartContext'

import { IMAGE_PLACEHOLDER } from '@/lib/constants'

const PLACEHOLDER = IMAGE_PLACEHOLDER

const inputClass = 'w-full border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-[#01255f] transition-colors'
const labelClass = 'block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5'

const CONTACT_METHODS = ['WhatsApp', 'Email', 'Direct Phone Call'] as const

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart()
  const hasMissingSize = items.some((item) => item.size === '')
  const [form, setForm] = useState({
    customerName: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    notes: '',
    contactMethods: [] as string[],
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const toggleContact = (method: string) => {
    setForm((f) => ({
      ...f,
      contactMethods: f.contactMethods.includes(method)
        ? f.contactMethods.filter((m) => m !== method)
        : [...f.contactMethods, method],
    }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (hasMissingSize) {
      setError('Please select a size for all apparel items before placing your order.')
      return
    }
    if (!form.customerName.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/shop/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items, total }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to place order')
      clearCart()
      setOrderId(data.orderId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Order confirmed
  if (orderId) {
    return (
      <>
        <Navbar />
        <main className="pt-16 lg:pt-[70px] min-h-screen bg-[#f5f7fc] flex items-center justify-center px-5">
          <div className="bg-white border border-gray-100 p-10 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-[#fee11b] flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-[#01255f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-[#01255f] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Order Placed!
            </h1>
            <p className="text-[#5a6478] text-sm mb-2">Thank you for your order. We&apos;ll be in touch shortly.</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-8">
              Order ID: <span className="text-[#01255f] font-bold">{orderId.slice(0, 8).toUpperCase()}</span>
            </p>
            <Link
              href="/shop"
              className="bg-[#01255f] hover:bg-[#011840] text-white text-sm font-bold px-8 py-3 inline-block transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="pt-16 lg:pt-[70px] min-h-screen bg-[#f5f7fc] flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-[#01255f] font-bold mb-2">Your cart is empty</p>
            <Link href="/shop" className="text-sm text-[#5a6478] hover:text-[#01255f] underline transition-colors">
              Back to shop
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-16 lg:pt-[70px] bg-[#f5f7fc] min-h-screen">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-10 py-14 sm:py-20">
          <div className="mb-8">
            <Link href="/shop" className="text-xs text-[#5a6478] hover:text-[#01255f] transition-colors uppercase tracking-widest">
              ← Back to shop
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-[#01255f] mt-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Checkout
            </h1>
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8">
            {/* Form */}
            <form onSubmit={submit} className="space-y-5 order-2 lg:order-1">
              <div className="bg-white border border-gray-100 p-6 space-y-5">
                <h2 className="text-sm font-bold text-[#01255f] uppercase tracking-widest">Contact Details</h2>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input type="text" value={form.customerName} onChange={set('customerName')} className={inputClass} placeholder="Your full name" required />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address *</label>
                    <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="you@email.com" required />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} placeholder="+231 XXX XXXX" />
                  </div>
                  <div>
                    <label className={labelClass}>WhatsApp Number</label>
                    <input type="tel" value={form.whatsapp} onChange={set('whatsapp')} className={inputClass} placeholder="+231 XXX XXXX" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Delivery Address</label>
                  <textarea value={form.address} onChange={set('address')} rows={2} className={`${inputClass} resize-none`} placeholder="Street address, city, country" />
                </div>

                {/* Best way to contact */}
                <div>
                  <label className={labelClass}>Best Way to Contact You</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CONTACT_METHODS.map((method) => {
                      const active = form.contactMethods.includes(method)
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => toggleContact(method)}
                          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border transition-all ${
                            active
                              ? 'bg-[#01255f] text-white border-[#01255f]'
                              : 'border-gray-200 text-[#5a6478] hover:border-[#01255f] hover:text-[#01255f]'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 border flex-shrink-0 flex items-center justify-center transition-colors ${active ? 'bg-[#fee11b] border-[#fee11b]' : 'border-gray-300'}`}>
                            {active && (
                              <svg className="w-2.5 h-2.5 text-[#01255f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          {method}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Order Notes (optional)</label>
                  <textarea value={form.notes} onChange={set('notes')} rows={2} className={`${inputClass} resize-none`} placeholder="Any special requests or additional notes" />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || hasMissingSize}
                className="w-full bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] font-black uppercase tracking-widest py-4 text-sm transition-colors disabled:opacity-50"
              >
                {hasMissingSize
                  ? 'Select All Sizes to Continue'
                  : submitting
                  ? 'Placing Order…'
                  : `Place Order — $${total.toFixed(2)}`}
              </button>
            </form>

            {/* Order Summary */}
            <div className="bg-white border border-gray-100 p-6 h-fit order-1 lg:order-2">
              <h2 className="text-sm font-bold text-[#01255f] uppercase tracking-widest mb-5">Order Summary</h2>
              <ul className="space-y-4 mb-5">
                {items.map((item, i) => (
                  <li key={`${item.id}-${item.size}-${i}`} className="flex gap-3">
                    <div className="relative w-14 h-14 flex-shrink-0 bg-[#f5f7fc] overflow-hidden">
                      <Image src={item.image || PLACEHOLDER} alt={item.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#01255f] line-clamp-2">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-[#5a6478]">Qty: {item.quantity}</p>
                        {item.size && item.size !== 'One Size' && (
                          <span className="text-[9px] font-bold bg-[#f5f7fc] border border-gray-200 px-1.5 py-0.5 text-[#01255f] uppercase">
                            {item.size}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-[#01255f] flex-shrink-0">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-xs text-[#5a6478]">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#5a6478]">
                  <span>Shipping</span>
                  <span className="text-[#01255f] font-bold">TBD</span>
                </div>
                <div className="flex justify-between font-black text-[#01255f] text-base pt-1 border-t border-gray-100" style={{ fontFamily: 'var(--font-heading)' }}>
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
