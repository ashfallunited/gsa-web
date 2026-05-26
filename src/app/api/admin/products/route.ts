import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { revalidateShop } from '@/lib/revalidate'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const snap = await getAdminDb().collection('products').orderBy('order', 'asc').get()
  const products = snap.docs.map((d) => ({
    id: d.id,
    ...serializeFirestoreData(d.data() as Record<string, unknown>),
  }))
  return Response.json({ products })
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const body = await req.json()
  const ref = await getAdminDb()
    .collection('products')
    .add({
      name: body.name ?? '',
      price: body.price ?? 0,
      image: body.image ?? '',
      description: body.description ?? '',
      category: body.category ?? 'General',
      available: body.available ?? true,
      active: body.available ?? true,
      order: body.order ?? 99,
      sizes: body.sizes ?? [],
      createdAt: FieldValue.serverTimestamp(),
    })

  revalidateShop()
  return Response.json({ id: ref.id }, { status: 201 })
}
