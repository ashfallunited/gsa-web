import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ShopGrid from '@/components/ShopGrid'
import { getActiveProducts } from '@/lib/data/shop'
import { loadPublicData } from '@/lib/public-data'
import { buildPageMetadata, SEO_KEYWORDS } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Shop',
  description:
    'Official Asfall United merchandise and kits. Every purchase supports youth football and development programmes in Liberia.',
  path: '/shop',
  keywords: SEO_KEYWORDS.shop,
})

export default async function ShopPage() {
  const raw = await loadPublicData('shop-products', () => getActiveProducts(), [])
  const products = raw.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    image: p.image ?? '',
    description: p.description ?? '',
    category: p.category ?? 'General',
    available: p.available !== false && p.active !== false,
  }))

  return (
    <>
      <Navbar />
      <main className="pt-16 lg:pt-[70px]">
        <div className="bg-[#01255f] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
            <span className="label-light">Merchandise</span>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-4 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Club Shop
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-lg">
              Wear the colours. Every purchase supports our youth programmes.
            </p>
          </div>
        </div>
        <div className="bg-[#f5f7fc] py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
            <ShopGrid products={products} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
