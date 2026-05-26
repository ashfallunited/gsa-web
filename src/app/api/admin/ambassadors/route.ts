import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { revalidatePartners } from '@/lib/revalidate'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const snap = await getAdminDb().collection('ambassadors').orderBy('order', 'asc').get()
  const ambassadors = snap.docs.map((d) => ({
    id: d.id,
    ...serializeFirestoreData(d.data() as Record<string, unknown>),
  }))
  return Response.json({ ambassadors })
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const body = await req.json()
  const ref = await getAdminDb()
    .collection('ambassadors')
    .add({
      name: body.name ?? '',
      title: body.title ?? '',
      sport: body.sport ?? '',
      bio: body.bio ?? '',
      image: body.image ?? '',
      order: body.order ?? 99,
      createdAt: FieldValue.serverTimestamp(),
    })

  revalidatePartners()
  return Response.json({ id: ref.id }, { status: 201 })
}
