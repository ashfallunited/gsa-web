import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { runAdminApiWithDb } from '@/lib/admin-api'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { sortPlayersByPosition, type SortablePlayer } from '@/lib/player-sort'
import { normalizeTeamSlug, playerMatchesTeamFilter } from '@/lib/teams'
import { revalidateTeam } from '@/lib/revalidate'

export async function GET(req: NextRequest) {
  return runAdminApiWithDb(req, async (db) => {
    const team = req.nextUrl.searchParams.get('team')
    const snap = await db.collection('players').get()
    let players = snap.docs.map((d) => ({
      id: d.id,
      ...serializeFirestoreData(d.data() as Record<string, unknown>),
    }))
    if (team) {
      players = players.filter((p) =>
        playerMatchesTeamFilter((p as Record<string, unknown>).team as string | undefined, team)
      )
    }
    return Response.json({ players: sortPlayersByPosition(players as SortablePlayer[]) })
  })
}

export async function POST(req: NextRequest) {
  return runAdminApiWithDb(req, async (db) => {
    const body = await req.json()
    const ref = await db.collection('players').add({
      name: body.name ?? '',
      number: body.number ?? 0,
      position: body.position ?? 'midfielder',
      team: normalizeTeamSlug(body.team ?? 'first-team'),
      image: body.image ?? '',
      order: body.order ?? 99,
      createdAt: FieldValue.serverTimestamp(),
    })

    revalidateTeam()
    return Response.json({ id: ref.id }, { status: 201 })
  })
}
