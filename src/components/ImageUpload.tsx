'use client'

import { useState, useRef } from 'react'

type Props = {
  value: string
  onChange: (url: string) => void
  bucket?: string
  folder?: string
  label?: string
}

export default function ImageUpload({
  value,
  onChange,
  bucket = 'blog-images',
  folder = 'uploads',
  label = 'Image',
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setError('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', bucket)
      form.append('folder', folder)

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onChange(data.url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) upload(file)
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5">{label}</p>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          uploading ? 'border-[#fee11b] bg-[#fee11b]/5' : 'border-gray-200 hover:border-[#01255f] hover:bg-[#f5f7fc]'
        }`}
      >
        {value ? (
          <div className="relative bg-[#f5f7fc]">
            <img src={value} alt="Preview" className="w-full h-40 object-contain" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center group">
              <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 bg-[#01255f] px-3 py-1.5">
                {uploading ? 'Uploading…' : 'Replace image'}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#01255f] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-[#5a6478]">Uploading…</span>
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-[#5a6478]">Click or drag to upload</p>
                <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, WebP — saved to Supabase Storage</p>
              </>
            )}
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}

      {value && !uploading && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-[10px] text-gray-400 hover:text-red-400 mt-1.5 transition-colors"
        >
          Remove image
        </button>
      )}
    </div>
  )
}
