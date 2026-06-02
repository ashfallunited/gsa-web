'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import ImageUpload from '@/components/ImageUpload'
import { ORG_NAME } from '@/lib/constants'

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false })

type PostData = {
  title: string
  excerpt: string
  content: string
  author: string
  tags: string
  status: 'draft' | 'published'
  featuredImage: string
  seoTitle: string
  seoDescription: string
}

type Props = {
  initialData?: Partial<PostData>
  postId?: string
}

const empty: PostData = {
  title: '',
  excerpt: '',
  content: '',
  author: ORG_NAME,
  tags: '',
  status: 'draft',
  featuredImage: '',
  seoTitle: '',
  seoDescription: '',
}

export default function BlogEditor({ initialData, postId }: Props) {
  const router = useRouter()
  const [data, setData] = useState<PostData>({ ...empty, ...initialData })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content')

  const set = (field: keyof PostData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setData((d) => ({ ...d, [field]: e.target.value }))

  const save = async (status?: 'draft' | 'published') => {
    if (!data.title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...data,
        status: status ?? data.status,
        tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
      }

      const res = postId
        ? await fetch(`/api/admin/blog/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (res.ok) {
        router.push('/admin/blog')
        router.refresh()
      } else {
        setError('Failed to save. Please try again.')
        setSaving(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  const inputClass =
    'w-full border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[#01255f] transition-colors'
  const labelClass = 'block text-[10px] uppercase tracking-widest font-bold text-[#5a6478] mb-1.5'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full min-w-0">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1
          className="text-xl sm:text-2xl font-bold text-[#01255f]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {postId ? 'Edit Post' : 'New Post'}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => save('draft')}
            disabled={saving}
            className="border border-gray-200 px-4 py-2 text-sm font-semibold text-[#5a6478] hover:border-[#01255f] hover:text-[#01255f] transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => save('published')}
            disabled={saving}
            className="bg-[#01255f] hover:bg-[#011840] text-white px-5 py-2 text-sm font-bold tracking-wide transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-5">
          {error}
        </div>
      )}

      <div className="mb-5">
        <input
          type="text"
          value={data.title}
          onChange={set('title')}
          placeholder="Post title…"
          className="w-full border-0 border-b-2 border-gray-200 focus:border-[#01255f] px-0 py-3 text-xl font-bold text-[#01255f] focus:outline-none transition-colors bg-transparent"
          style={{ fontFamily: 'var(--font-heading)' }}
        />
      </div>

      <div className="flex gap-0 border-b border-gray-200 mb-6">
        {(['content', 'seo'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 -mb-px transition-all ${
              activeTab === tab
                ? 'border-[#fee11b] text-[#01255f]'
                : 'border-transparent text-[#5a6478] hover:text-[#01255f]'
            }`}
          >
            {tab === 'content' ? 'Content' : 'SEO & Meta'}
          </button>
        ))}
      </div>

      {activeTab === 'content' ? (
        <div className="space-y-5">
          <ImageUpload
            label="Featured Image"
            value={data.featuredImage}
            onChange={(url) => setData((d) => ({ ...d, featuredImage: url }))}
            bucket="blog-images"
            folder="featured"
          />

          <div>
            <label className={labelClass}>Excerpt <span className="font-normal normal-case text-gray-400">(shown in listings)</span></label>
            <textarea
              value={data.excerpt}
              onChange={set('excerpt')}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="A short summary shown in blog listings and search results…"
            />
          </div>

          <div>
            <label className={labelClass}>Content</label>
            <RichTextEditor
              value={data.content}
              onChange={(html) => setData((d) => ({ ...d, content: html }))}
              placeholder="Write your post here…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Author</label>
              <input type="text" value={data.author} onChange={set('author')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tags <span className="font-normal normal-case text-gray-400">(comma-separated)</span></label>
              <input
                type="text"
                value={data.tags}
                onChange={set('tags')}
                className={inputClass}
                placeholder="sport, liberia, health"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select value={data.status} onChange={set('status')} className={inputClass}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs px-4 py-3">
            If left empty, SEO fields fall back to the post title and excerpt automatically.
          </div>

          <div>
            <label className={labelClass}>
              SEO Title{' '}
              <span className="font-normal normal-case text-gray-400">(max 60 chars)</span>
            </label>
            <input
              type="text"
              value={data.seoTitle}
              onChange={set('seoTitle')}
              maxLength={60}
              className={inputClass}
              placeholder="Keyword-rich page title"
            />
            <p className="text-[10px] text-gray-400 mt-1">{data.seoTitle.length}/60</p>
          </div>

          <div>
            <label className={labelClass}>
              Meta Description{' '}
              <span className="font-normal normal-case text-gray-400">(max 160 chars)</span>
            </label>
            <textarea
              value={data.seoDescription}
              onChange={set('seoDescription')}
              maxLength={160}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Compelling description shown in Google results…"
            />
            <p className="text-[10px] text-gray-400 mt-1">{data.seoDescription.length}/160</p>
          </div>

          <ImageUpload
            label="OG / Social Share Image (1200×630 recommended)"
            value={data.featuredImage}
            onChange={(url) => setData((d) => ({ ...d, featuredImage: url }))}
            bucket="blog-images"
            folder="og"
          />
        </div>
      )}
    </div>
  )
}
