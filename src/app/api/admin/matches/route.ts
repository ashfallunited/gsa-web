import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { runAnalyticsReadApi, runAnalyticsWriteApi } from '@/lib/admin-api'
import { writeAuditLog } from '@/lib/analytics/audit'
import { saveAnalyticsLookups } from '@/lib/analytics/lookups'
import { parseMatch } from '@/lib/data/games'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { matchInputSchema } from '@/lib/schemas/analytics'
import { normalizeTeamSlug, playerMatchesTeamFilter } from '@/lib/teams'
import { revalidateGames } from '@/lib/revalidate'

export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const team = req.nextUrl.searchParams.get('team')
    const season = req.nextUrl.searchParams.get('season')
    const status = req.nextUrl.searchParams.get('status')
    const competition = req.nextUrl.searchParams.get('competition')

    const snap = await db.collection('matches').get()
    let matches = snap.docs.map((d) => parseMatch(d.id, d.data() as Record<string, unknown>))

    if (team && team !== 'all') {
      matches = matches.filter((m) => playerMatchesTeamFilter(m.team, team))
    }
    if (season) {
      matches = matches.filter((m) => m.season === season)
    }
    if (status === 'draft' || status === 'final') {
      matches = matches.filter((m) => m.status === status)
    }
    if (competition) {
      matches = matches.filter((m) => m.competition.toLowerCase() === competition.toLowerCase())
    }

    matches.sort((a, b) => b.date.localeCompare(a.date))

    const seasons = [...new Set(matches.map((m) => m.season))].sort().reverse()
    const competitions = [...new Set(matches.map((m) => m.competition))].sort()

    return Response.json({ matches, seasons, competitions })
  })
}

function generateMatchSlug(opponent: string, date: string, shortId: string): string {
  const opponentSlug = opponent
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `vs-${opponentSlug}-${date}-${shortId}`
}

export async function POST(req: NextRequest) {
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const body = await req.json().catch(() => null)
    const parsed = matchInputSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    // Get a ref with the ID before writing so we can embed it in the slug
    const ref = db.collection('matches').doc()
    const slug = generateMatchSlug(data.opponent, data.date, ref.id.slice(0, 6).toLowerCase())

    await ref.set({
      ...data,
      team: normalizeTeamSlug(data.team),
      notes: data.notes ?? '',
      slug,
      createdBy: session.sub,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog(db, {
      action: 'create',
      entityType: 'match',
      entityId: ref.id,
      summary: `Created match vs ${data.opponent} (${data.date})`,
      actor: session.sub,
      actorRole: session.role,
    })

    await saveAnalyticsLookups(db, data.team, {
      opponent: data.opponent,
      competition: data.competition,
      season: data.season,
    })

    revalidateGames()
    return Response.json({ id: ref.id }, { status: 201 })
  })
}
