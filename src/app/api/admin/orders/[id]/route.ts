import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id } = await params
  const body = await req.json()
  await getAdminDb()
    .collection('orders')
    .doc(id)
    .update({ status: body.status, updatedAt: FieldValue.serverTimestamp() })

  return Response.json({ ok: true })
}
