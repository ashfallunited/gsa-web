import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { serializeFirestoreData } from '@/lib/serialize-firestore'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const snap = await getAdminDb().collection('contacts').orderBy('submittedAt', 'desc').get()
  const contacts = snap.docs.map((d) => ({
    id: d.id,
    ...serializeFirestoreData(d.data() as Record<string, unknown>),
  }))
  return Response.json({ contacts })
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id, read } = await req.json()
  await getAdminDb().collection('contacts').doc(id).update({ read })
  return Response.json({ ok: true })
}
