import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { runAnalyticsReadApi, runAnalyticsWriteApi } from '@/lib/admin-api'
import { writeAuditLog } from '@/lib/analytics/audit'
import { parseCoach } from '@/lib/evaluations/data'
import { coachSchema } from '@/lib/schemas/evaluations'

export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const snap = await db.collection('coaches').get()
    const coaches = snap.docs
      .map((d) => parseCoach(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.name.localeCompare(b.name))
    return Response.json({ coaches })
  })
}

export async function POST(req: NextRequest) {
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const body = await req.json().catch(() => null)
    const parsed = coachSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    const ref = await db.collection('coaches').add({
      name: data.name.trim(),
      active: data.active,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog(db, {
      action: 'create',
      entityType: 'coach',
      entityId: ref.id,
      summary: `Added coach ${data.name}`,
      actor: session.sub,
      actorRole: session.role,
    })

    return Response.json({ id: ref.id, name: data.name.trim(), active: data.active }, { status: 201 })
  })
}
