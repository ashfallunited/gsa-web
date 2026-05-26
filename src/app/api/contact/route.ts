import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'
import { contactSchema } from '@/lib/schemas'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { firstName, lastName, email, message, phone } = parsed.data

  await getAdminDb().collection('contacts').add({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() ?? '',
    message: message.trim(),
    submittedAt: FieldValue.serverTimestamp(),
    read: false,
  })

  return Response.json(
    { success: true, message: 'Your message has been received. We will be in touch shortly.' },
    { status: 200 }
  )
}
