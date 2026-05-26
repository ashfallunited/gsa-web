import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { revalidateBlog } from '@/lib/revalidate'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id } = await params
  const snap = await getAdminDb().collection('blog_posts').doc(id).get()
  if (!snap.exists) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    post: {
      id: snap.id,
      ...serializeFirestoreData(snap.data() as Record<string, unknown>),
    },
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {
    ...body,
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (body.status === 'published') {
    const snap = await getAdminDb().collection('blog_posts').doc(id).get()
    const existing = snap.data()
    if (existing?.publishedAt == null) {
      updates.publishedAt = FieldValue.serverTimestamp()
    }
  } else if (body.status === 'draft') {
    updates.publishedAt = null
  }

  await getAdminDb().collection('blog_posts').doc(id).update(updates)
  revalidateBlog()
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id } = await params
  await getAdminDb().collection('blog_posts').doc(id).delete()
  revalidateBlog()
  return Response.json({ ok: true })
}
