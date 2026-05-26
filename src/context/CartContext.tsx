'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type CartItem = {
  id: string
  name: string
  price: number
  image: string
  size: string
  quantity: number
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string, size?: string) => void
  updateQuantity: (id: string, quantity: number, size?: string) => void
  updateSize: (id: string, fromSize: string, toSize: string) => void
  clearCart: () => void
  total: number
  count: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('asfall-cart')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem('asfall-cart', JSON.stringify(items))
    }
  }, [items, hydrated])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.size === item.size)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.size === item.size ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((id: string, size?: string) => {
    setItems((prev) => prev.filter((i) => !(i.id === id && i.size === (size ?? i.size))))
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number, size?: string) => {
    if (quantity < 1) return
    setItems((prev) =>
      prev.map((i) => i.id === id && i.size === (size ?? i.size) ? { ...i, quantity } : i)
    )
  }, [])

  const updateSize = useCallback((id: string, fromSize: string, toSize: string) => {
    if (!toSize) return
    setItems((prev) => {
      const source = prev.find((i) => i.id === id && i.size === fromSize)
      if (!source) return prev

      const withoutSource = prev.filter((i) => !(i.id === id && i.size === fromSize))
      const target = withoutSource.find((i) => i.id === id && i.size === toSize)

      if (target) {
        return withoutSource.map((i) =>
          i.id === id && i.size === toSize
            ? { ...i, quantity: i.quantity + source.quantity }
            : i
        )
      }

      return [...withoutSource, { ...source, size: toSize }]
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, updateSize, clearCart, total, count, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
