import BlogEditor from '@/components/BlogEditor'
import { notFound } from 'next/navigation'
import { getAdminDb } from '@/lib/firebase-admin'

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const snap = await getAdminDb().collection('blog_posts').doc(id).get()
  if (!snap.exists) notFound()

  const data = snap.data()!

  return (
    <BlogEditor
      postId={id}
      initialData={{
        title: String(data.title ?? ''),
        excerpt: String(data.excerpt ?? ''),
        content: String(data.content ?? ''),
        author: String(data.author ?? ''),
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : String(data.tags ?? ''),
        status: (data.status as 'draft' | 'published') ?? 'draft',
        featuredImage: String(data.featuredImage ?? ''),
        seoTitle: String(data.seoTitle ?? ''),
        seoDescription: String(data.seoDescription ?? ''),
      }}
    />
  )
}
