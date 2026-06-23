import { NextRequest, NextResponse } from 'next/server'
import { getDonation, updateDonationStatus } from '@/lib/donation/firestore'
import { getDonorFromFirestore } from '@/lib/donation/firestore-donors'
import { updateSupabaseDonation, logEmail } from '@/lib/donation/supabase'
import { sendThankYouEmail } from '@/lib/donation/email'
import { dollr } from '@/lib/donation/dollr'
import { DONATION_STATUS } from '@/lib/donation/constants'

interface CheckStatusResponse {
  id: string
  status: string
  updated: boolean
  message: string
}

/**
 * POST /api/donations/[id]/check-status
 * Checks Dollr status and updates donation if payment completed
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CheckStatusResponse | { error: string }>> {
  try {
    const { id: donationId } = await params

    if (!donationId || typeof donationId !== 'string' || donationId.trim() === '') {
      return NextResponse.json({ error: 'Invalid donation ID' }, { status: 400 })
    }

    // Get the donation
    const donation = await getDonation(donationId)
    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    // Check if already completed or failed
    if (donation.status === DONATION_STATUS.COMPLETED || donation.status === DONATION_STATUS.FAILED) {
      return NextResponse.json({
        id: donationId,
        status: donation.status,
        updated: false,
        message: `Donation already ${donation.status}`,
      })
    }

    // Check status with Dollr
    let dollrStatus: string
    try {
      const statusResponse = await dollr.getPaymentStatus(donation.referenceId)
      dollrStatus = statusResponse.status
      console.log(`[Check Status] Dollr status for ${donationId}: ${dollrStatus}`)
    } catch (error) {
      console.error(`[Check Status] Failed to get Dollr status for ${donationId}:`, error)
      return NextResponse.json({
        id: donationId,
        status: donation.status,
        updated: false,
        message: 'Could not reach payment provider',
      })
    }

    // If status didn't change, return current status
    if (dollrStatus === donation.dollrStatus) {
      return NextResponse.json({
        id: donationId,
        status: donation.status,
        updated: false,
        message: 'No status update from payment provider',
      })
    }

    // Status changed - update the donation
    console.log(`[Check Status] Updating donation ${donationId} from ${donation.status} to ${dollrStatus}`)

    try {
      await updateDonationStatus(donationId, dollrStatus as any, dollrStatus)
      await updateSupabaseDonation(donationId, dollrStatus as any, dollrStatus)

      // If completed, send thank you email
      if (dollrStatus === DONATION_STATUS.COMPLETED && !donation.emailSent) {
        try {
          const donor = await getDonorFromFirestore(donation.donorId)
          if (donor) {
            const emailSent = await sendThankYouEmail(donation, donor)
            if (emailSent) {
              // Mark as sent in both databases
              const markEmailSentFirestore = await import('@/lib/donation/firestore').then(
                (m) => m.markEmailSent
              )
              const markEmailSentSupabase = await import('@/lib/donation/supabase').then(
                (m) => m.markEmailSentSupabase
              )

              await markEmailSentFirestore(donationId)
              await markEmailSentSupabase(donationId)

              // Log the email
              await logEmail(
                donationId,
                'auto_thank_you',
                donor.email,
                `Thank You for Your Donation to ${process.env.ORG_NAME || 'GSA'}`
              )

              console.log(`[Check Status] Sent thank you email for ${donationId}`)
            }
          }
        } catch (emailError) {
          console.error(`[Check Status] Error sending email for ${donationId}:`, emailError)
        }
      }

      return NextResponse.json({
        id: donationId,
        status: dollrStatus,
        updated: true,
        message: `Status updated to ${dollrStatus}`,
      })
    } catch (updateError) {
      console.error(`[Check Status] Error updating donation ${donationId}:`, updateError)
      return NextResponse.json(
        { error: 'Failed to update donation status' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Check Status] Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
