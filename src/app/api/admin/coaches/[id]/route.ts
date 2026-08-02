import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { runAnalyticsWriteApi } from '@/lib/admin-api'
import { writeAuditLog } from '@/lib/analytics/audit'
import { parseCoach } from '@/lib/evaluations/data'
import { coachUpdateSchema } from '@/lib/schemas/evaluations'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const docRef = db.collection('coaches').doc(id)
    const existing = await docRef.get()
    if (!existing.exists) {
      return Response.json({ error: 'Coach not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    const parsed = coachUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const updates = parsed.data
    const payload: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
    if (updates.name !== undefined) payload.name = updates.name.trim()
    if (updates.active !== undefined) payload.active = updates.active

    await docRef.update(payload)

    const current = parseCoach(existing.id, existing.data() as Record<string, unknown>)
    await writeAuditLog(db, {
      action: 'update',
      entityType: 'coach',
      entityId: id,
      summary: `Updated coach ${updates.name ?? current.name}`,
      actor: session.sub,
      actorRole: session.role,
    })

    return Response.json({ ok: true })
  })
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const docRef = db.collection('coaches').doc(id)
    const existing = await docRef.get()
    if (!existing.exists) {
      return Response.json({ error: 'Coach not found' }, { status: 404 })
    }

    const current = parseCoach(existing.id, existing.data() as Record<string, unknown>)
    await docRef.delete()

    await writeAuditLog(db, {
      action: 'delete',
      entityType: 'coach',
      entityId: id,
      summary: `Deleted coach ${current.name}`,
      actor: session.sub,
      actorRole: session.role,
    })

    return Response.json({ ok: true })
  })
}
