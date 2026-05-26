import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { revalidateInquiries } from '@/lib/revalidate'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const snap = await getAdminDb().collection('inquiries').orderBy('submittedAt', 'desc').get()
  const inquiries = snap.docs.map((d) => ({
    id: d.id,
    ...serializeFirestoreData(d.data() as Record<string, unknown>),
  }))
  return Response.json({ inquiries })
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id, read } = await req.json()
  await getAdminDb().collection('inquiries').doc(id).update({ read })
  revalidateInquiries()
  return Response.json({ ok: true })
}
