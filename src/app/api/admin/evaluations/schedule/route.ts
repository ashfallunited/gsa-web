import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { runAnalyticsReadApi, runAnalyticsWriteApi } from '@/lib/admin-api'
import { writeAuditLog } from '@/lib/analytics/audit'
import { parseTrainingSchedule } from '@/lib/evaluations/data'
import { trainingScheduleSchema } from '@/lib/schemas/evaluations'
import { normalizeTeamSlug, TEAM_LABELS } from '@/lib/teams'

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const team = req.nextUrl.searchParams.get('team')
    if (!team) return Response.json({ error: 'team is required' }, { status: 400 })

    const normalizedTeam = normalizeTeamSlug(team)
    const doc = await db.collection('evaluation_schedules').doc(normalizedTeam).get()
    const schedule = parseTrainingSchedule(normalizedTeam, doc.exists ? (doc.data() as Record<string, unknown>) : undefined)
    return Response.json({ schedule })
  })
}

export async function PUT(req: NextRequest) {
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const body = await req.json().catch(() => null)
    const parsed = trainingScheduleSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    const normalizedTeam = normalizeTeamSlug(data.team)
    const weekdays = [...new Set(data.trainingWeekdays)].sort()

    await db.collection('evaluation_schedules').doc(normalizedTeam).set(
      {
        team: normalizedTeam,
        trainingWeekdays: weekdays,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    const teamLabel = TEAM_LABELS[normalizedTeam as keyof typeof TEAM_LABELS] ?? normalizedTeam
    await writeAuditLog(db, {
      action: 'update',
      entityType: 'evaluation_schedule',
      entityId: normalizedTeam,
      summary: `Updated training schedule for ${teamLabel}: ${weekdays.map((d) => WEEKDAY_NAMES[d]).join(', ') || 'none'}`,
      actor: session.sub,
      actorRole: session.role,
    })

    return Response.json({ ok: true })
  })
}
