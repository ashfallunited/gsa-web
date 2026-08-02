import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { runAnalyticsReadApi, runAnalyticsWriteApi } from '@/lib/admin-api'
import { writeAuditLog } from '@/lib/analytics/audit'
import { parseScheduleBreak } from '@/lib/evaluations/data'
import { scheduleBreakSchema } from '@/lib/schemas/evaluations'
import { normalizeTeamSlug } from '@/lib/teams'

export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const team = req.nextUrl.searchParams.get('team')
    if (!team) return Response.json({ error: 'team is required' }, { status: 400 })

    const normalizedTeam = normalizeTeamSlug(team)
    const snap = await db.collection('evaluation_breaks').where('team', '==', normalizedTeam).get()
    const breaks = snap.docs
      .map((d) => parseScheduleBreak(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
    return Response.json({ breaks })
  })
}

export async function POST(req: NextRequest) {
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const body = await req.json().catch(() => null)
    const parsed = scheduleBreakSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    const normalizedTeam = normalizeTeamSlug(data.team)

    const ref = await db.collection('evaluation_breaks').add({
      team: normalizedTeam,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason ?? '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog(db, {
      action: 'create',
      entityType: 'evaluation_break',
      entityId: ref.id,
      summary: `Added break ${data.startDate} to ${data.endDate}${data.reason ? ` (${data.reason})` : ''}`,
      actor: session.sub,
      actorRole: session.role,
    })

    return Response.json({ id: ref.id }, { status: 201 })
  })
}
