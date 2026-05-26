import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { revalidateBlog } from '@/lib/revalidate'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const snap = await getAdminDb().collection('blog_posts').orderBy('createdAt', 'desc').get()
  const posts = snap.docs.map((d) => ({
    id: d.id,
    ...serializeFirestoreData(d.data() as Record<string, unknown>),
  }))
  return Response.json({ posts })
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const body = await req.json()
  const slugSource = typeof body.slug === 'string' && body.slug.trim() ? body.slug : body.title
  const slug = String(slugSource ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

  const ref = await getAdminDb()
    .collection('blog_posts')
    .add({
      ...body,
      slug,
      status: body.status ?? 'draft',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      publishedAt: body.status === 'published' ? FieldValue.serverTimestamp() : null,
    })

  revalidateBlog()
  return Response.json({ id: ref.id, slug }, { status: 201 })
}
