import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import GalleryClient from './client'
import { getGalleryItems } from '@/lib/data/gallery'
import { loadPublicData } from '@/lib/public-data'

export const metadata = {
  title: 'Gallery | Asfall United',
  description: 'Photos and videos from Asfall United programmes in Monrovia, Liberia.',
}

export default async function GalleryPage() {
  const items = await loadPublicData('gallery', () => getGalleryItems(), [])

  return (
    <>
      <Navbar />
      <main className="pt-16 lg:pt-[70px]">
        <div className="bg-[#01255f] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
            <span className="label-light">Media</span>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-4 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Gallery
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-lg">
              Photos and videos from the pitch, the classroom, and the community.
            </p>
          </div>
        </div>

        <div className="bg-[#f5f7fc] py-14 sm:py-20">
          <GalleryClient items={items} />
        </div>
      </main>
      <Footer />
    </>
  )
}
