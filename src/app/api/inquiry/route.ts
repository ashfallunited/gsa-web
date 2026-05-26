import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'
import { inquirySchema } from '@/lib/schemas'
import { revalidateInquiries } from '@/lib/revalidate'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = inquirySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const data = parsed.data

  await getAdminDb().collection('inquiries').add({
    inquiryType: data.inquiryType,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim() ?? '',
    organization: data.organization?.trim() ?? '',
    message: data.message.trim(),
    availability: data.availability ?? '',
    skills: data.skills ?? [],
    experience: data.experience?.trim() ?? '',
    partnershipType: data.partnershipType?.trim() ?? '',
    proposedCollaboration: data.proposedCollaboration?.trim() ?? '',
    website: data.website?.trim() ?? '',
    submittedAt: FieldValue.serverTimestamp(),
    read: false,
  })

  revalidateInquiries()

  return Response.json(
    {
      success: true,
      message:
        data.inquiryType === 'volunteer'
          ? 'Thank you for your interest in volunteering. We will be in touch soon.'
          : 'Thank you for your partnership inquiry. Our team will review and respond shortly.',
    },
    { status: 200 }
  )
}
