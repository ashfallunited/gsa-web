import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { serializeFirestoreData } from '@/lib/serialize-firestore'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const snap = await getAdminDb().collection('orders').orderBy('createdAt', 'desc').get()
  const orders = snap.docs.map((d) => ({
    id: d.id,
    ...serializeFirestoreData(d.data() as Record<string, unknown>),
  }))
  return Response.json({ orders })
}
