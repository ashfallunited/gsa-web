'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil, ExternalLink, Trash2, Plus } from 'lucide-react'

type Post = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  excerpt: string
  featuredImage?: string
  createdAt: { seconds: number } | null
}

function formatDate(ts: Post['createdAt']) {
  if (!ts) return '—'
  return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function PostCard({ post, onDelete }: { post: Post; onDelete: (id: string) => void }) {
  const isPublished = post.status === 'published'

  return (
    <div className="group bg-white border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image / accent strip */}
      <div className="relative h-40 overflow-hidden bg-[#01255f] shrink-0">
        {post.featuredImage ? (
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
          />
        ) : (
          <div className="w-full h-full flex items-end p-4">
            <span
              className="text-[4rem] font-black text-white/10 leading-none select-none"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              AU
            </span>
          </div>
        )}
        {/* Status badge */}
        <span
          className={`absolute top-3 left-3 text-[9px] font-black uppercase tracking-widest px-2 py-1 ${
            isPublished ? 'bg-[#fee11b] text-[#01255f]' : 'bg-white/20 text-white'
          }`}
        >
          {post.status}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        <p className="text-[10px] text-[#5a6478] mb-2">{formatDate(post.createdAt)}</p>
        <h3
          className="font-black text-[#01255f] text-sm sm:text-base leading-snug line-clamp-2 mb-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {post.title}
        </h3>
        <p className="text-[#5a6478] text-xs leading-relaxed line-clamp-3 flex-1">{post.excerpt}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50">
        <Link
          href={`/admin/blog/${post.id}`}
          className="flex items-center gap-1.5 text-xs font-bold text-[#01255f] hover:bg-[#01255f] hover:text-white px-3 py-1.5 transition-colors"
        >
          <Pencil size={12} />
          Edit
        </Link>
        {isPublished && (
          <Link
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold text-[#5a6478] hover:bg-gray-200 px-3 py-1.5 transition-colors"
          >
            <ExternalLink size={12} />
            View
          </Link>
        )}
        <button
          onClick={() => onDelete(post.id)}
          className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:bg-red-50 hover:text-red-600 px-3 py-1.5 transition-colors ml-auto"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  )
}

function SkeletonPostCard() {
  return (
    <div className="bg-white border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-200" />
      <div className="p-4 sm:p-5 space-y-3">
        <div className="h-3 bg-gray-200 w-24 rounded" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 w-5/6 rounded" />
        <div className="h-3 bg-gray-200 w-full rounded" />
        <div className="h-3 bg-gray-200 w-4/5 rounded" />
      </div>
      <div className="h-10 bg-gray-100 border-t border-gray-100" />
    </div>
  )
}

export default function AdminBlog() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/admin/blog')
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json()
      })
      .then((d) => { setPosts(d.posts ?? []); setLoadError('') })
      .catch(() => { setPosts([]); setLoadError('Failed to load posts. Please try again.') })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
    if (!res.ok) { setLoadError('Failed to delete post. Please try again.'); return }
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-black text-[#01255f]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Blog Posts
          </h1>
          <p className="text-[#5a6478] text-sm mt-1">{posts.length} total posts</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-2 bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] px-5 py-2.5 text-sm font-bold tracking-wide transition-colors"
        >
          <Plus size={16} />
          New Post
        </Link>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6">{loadError}</div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonPostCard key={i} />)}
        </div>
      )}

      {!loading && !loadError && posts.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 p-12 text-center">
          <p className="text-[#01255f] font-bold mb-2">No posts yet</p>
          <Link href="/admin/blog/new" className="inline-flex items-center gap-2 bg-[#fee11b] text-[#01255f] px-5 py-2 text-sm font-bold">
            <Plus size={14} />
            Write your first post
          </Link>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDelete={deletePost} />
          ))}
        </div>
      )}
    </div>
  )
}
