'use client'

import { useState } from 'react'
import Image from 'next/image'
import GalleryModal from '@/components/GalleryModal'
import { youtubeEmbedUrl } from '@/lib/youtube'
import type { GalleryItem } from '@/lib/data/gallery'

export default function GalleryClient({ items }: { items: GalleryItem[] }) {
  const photos = items.filter((i) => i.type !== 'video' && i.imageUrl)
  const videos = items.filter((i) => i.type === 'video' && i.youtubeId)

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const handlePrev = () => {
    if (selectedIndex === null) return
    setSelectedIndex((selectedIndex - 1 + photos.length) % photos.length)
  }

  const handleNext = () => {
    if (selectedIndex === null) return
    setSelectedIndex((selectedIndex + 1) % photos.length)
  }

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
      {videos.length > 0 && (
        <section className="mb-14 sm:mb-20">
          <h2
            className="text-lg sm:text-xl font-bold text-[#01255f] mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Videos
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {videos.map((video) => (
              <div key={video.id} className="bg-white border border-gray-100 overflow-hidden">
                <div className="relative aspect-video bg-black">
                  <iframe
                    src={youtubeEmbedUrl(video.youtubeId!)}
                    title={video.caption || 'Asfall United video'}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                {video.caption && (
                  <p className="p-4 text-sm text-[#5a6478] leading-relaxed">{video.caption}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {photos.length === 0 && videos.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-[#5a6478] text-sm">No media yet. Check back soon.</p>
        </div>
      ) : photos.length > 0 ? (
        <>
          {videos.length > 0 && (
            <h2
              className="text-lg sm:text-xl font-bold text-[#01255f] mb-6"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Photos
            </h2>
          )}
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-2 sm:gap-3 lg:gap-4">
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className="break-inside-avoid mb-2 sm:mb-3 lg:mb-4 group relative overflow-hidden bg-[#e2e8f0] w-full text-left hover:opacity-80 transition-opacity"
              >
                <Image
                  src={photo.imageUrl!}
                  alt={photo.caption || 'Gallery photo'}
                  width={600}
                  height={400}
                  className="w-full h-auto block group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  priority={idx === 0}
                />
                {photo.caption && (
                  <div className="absolute inset-0 bg-[#01255f]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <p className="text-white text-xs font-medium leading-relaxed">{photo.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {selectedIndex !== null && photos[selectedIndex] && (
        <GalleryModal
          isOpen={selectedIndex !== null}
          onClose={() => setSelectedIndex(null)}
          imageUrl={photos[selectedIndex].imageUrl!}
          caption={photos[selectedIndex].caption}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < photos.length - 1}
        />
      )}
    </div>
  )
}
