import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin, getSession } from '@/lib/admin-auth'
import { getDonation } from '@/lib/donation/firestore'
import { logEmail } from '@/lib/donation/supabase'
import { sendCustomEmail } from '@/lib/donation/email'

interface EmailRequestBody {
  subject: string
  body: string
}

/**
 * POST /api/admin/donations/[id]/email
 * Send a custom email to a donor
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // Verify admin auth
  const denied = await requireAdmin(req)
  if (denied) return denied as NextResponse

  try {
    const { id: donationId } = await params

    // Parse request body
    let body: EmailRequestBody
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { subject, body: emailBody } = body

    // Validate required fields
    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: subject and body' },
        { status: 400 }
      )
    }

    // Get donation
    const donation = await getDonation(donationId)
    if (!donation) {
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 }
      )
    }

    // Send custom email
    const emailSuccess = await sendCustomEmail(donation.email, subject, emailBody)
    if (!emailSuccess) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // Get admin identifier from session
    const session = await getSession(req)
    const adminEmail = session?.sub || undefined

    // Log email
    await logEmail(donationId, 'admin_custom', donation.email, subject, adminEmail)

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    })
  } catch (error) {
    console.error('Error sending custom email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
