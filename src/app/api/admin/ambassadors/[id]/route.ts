import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { revalidatePartners } from '@/lib/revalidate'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id } = await params
  const snap = await getAdminDb().collection('ambassadors').doc(id).get()
  if (!snap.exists) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    id: snap.id,
    ...serializeFirestoreData(snap.data() as Record<string, unknown>),
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id } = await params
  const body = await req.json()
  await getAdminDb()
    .collection('ambassadors')
    .doc(id)
    .update({ ...body, updatedAt: FieldValue.serverTimestamp() })

  revalidatePartners()
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id } = await params
  await getAdminDb().collection('ambassadors').doc(id).delete()
  revalidatePartners()
  return Response.json({ ok: true })
}
