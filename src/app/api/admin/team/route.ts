import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { revalidateTeam } from '@/lib/revalidate'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const snap = await getAdminDb().collection('team').orderBy('order', 'asc').get()
  const members = snap.docs.map((d) => {
    const data = serializeFirestoreData(d.data() as Record<string, unknown>)
    return {
      id: d.id,
      ...data,
      section: data.section === 'board' ? 'board' : 'staff',
    }
  })
  return Response.json({ members })
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const body = await req.json()
  const ref = await getAdminDb()
    .collection('team')
    .add({
      name: body.name ?? '',
      role: body.role ?? '',
      image: body.image ?? '',
      order: body.order ?? 99,
      section: body.section === 'board' ? 'board' : 'staff',
      createdAt: FieldValue.serverTimestamp(),
    })

  revalidateTeam()
  return Response.json({ id: ref.id }, { status: 201 })
}
