import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { revalidateGallery } from '@/lib/revalidate'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const snap = await getAdminDb().collection('gallery').orderBy('createdAt', 'desc').get()
  const photos = snap.docs.map((d) => ({
    id: d.id,
    ...serializeFirestoreData(d.data() as Record<string, unknown>),
  }))
  return Response.json({ photos })
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const body = await req.json()
  const type = body.type === 'video' ? 'video' : 'photo'

  const ref = await getAdminDb()
    .collection('gallery')
    .add({
      type,
      imageUrl: body.imageUrl ?? '',
      youtubeId: body.youtubeId ?? '',
      caption: body.caption ?? '',
      createdAt: FieldValue.serverTimestamp(),
    })

  revalidateGallery()
  return Response.json({ id: ref.id }, { status: 201 })
}
