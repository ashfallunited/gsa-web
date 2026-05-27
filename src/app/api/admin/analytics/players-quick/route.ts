import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { runAnalyticsWriteApi } from '@/lib/admin-api'
import { writeAuditLog } from '@/lib/analytics/audit'
import { normalizeTeamSlug } from '@/lib/teams'
import { revalidateTeam } from '@/lib/revalidate'

const quickPlayerSchema = z.object({
  name: z.string().min(1).max(120),
  number: z.number().int().min(0).max(99),
  position: z.enum(['goalkeeper', 'defender', 'midfielder', 'forward']),
  team: z.string().min(1),
})

/** Analysts can add squad players for stat entry without full admin access. */
export async function POST(req: NextRequest) {
  return runAnalyticsWriteApi(req, async ({ session, db }) => {
    const body = await req.json().catch(() => null)
    const parsed = quickPlayerSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    const ref = await db.collection('players').add({
      name: data.name.trim(),
      number: data.number,
      position: data.position,
      team: normalizeTeamSlug(data.team),
      image: '',
      order: 99,
      showOnSite: false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: session.sub,
      source: 'trial',
    })

    await writeAuditLog(db, {
      action: 'create_player',
      entityType: 'match_player_stat',
      entityId: ref.id,
      summary: `Added squad player ${data.name} (#${data.number})`,
      actor: session.sub,
      actorRole: session.role,
    })

    revalidateTeam()
    return Response.json({ id: ref.id, ...data, team: normalizeTeamSlug(data.team) }, { status: 201 })
  })
}
