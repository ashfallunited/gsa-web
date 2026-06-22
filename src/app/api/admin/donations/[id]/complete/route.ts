import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getDonation, updateDonationStatus, markEmailSent } from '@/lib/donation/firestore'
import { updateSupabaseDonation, markEmailSentSupabase, logEmail } from '@/lib/donation/supabase'
import { sendThankYouEmail } from '@/lib/donation/email'

interface CompleteRequestBody {
  notes?: string
}

/**
 * POST /api/admin/donations/[id]/complete
 * Mark a donation as manually completed and optionally send thank-you email
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
    let body: CompleteRequestBody = {}
    try {
      body = await req.json()
    } catch {
      // Body is optional
    }

    const notes = body.notes

    // Get donation
    const donation = await getDonation(donationId)
    if (!donation) {
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 }
      )
    }

    // Update status in both databases
    await updateDonationStatus(donationId, 'completed', 'admin_complete', notes)
    await updateSupabaseDonation(donationId, 'completed', 'admin_complete', notes)

    // Send thank-you email if not already sent
    let emailSent = false
    if (!donation.emailSent) {
      const emailSuccess = await sendThankYouEmail(donation)
      if (emailSuccess) {
        // Mark as sent in both databases
        await markEmailSent(donationId)
        await markEmailSentSupabase(donationId)

        // Log the email
        await logEmail(
          donationId,
          'auto_thank_you',
          donation.email,
          `Thank You for Your Donation to ${process.env.ORG_NAME || 'GSA'}`
        )

        emailSent = true
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Donation marked as completed',
      emailSent,
    })
  } catch (error) {
    console.error('Error completing donation:', error)
    return NextResponse.json(
      { error: 'Failed to complete donation' },
      { status: 500 }
    )
  }
}
