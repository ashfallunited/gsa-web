import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { runAnalyticsReadApi, runAnalyticsWriteApi } from '@/lib/admin-api'
import { writeAuditLog } from '@/lib/analytics/audit'
import { saveAnalyticsLookups } from '@/lib/analytics/lookups'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { parseEvaluation } from '@/lib/evaluations/data'
import { EVAL_MAX_TOTAL, roleForPosition } from '@/lib/evaluations/types'
import { evaluationInputSchema } from '@/lib/schemas/evaluations'
import { normalizeTeamSlug } from '@/lib/teams'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return runAnalyticsReadApi(req, async ({ db }) => {
    const doc = await db.collection('player_evaluations').doc(id).get()
    if (!doc.exists) {
      return Response.json({ error: 'Evaluation not found' }, { status: 404 })
    }
    return Response.json({ evaluation: parseEvaluation(doc.id, doc.data() as Record<string, unknown>) })
  })
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const docRef = db.collection('player_evaluations').doc(id)
    const existing = await docRef.get()
    if (!existing.exists) {
      return Response.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    const parsed = evaluationInputSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    const data = parsed.data

    const playerDoc = await db.collection('players').doc(data.playerId).get()
    if (!playerDoc.exists) {
      return Response.json({ error: 'Player not found' }, { status: 404 })
    }
    const player = serializeFirestoreData(playerDoc.data() as Record<string, unknown>)
    const expectedRole = roleForPosition(String(player.position ?? ''))
    if (data.role !== expectedRole) {
      return Response.json(
        {
          error: `This player is ${expectedRole === 'goalkeeper' ? 'a goalkeeper' : 'an outfield player'} — use the ${expectedRole} evaluation form.`,
        },
        { status: 400 }
      )
    }

    const coachDoc = await db.collection('coaches').doc(data.coachId).get()
    if (!coachDoc.exists) {
      return Response.json({ error: 'Coach not found' }, { status: 404 })
    }

    const total = Object.values(data.categories).reduce((sum: number, v) => sum + (Number(v) || 0), 0)
    const team = normalizeTeamSlug(String(player.team ?? ''))

    await docRef.update({
      playerId: data.playerId,
      coachId: data.coachId,
      team,
      role: data.role,
      type: data.type,
      date: data.date,
      season: data.season,
      categories: data.categories,
      total,
      maxTotal: EVAL_MAX_TOTAL[data.role],
      comment: data.comment ?? '',
      updatedAt: FieldValue.serverTimestamp(),
    })

    await saveAnalyticsLookups(db, team, { season: data.season })

    await writeAuditLog(db, {
      action: 'update',
      entityType: 'player_evaluation',
      entityId: id,
      summary: `Updated ${data.type} evaluation for ${String(player.name ?? 'player')}`,
      actor: session.sub,
      actorRole: session.role,
    })

    return Response.json({ ok: true, total })
  })
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const docRef = db.collection('player_evaluations').doc(id)
    const existing = await docRef.get()
    if (!existing.exists) {
      return Response.json({ error: 'Evaluation not found' }, { status: 404 })
    }

    const current = parseEvaluation(existing.id, existing.data() as Record<string, unknown>)
    await docRef.delete()

    await writeAuditLog(db, {
      action: 'delete',
      entityType: 'player_evaluation',
      entityId: id,
      summary: `Deleted evaluation dated ${current.date}`,
      actor: session.sub,
      actorRole: session.role,
    })

    return Response.json({ ok: true })
  })
}
