import { NextRequest, NextResponse } from 'next/server'
import {
  queryPendingDonations,
  updateDonationStatus,
  incrementRetryAttempts,
  markEmailSent,
} from '@/lib/donation/firestore'
import {
  updateSupabaseDonation,
  markEmailSentSupabase,
  logEmail,
} from '@/lib/donation/supabase'
import { dollr } from '@/lib/donation/dollr'
import { sendThankYouEmail } from '@/lib/donation/email'
import { RETRY_SCHEDULE_MINUTES, RETRY_EXPIRY_HOURS, DONATION_STATUS } from '@/lib/donation/constants'
import type { Donation } from '@/types/donation'

/**
 * POST /api/cron/sync-donations
 * Polls pending donations for payment status updates
 * Should be called every 2 minutes via Vercel Cron
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Step 1: Verify authentication
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET environment variable not set')
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[Cron] Missing or invalid authorization header')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7) // Remove "Bearer " prefix
    if (token !== cronSecret) {
      console.warn('[Cron] Invalid cron secret')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2: Log start
    console.log('[Cron] Starting donation status sync')

    // Step 3: Query pending donations
    let pendingDonations: Donation[] = []
    try {
      pendingDonations = await queryPendingDonations()
    } catch (error) {
      console.error('[Cron] Error querying pending donations:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to query pending donations', processed: 0 },
        { status: 500 }
      )
    }

    console.log(`[Cron] Found ${pendingDonations.length} pending donations`)

    // Step 4: Process each donation
    let processedCount = 0
    const now = new Date()

    for (const donation of pendingDonations) {
      try {
        // 4a: Get payment status from Dollr
        let paymentStatus: string
        try {
          const statusResponse = await dollr.getPaymentStatus(donation.referenceId)
          paymentStatus = statusResponse.status
        } catch (error) {
          // 4d: On error, check retry logic
          console.error(`[Cron] Error getting status for donation ${donation.id}:`, error)

          // Check if we should retry
          const createdAtDate = donation.createdAt instanceof Date
            ? donation.createdAt
            : donation.createdAt.toDate?.()

          if (!createdAtDate) {
            console.error(`[Cron] Cannot determine creation date for donation ${donation.id}`)
            continue
          }

          const ageHours = (now.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60)
          const canRetry =
            ageHours < RETRY_EXPIRY_HOURS &&
            donation.retryAttempts < RETRY_SCHEDULE_MINUTES.length

          if (canRetry) {
            // Schedule next retry
            const nextRetryMinutes = RETRY_SCHEDULE_MINUTES[donation.retryAttempts]
            const nextRetryDate = new Date(now.getTime() + nextRetryMinutes * 60 * 1000)

            try {
              await incrementRetryAttempts(donation.id, nextRetryDate)
              console.log(
                `[Cron] Scheduled retry for donation ${donation.id} in ${nextRetryMinutes} minutes`
              )
              processedCount++
            } catch (retryError) {
              console.error(`[Cron] Error scheduling retry for donation ${donation.id}:`, retryError)
            }
          } else {
            // Mark as failed
            try {
              await updateDonationStatus(donation.id, DONATION_STATUS.FAILED, 'retry_exhausted')
              await updateSupabaseDonation(donation.id, DONATION_STATUS.FAILED, 'retry_exhausted')
              console.log(`[Cron] Marked donation ${donation.id} as failed (retry exhausted)`)
              processedCount++
            } catch (failError) {
              console.error(`[Cron] Error marking donation ${donation.id} as failed:`, failError)
            }
          }
          continue
        }

        // 4b: Log status
        console.log(`[Cron] Donation ${donation.id}: ${paymentStatus}`)

        // 4c: Check if status changed
        if (paymentStatus !== donation.dollrStatus) {
          try {
            // Update Firestore
            await updateDonationStatus(donation.id, paymentStatus as any, paymentStatus)

            // Update Supabase
            await updateSupabaseDonation(donation.id, paymentStatus as any, paymentStatus)

            console.log(
              `[Cron] Updated donation ${donation.id} status from ${donation.dollrStatus} to ${paymentStatus}`
            )

            // If completed, send thank you email
            if (paymentStatus === DONATION_STATUS.COMPLETED) {
              try {
                const emailSent = await sendThankYouEmail(donation)

                if (emailSent) {
                  // Mark email as sent in both databases
                  await markEmailSent(donation.id)
                  await markEmailSentSupabase(donation.id)

                  // Log the email
                  await logEmail(
                    donation.id,
                    'auto_thank_you',
                    donation.email,
                    `Thank You for Your Donation to GSA`
                  )

                  console.log(`[Cron] Sent thank you email for donation ${donation.id}`)
                } else {
                  console.warn(`[Cron] Failed to send thank you email for donation ${donation.id}`)
                }
              } catch (emailError) {
                console.error(`[Cron] Error sending email for donation ${donation.id}:`, emailError)
                // Don't fail the whole sync if email fails - donation status was already updated
              }
            }

            processedCount++
          } catch (updateError) {
            console.error(`[Cron] Error updating donation ${donation.id}:`, updateError)
          }
        } else {
          // Status unchanged, but still count it as processed
          processedCount++
        }
      } catch (donationError) {
        console.error(`[Cron] Unexpected error processing donation ${donation.id}:`, donationError)
      }
    }

    // Step 5: Return success response
    console.log(`[Cron] Completed donation status sync. Processed: ${processedCount}/${pendingDonations.length}`)

    return NextResponse.json(
      {
        success: true,
        processed: processedCount,
        total: pendingDonations.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Cron] Unexpected error in POST /api/cron/sync-donations:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred', processed: 0 },
      { status: 500 }
    )
  }
}
