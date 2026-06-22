'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { IMAGE_PLACEHOLDER } from '@/lib/constants'

const PLACEHOLDER = IMAGE_PLACEHOLDER

const CLOTHING_CATEGORIES = ['Jersey', 'Training Kit', 'Footwear']

export type Product = {
  id: string
  name: string
  price: number
  image: string
  description: string
  category: string
  available: boolean
  priority?: boolean
}

function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  const needsSize = CLOTHING_CATEGORIES.includes(product.category)
  const canAdd = product.available

  const handleAdd = () => {
    if (!canAdd) return
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || PLACEHOLDER,
      size: needsSize ? '' : 'One Size',
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="group bg-white border border-gray-100 hover:border-[#01255f]/20 hover:shadow-lg transition-all duration-200 flex flex-col">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#f5f7fc]">
        <Image
          src={product.image || PLACEHOLDER}
          alt={product.name}
          fill
              priority={priority}
          className={`object-cover group-hover:scale-105 transition-transform duration-500 ${!product.available ? 'opacity-50 grayscale' : ''}`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {!product.available && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-[#01255f] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5">
              Sold Out
            </span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="bg-[#01255f] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">
            {product.category}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3
          className="font-bold text-[#01255f] text-xs sm:text-sm leading-tight mb-1 line-clamp-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {product.name}
        </h3>
        {product.description && (
          <p className="text-[#5a6478] text-xs line-clamp-2 mb-2 hidden sm:block">{product.description}</p>
        )}

        <span
          className="text-[#01255f] font-black text-sm sm:text-base mt-auto mb-3"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          ${product.price.toFixed(2)}
        </span>

        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className={`text-xs font-bold py-2 transition-all w-full ${
            added
              ? 'bg-green-500 text-white'
              : canAdd
              ? 'bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {added ? '✓ Added to Cart' : !product.available ? 'Sold Out' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}

export default function ShopGrid({ products }: { products: Product[] }) {
  const [activeCategory, setActiveCategory] = useState('All')

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))]
  const filtered = activeCategory === 'All' ? products : products.filter((p) => p.category === activeCategory)

  return (
    <div>
      {/* Category filter */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                activeCategory === cat
                  ? 'bg-[#fee11b] text-[#01255f]'
                  : 'bg-white border border-gray-200 text-[#5a6478] hover:border-[#01255f] hover:text-[#01255f]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-[#5a6478] text-sm">No products available yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filtered.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 2} />
          ))}
        </div>
      )}
    </div>
  )
}
