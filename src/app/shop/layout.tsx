'use client'

import { CartProvider } from '@/context/CartContext'
import CartDrawer from '@/components/CartDrawer'
import CartButton from '@/components/CartButton'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartButton />
      <CartDrawer />
    </CartProvider>
  )
}
