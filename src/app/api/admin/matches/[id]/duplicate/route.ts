import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { runAnalyticsWriteApi } from '@/lib/admin-api'
import { writeAuditLog } from '@/lib/analytics/audit'
import { parseMatch, parseStat } from '@/lib/data/games'
import { revalidateGames } from '@/lib/revalidate'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const sourceRef = db.collection('matches').doc(id)
    const sourceDoc = await sourceRef.get()
    if (!sourceDoc.exists) {
      return Response.json({ error: 'Match not found' }, { status: 404 })
    }

    const source = parseMatch(sourceDoc.id, sourceDoc.data() as Record<string, unknown>)
    const statsSnap = await db.collection('match_player_stats').where('matchId', '==', id).get()
    const sourceStats = statsSnap.docs.map((d) => parseStat(d.id, d.data() as Record<string, unknown>))

    const newMatchRef = await db.collection('matches').add({
      team: source.team,
      season: source.season,
      competition: source.competition,
      date: source.date,
      opponent: '',
      homeAway: source.homeAway,
      goalsFor: 0,
      goalsAgainst: 0,
      status: 'draft',
      notes: source.notes ? `Duplicated from ${source.opponent} (${source.date}). ${source.notes}` : `Duplicated from ${source.opponent} (${source.date}).`,
      createdBy: session.sub,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    for (const stat of sourceStats) {
      await db.collection('match_player_stats').add({
        matchId: newMatchRef.id,
        playerId: stat.playerId,
        started: stat.started,
        minutes: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        notes: '',
        enteredBy: session.sub,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    await writeAuditLog(db, {
      action: 'duplicate',
      entityType: 'match_duplicate',
      entityId: newMatchRef.id,
      summary: `Duplicated match template from ${source.opponent} (${source.date})`,
      actor: session.sub,
      actorRole: session.role,
      metadata: { sourceMatchId: id },
    })

    revalidateGames()
    return Response.json({ id: newMatchRef.id }, { status: 201 })
  })
}
