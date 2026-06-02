import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { runAnalyticsReadApi, runAnalyticsWriteApi } from '@/lib/admin-api'
import { writeAuditLog } from '@/lib/analytics/audit'
import { isSuperAdmin } from '@/lib/analytics/permissions'
import { parseMatch, parseStat } from '@/lib/data/games'
import { matchPlayerStatsBulkSchema } from '@/lib/schemas/analytics'
import { revalidateGames } from '@/lib/revalidate'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return runAnalyticsReadApi(req, async ({ db }) => {
    const snap = await db.collection('match_player_stats').where('matchId', '==', id).get()
    const stats = snap.docs.map((d) => parseStat(d.id, d.data() as Record<string, unknown>))
    return Response.json({ stats })
  })
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id: matchId } = await context.params
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const matchDoc = await db.collection('matches').doc(matchId).get()
    if (!matchDoc.exists) {
      return Response.json({ error: 'Match not found' }, { status: 404 })
    }

    const match = parseMatch(matchDoc.id, matchDoc.data() as Record<string, unknown>)
    if (match.status === 'final' && !isSuperAdmin(session.role)) {
      return Response.json({ error: 'Cannot edit player stats on finalized matches' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const parsed = matchPlayerStatsBulkSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const existingSnap = await db.collection('match_player_stats').where('matchId', '==', matchId).get()

    const batch = db.batch()
    // Build the player→doc map and delete any duplicate docs for the same player.
    const existingByPlayer = new Map<string, (typeof existingSnap.docs)[number]>()
    for (const doc of existingSnap.docs) {
      const pid = String(doc.data().playerId)
      if (existingByPlayer.has(pid)) {
        batch.delete(doc.ref)
      } else {
        existingByPlayer.set(pid, doc)
      }
    }
    for (const stat of parsed.data.stats) {
      const existing = existingByPlayer.get(stat.playerId)
      const payload = {
        matchId,
        playerId: stat.playerId,
        started: stat.started,
        minutes: stat.minutes,
        goals: stat.goals,
        assists: stat.assists,
        yellowCards: stat.yellowCards,
        redCards: stat.redCards,
        notes: stat.notes ?? '',
        headerGoals: stat.headerGoals ?? 0,
        leftFootGoals: stat.leftFootGoals ?? 0,
        rightFootGoals: stat.rightFootGoals ?? 0,
        outsideBoxGoals: stat.outsideBoxGoals ?? 0,
        penaltiesTaken: stat.penaltiesTaken ?? 0,
        penaltiesScored: stat.penaltiesScored ?? 0,
        penaltiesSaved: stat.penaltiesSaved ?? 0,
        penaltiesFaced: stat.penaltiesFaced ?? 0,
        goalMinutes: stat.goalMinutes ?? [],
        assistMinutes: stat.assistMinutes ?? [],
        enteredBy: session.sub,
        updatedAt: FieldValue.serverTimestamp(),
      }

      if (existing) {
        batch.update(existing.ref, payload)
      } else {
        const ref = db.collection('match_player_stats').doc()
        batch.set(ref, { ...payload, createdAt: FieldValue.serverTimestamp() })
      }
    }
    await batch.commit()

    await writeAuditLog(db, {
      action: 'bulk_update_stats',
      entityType: 'match_player_stat',
      entityId: matchId,
      summary: `Updated ${parsed.data.stats.length} player stat rows for match vs ${match.opponent}`,
      actor: session.sub,
      actorRole: session.role,
    })

    revalidateGames()
    return Response.json({ ok: true, count: parsed.data.stats.length })
  })
}
