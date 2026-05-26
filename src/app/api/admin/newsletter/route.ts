import { NextRequest } from 'next/server'
import { runAdminApiWithDb } from '@/lib/admin-api'
import { serializeFirestoreData } from '@/lib/serialize-firestore'

export async function GET(req: NextRequest) {
  return runAdminApiWithDb(req, async (db) => {
    const snap = await db
      .collection('newsletter_subscribers')
      .orderBy('subscribedAt', 'desc')
      .get()

    const subscribers = snap.docs.map((d) => ({
      id: d.id,
      ...serializeFirestoreData(d.data() as Record<string, unknown>),
    }))

    return Response.json({ subscribers })
  })
}
