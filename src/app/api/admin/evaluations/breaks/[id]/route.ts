import { NextRequest } from 'next/server'
import { runAnalyticsWriteApi } from '@/lib/admin-api'
import { writeAuditLog } from '@/lib/analytics/audit'
import { parseScheduleBreak } from '@/lib/evaluations/data'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const docRef = db.collection('evaluation_breaks').doc(id)
    const existing = await docRef.get()
    if (!existing.exists) {
      return Response.json({ error: 'Break not found' }, { status: 404 })
    }

    const current = parseScheduleBreak(existing.id, existing.data() as Record<string, unknown>)
    await docRef.delete()

    await writeAuditLog(db, {
      action: 'delete',
      entityType: 'evaluation_break',
      entityId: id,
      summary: `Removed break ${current.startDate} to ${current.endDate}`,
      actor: session.sub,
      actorRole: session.role,
    })

    return Response.json({ ok: true })
  })
}
