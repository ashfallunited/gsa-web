'use client'

import { useCart } from '@/context/CartContext'

export default function CartButton() {
  const { count, setIsOpen } = useCart()

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 z-30 bg-[#026632] hover:bg-[#014a24] text-white w-14 h-14 flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95"
      aria-label="Open cart"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-[#74f3be] text-[#026632] text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}
