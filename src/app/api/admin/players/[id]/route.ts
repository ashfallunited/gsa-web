import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { runAdminApiWithDb } from '@/lib/admin-api'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { normalizeTeamSlug } from '@/lib/teams'
import { revalidateTeam } from '@/lib/revalidate'
import { playerUpdateSchema } from '@/lib/schemas'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return runAdminApiWithDb(req, async (db) => {
    const snap = await db.collection('players').doc(id).get()
    if (!snap.exists) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({
      id: snap.id,
      ...serializeFirestoreData(snap.data() as Record<string, unknown>),
    })
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return runAdminApiWithDb(req, async (db) => {
    const body = await req.json().catch(() => null)
    const parsed = playerUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { team, source, showOnSite, injury, ...rest } = parsed.data
    const updates: Record<string, unknown> = {
      ...rest,
      updatedAt: FieldValue.serverTimestamp(),
    }
    // Only touch source/showOnSite when explicitly sent — avoids accidentally
    // promoting trial players when the caller only meant to update injury/other fields.
    if (source !== undefined) {
      const nextSource = source === 'trial' ? 'trial' : 'official'
      updates.source = nextSource
      updates.showOnSite = nextSource === 'trial' ? false : (showOnSite ?? true)
    } else if (showOnSite !== undefined) {
      updates.showOnSite = showOnSite
    }
    if (injury === null) {
      updates.injury = FieldValue.delete()
    } else if (injury !== undefined) {
      updates.injury = injury
    }
    if (typeof team === 'string') {
      updates.team = normalizeTeamSlug(team)
    }

    await db.collection('players').doc(id).update(updates)
    revalidateTeam()
    return Response.json({ ok: true })
  })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return runAdminApiWithDb(req, async (db) => {
    await db.collection('players').doc(id).delete()
    revalidateTeam()
    return Response.json({ ok: true })
  })
}
