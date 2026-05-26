'use client'

import { useEffect } from 'react'
import Image from 'next/image'

interface GalleryModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  caption?: string
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export default function GalleryModal({
  isOpen,
  onClose,
  imageUrl,
  caption,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: GalleryModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev()
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, hasPrev, hasNext, onPrev, onNext])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 transition-colors p-2"
          aria-label="Close gallery"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center max-w-6xl" onClick={(e) => e.stopPropagation()}>
        {/* Previous Button */}
        {hasPrev && onPrev && (
          <button
            onClick={onPrev}
            className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors p-2 sm:p-3 hover:bg-white/10 rounded"
            aria-label="Previous image"
          >
            <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Image */}
        <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center">
          <Image
            src={imageUrl}
            alt={caption || 'Gallery photo'}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>

        {/* Next Button */}
        {hasNext && onNext && (
          <button
            onClick={onNext}
            className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors p-2 sm:p-3 hover:bg-white/10 rounded"
            aria-label="Next image"
          >
            <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <div className="absolute bottom-4 left-4 right-4 text-white text-center text-sm sm:text-base max-w-2xl mx-auto">
          <p>{caption}</p>
        </div>
      )}
    </div>
  )
}
