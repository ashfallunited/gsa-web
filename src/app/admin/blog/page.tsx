'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Post = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published'
  excerpt: string
  createdAt: { seconds: number } | null
}

export default function AdminBlog() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const load = () =>
    fetch('/api/admin/blog')
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  const formatDate = (ts: Post['createdAt']) =>
    ts ? new Date(ts.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#01255f]" style={{ fontFamily: 'var(--font-heading)' }}>
            Blog Posts
          </h1>
          <p className="text-[#5a6478] text-sm mt-1">{posts.length} total posts</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="bg-[#fee11b] hover:bg-[#e5ca10] text-[#01255f] px-5 py-2.5 text-sm font-bold tracking-wide transition-colors"
        >
          + New Post
        </Link>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-gray-100 p-10 text-center text-sm text-[#5a6478]">
          No posts yet.{' '}
          <Link href="/admin/blog/new" className="text-[#01255f] underline">
            Write your first post.
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 overflow-hidden">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-50 last:border-0 hover:bg-[#f5f7fc] transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 ${
                      post.status === 'published'
                        ? 'bg-[#01255f] text-[#fee11b]'
                        : 'bg-gray-100 text-[#5a6478]'
                    }`}
                  >
                    {post.status}
                  </span>
                  <span className="text-[#5a6478] text-xs">{formatDate(post.createdAt)}</span>
                </div>
                <h3 className="font-bold text-[#01255f] text-sm truncate">{post.title}</h3>
                <p className="text-[#5a6478] text-xs mt-0.5 truncate">{post.excerpt}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="text-xs font-bold text-[#01255f] hover:underline"
                >
                  Edit
                </Link>
                {post.status === 'published' && (
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="text-xs font-bold text-[#5a6478] hover:underline"
                  >
                    View
                  </Link>
                )}
                <button
                  onClick={() => deletePost(post.id)}
                  className="text-xs font-bold text-red-400 hover:text-red-600"
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
