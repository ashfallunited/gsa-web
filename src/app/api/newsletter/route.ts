import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'
import { newsletterSchema } from '@/lib/schemas'
import { revalidateNewsletter } from '@/lib/revalidate'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = newsletterSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const email = parsed.data.email.trim().toLowerCase()
  const db = getAdminDb()

  const existing = await db
    .collection('newsletter_subscribers')
    .where('email', '==', email)
    .limit(1)
    .get()

  if (!existing.empty) {
    return Response.json(
      { success: true, message: 'You are already subscribed to the Asfall United newsletter.' },
      { status: 200 }
    )
  }

  await db.collection('newsletter_subscribers').add({
    email,
    source: parsed.data.source ?? 'website',
    subscribedAt: FieldValue.serverTimestamp(),
  })

  revalidateNewsletter()

  return Response.json(
    { success: true, message: 'You have been subscribed to the Asfall United newsletter.' },
    { status: 200 }
  )
}
