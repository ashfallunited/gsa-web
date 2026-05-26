'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { parseYoutubeId } from '@/lib/youtube'

type GalleryItem = {
  id: string
  type?: 'photo' | 'video'
  imageUrl: string
  youtubeId?: string
  caption: string
}

export default function AdminGallery() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [caption, setCaption] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoCaption, setVideoCaption] = useState('')
  const [addingVideo, setAddingVideo] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = () =>
    fetch('/api/admin/gallery')
      .then((r) => r.json())
      .then((d) => setItems(d.photos ?? []))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const uploadAndSave = async (file: File) => {
    setUploading(true)
    setUploadError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'website_files')
      form.append('folder', 'gallery')
      const upRes = await fetch('/api/upload', { method: 'POST', body: form })
      const upData = await upRes.json()
      if (!upRes.ok) throw new Error(upData.error ?? 'Upload failed')

      const saveRes = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'photo', imageUrl: upData.url, caption }),
      })
      if (!saveRes.ok) throw new Error('Failed to save photo')

      setCaption('')
      load()
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    const youtubeId = parseYoutubeId(videoUrl)
    if (!youtubeId) {
      setUploadError('Invalid YouTube URL or video ID')
      return
    }
    setAddingVideo(true)
    setUploadError('')
    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'video', youtubeId, caption: videoCaption }),
      })
      if (!res.ok) throw new Error('Failed to save video')
      setVideoUrl('')
      setVideoCaption('')
      load()
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to add video')
    } finally {
      setAddingVideo(false)
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) uploadAndSave(file)
    })
  }

  const del = async (id: string) => {
    if (!confirm('Delete this item? This cannot be undone.')) return
    await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((p) => p.id !== id))
  }

  const photos = items.filter((i) => i.type !== 'video')
  const videos = items.filter((i) => i.type === 'video')

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
          Gallery
        </h1>
        <p className="text-[#5a6478] text-sm mt-1">
          {photos.length} photos · {videos.length} videos
        </p>
      </div>

      <div className="mb-10 bg-white border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-[#01255f] uppercase tracking-widest mb-4">Add YouTube video</h2>
        <form onSubmit={addVideo} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">
              YouTube URL or video ID
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#01255f]"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">
              Caption (optional)
            </label>
            <input
              type="text"
              value={videoCaption}
              onChange={(e) => setVideoCaption(e.target.value)}
              className="w-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#01255f]"
            />
          </div>
          <button
            type="submit"
            disabled={addingVideo}
            className="bg-[#01255f] text-white px-6 py-2.5 text-sm font-bold disabled:opacity-60"
          >
            {addingVideo ? 'Adding…' : 'Add video'}
          </button>
        </form>
      </div>

      <div className="mb-10 bg-white border border-gray-200 p-6">
        <h2 className="text-sm font-bold text-[#01255f] uppercase tracking-widest mb-4">Upload photos</h2>
        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">
            Caption (optional — next upload)
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#01255f]"
          />
        </div>
        <div
          onDrop={(e) => {
            e.preventDefault()
            handleFiles(e.dataTransfer.files)
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed py-12 text-center cursor-pointer ${
            uploading ? 'border-[#fee11b] bg-[#fee11b]/5' : 'border-gray-200 hover:border-[#01255f]'
          }`}
        >
          {uploading ? (
            <p className="text-sm text-[#5a6478]">Uploading to Supabase Storage…</p>
          ) : (
            <p className="text-sm text-[#5a6478]">Click or drag photos to upload</p>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {uploadError && <p className="text-red-500 text-xs mb-4">{uploadError}</p>}

      {loading ? (
        <div className="bg-white border p-10 text-center text-sm text-[#5a6478]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-white border p-10 text-center text-sm text-[#5a6478]">No gallery items yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => (
            <div key={item.id} className="group relative bg-[#f5f7fc] overflow-hidden aspect-square">
              {item.type === 'video' && item.youtubeId ? (
                <img
                  src={`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`}
                  alt={item.caption || 'Video'}
                  className="w-full h-full object-cover"
                />
              ) : item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.caption || 'Photo'} fill className="object-cover" sizes="200px" />
              ) : null}
              <div className="absolute inset-0 bg-[#01255f]/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                <span className="text-[9px] uppercase font-bold text-[#fee11b]">{item.type ?? 'photo'}</span>
                {item.caption && <p className="text-white text-xs text-center line-clamp-2">{item.caption}</p>}
                <button
                  type="button"
                  onClick={() => del(item.id)}
                  className="bg-red-500 text-white text-xs font-bold px-4 py-1.5"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
