import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { runAnalyticsReadApi, runAnalyticsWriteApi } from '@/lib/admin-api'
import { writeAuditLog } from '@/lib/analytics/audit'
import { saveAnalyticsLookups } from '@/lib/analytics/lookups'
import { isSuperAdmin } from '@/lib/analytics/permissions'
import { docWithId, parseMatch, parseStat } from '@/lib/data/games'
import { matchUpdateSchema } from '@/lib/schemas/analytics'
import { normalizeTeamSlug } from '@/lib/teams'
import { revalidateGames } from '@/lib/revalidate'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return runAnalyticsReadApi(req, async ({ db }) => {
    const doc = await db.collection('matches').doc(id).get()
    if (!doc.exists) {
      return Response.json({ error: 'Match not found' }, { status: 404 })
    }
    const match = parseMatch(doc.id, doc.data() as Record<string, unknown>)
    const statsSnap = await db.collection('match_player_stats').where('matchId', '==', id).get()
    const stats = statsSnap.docs.map((d) => parseStat(d.id, d.data() as Record<string, unknown>))
    return Response.json({ match, stats })
  })
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const docRef = db.collection('matches').doc(id)
    const existing = await docRef.get()
    if (!existing.exists) {
      return Response.json({ error: 'Match not found' }, { status: 404 })
    }

    const current = parseMatch(existing.id, existing.data() as Record<string, unknown>)
    const body = await req.json().catch(() => null)
    const parsed = matchUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const updates = parsed.data
    const isFinalLocked = current.status === 'final' && !isSuperAdmin(session.role)

    if (isFinalLocked) {
      const allowedKeys = new Set(['notes'])
      const attempted = Object.keys(updates)
      const blocked = attempted.filter((k) => !allowedKeys.has(k) && updates[k as keyof typeof updates] !== undefined)
      if (blocked.length > 0) {
        return Response.json(
          { error: 'Finalized matches are locked. Only notes can be edited by analysts.' },
          { status: 403 }
        )
      }
    }

    const payload: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (updates.team !== undefined) payload.team = normalizeTeamSlug(updates.team)
    if (updates.season !== undefined) payload.season = updates.season
    if (updates.competition !== undefined) payload.competition = updates.competition
    if (updates.date !== undefined) payload.date = updates.date
    if (updates.opponent !== undefined) payload.opponent = updates.opponent
    if (updates.homeAway !== undefined) payload.homeAway = updates.homeAway
    if (updates.goalsFor !== undefined) payload.goalsFor = updates.goalsFor
    if (updates.goalsAgainst !== undefined) payload.goalsAgainst = updates.goalsAgainst
    if (updates.status !== undefined) payload.status = updates.status
    if (updates.notes !== undefined) payload.notes = updates.notes
    if (updates.highlightUrl !== undefined) payload.highlightUrl = updates.highlightUrl ?? ''
    if (updates.report !== undefined) payload.report = updates.report ?? ''

    await docRef.update(payload)

    const nextTeam = normalizeTeamSlug(String(payload.team ?? current.team))
    await saveAnalyticsLookups(db, nextTeam, {
      opponent: String(updates.opponent ?? current.opponent),
      competition: String(updates.competition ?? current.competition),
      season: String(updates.season ?? current.season),
    })

    await writeAuditLog(db, {
      action: 'update',
      entityType: 'match',
      entityId: id,
      summary: `Updated match vs ${updates.opponent ?? current.opponent}`,
      actor: session.sub,
      actorRole: session.role,
      metadata: updates,
    })

    revalidateGames()
    return Response.json({ ok: true })
  })
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const docRef = db.collection('matches').doc(id)
    const existing = await docRef.get()
    if (!existing.exists) {
      return Response.json({ error: 'Match not found' }, { status: 404 })
    }

    const current = parseMatch(existing.id, existing.data() as Record<string, unknown>)
    if (current.status === 'final' && !isSuperAdmin(session.role)) {
      return Response.json({ error: 'Cannot delete finalized matches' }, { status: 403 })
    }

    const statsSnap = await db.collection('match_player_stats').where('matchId', '==', id).get()
    const batch = db.batch()
    for (const stat of statsSnap.docs) {
      batch.delete(stat.ref)
    }
    batch.delete(docRef)
    await batch.commit()

    await writeAuditLog(db, {
      action: 'delete',
      entityType: 'match',
      entityId: id,
      summary: `Deleted match vs ${current.opponent} (${current.date})`,
      actor: session.sub,
      actorRole: session.role,
    })

    revalidateGames()
    return Response.json({ ok: true })
  })
}
