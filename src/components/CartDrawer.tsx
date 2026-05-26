'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'

import { IMAGE_PLACEHOLDER } from '@/lib/constants'

const PLACEHOLDER = IMAGE_PLACEHOLDER
const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function CartDrawer() {
  const { items, removeItem, updateQuantity, updateSize, total, count, isOpen, setIsOpen } = useCart()
  const hasMissingSize = items.some((item) => item.size === '')

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-[#01255f]">
          <div>
            <h2 className="text-white font-bold text-base" style={{ fontFamily: 'var(--font-heading)' }}>
              Your Cart
            </h2>
            <p className="text-white/60 text-xs mt-0.5">{count} {count === 1 ? 'item' : 'items'}</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white p-1 transition-colors" aria-label="Close cart">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 bg-[#f5f7fc] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-[#01255f] font-bold text-sm mb-1">Your cart is empty</p>
              <p className="text-[#5a6478] text-xs mb-4">Add some items to get started</p>
              <Link
                href="/shop"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] text-xs font-black uppercase tracking-widest px-5 py-2.5 transition-colors"
              >
                Shop Now
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {items.map((item) => {
                const needsSize = item.size === ''
                return (
                  <li key={`${item.id}-${item.size}`} className="flex gap-4 px-6 py-4">
                    <div className="relative w-16 h-16 flex-shrink-0 bg-[#f5f7fc] overflow-hidden">
                      <Image
                        src={item.image || PLACEHOLDER}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#01255f] text-sm leading-tight line-clamp-2">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[#fee11b] font-black text-sm">${item.price.toFixed(2)}</p>
                        {item.size && item.size !== 'One Size' && (
                          <span className="text-[9px] font-bold bg-[#f5f7fc] border border-gray-200 px-1.5 py-0.5 text-[#01255f] uppercase">
                            {item.size}
                          </span>
                        )}
                      </div>

                      {/* Size selector for clothing items without size selected */}
                      {needsSize && (
                        <div className="mt-2 mb-2">
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                updateSize(item.id, item.size, e.target.value)
                              }
                            }}
                            className="w-28 border border-gray-300 bg-white text-[#01255f] text-xs px-2 py-1.5 focus:outline-none focus:border-[#01255f]"
                          >
                            <option value="">Select Size</option>
                            {CLOTHING_SIZES.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border border-gray-200">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1), item.size)}
                            className="w-7 h-7 flex items-center justify-center text-[#01255f] hover:bg-[#f5f7fc] transition-colors text-sm font-bold"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-[#01255f]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                            className="w-7 h-7 flex items-center justify-center text-[#01255f] hover:bg-[#f5f7fc] transition-colors text-sm font-bold"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.id, item.size)}
                          className="text-[10px] text-gray-400 hover:text-red-400 transition-colors uppercase tracking-wider"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[#5a6478] text-sm">Subtotal</span>
              <span className="font-black text-[#01255f] text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                ${total.toFixed(2)}
              </span>
            </div>
            {hasMissingSize && (
              <p className="text-[11px] text-red-600 font-semibold">
                Select a size for all apparel items before checkout.
              </p>
            )}
            <Link
              href={hasMissingSize ? '#' : '/shop/checkout'}
              aria-disabled={hasMissingSize}
              onClick={(e) => {
                if (hasMissingSize) {
                  e.preventDefault()
                  return
                }
                setIsOpen(false)
              }}
              className={`block w-full text-sm font-black uppercase tracking-widest py-3.5 text-center transition-colors ${
                hasMissingSize
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed pointer-events-none'
                  : 'bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f]'
              }`}
            >
              Checkout
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="block w-full text-center text-xs text-[#5a6478] hover:text-[#01255f] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}
