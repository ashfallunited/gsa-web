import { NextRequest } from 'next/server'
import { runAnalyticsReadApi } from '@/lib/admin-api'
import { serializeFirestoreData } from '@/lib/serialize-firestore'

export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 100), 500)
    const snap = await db.collection('analytics_audit_logs').get()

    const logs = snap.docs
      .map((d) => ({
        id: d.id,
        ...serializeFirestoreData(d.data() as Record<string, unknown>),
      }))
      .sort((a, b) => {
        const aRec = a as Record<string, unknown>
        const bRec = b as Record<string, unknown>
        const aSec = (aRec.createdAt as { seconds?: number } | undefined)?.seconds ?? 0
        const bSec = (bRec.createdAt as { seconds?: number } | undefined)?.seconds ?? 0
        return bSec - aSec
      })
      .slice(0, limit)

    return Response.json({ logs })
  })
}
