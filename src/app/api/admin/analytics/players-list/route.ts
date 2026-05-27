import { NextRequest } from 'next/server'
import { runAnalyticsReadApi } from '@/lib/admin-api'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { sortPlayersByPosition, type SortablePlayer } from '@/lib/player-sort'
import { normalizeTeamSlug, playerMatchesTeamFilter } from '@/lib/teams'

/** Read-only player list for analytics lineup selection. */
export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const team = req.nextUrl.searchParams.get('team')
    const snap = await db.collection('players').get()
    let players = snap.docs.map((d) => ({
      id: d.id,
      ...serializeFirestoreData(d.data() as Record<string, unknown>),
    }))
    if (team && team !== 'all') {
      players = players.filter((p) =>
        playerMatchesTeamFilter((p as Record<string, unknown>).team as string | undefined, team)
      )
    }
    return Response.json({
      players: sortPlayersByPosition(
        players.map((p) => ({
          ...p,
          team: normalizeTeamSlug((p as Record<string, unknown>).team as string | undefined),
        })) as SortablePlayer[]
      ),
    })
  })
}
