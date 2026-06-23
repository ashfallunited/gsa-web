import { NextRequest, NextResponse } from 'next/server'
import { getDonation } from '@/lib/donation/firestore'
import type { DonationStatus } from '@/types/donation'

const statusMessages: Record<DonationStatus, string> = {
  awaiting_payment: 'Awaiting payment confirmation...',
  processing: 'Processing your payment...',
  completed: 'Thank you! Your donation is complete.',
  failed: 'Payment failed. Please try again or contact support.',
}

interface StatusResponse {
  id: string
  status: DonationStatus
  amountUsd: number
  totalUsd: number
  message: string
  createdAt: unknown
}

/**
 * GET /api/donations/[id]/status
 * Retrieves the status of a donation for client polling
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StatusResponse | { error: string }>> {
  try {
    const { id: donationId } = await params

    // Validate donation ID is provided
    if (!donationId || typeof donationId !== 'string' || donationId.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid donation ID' },
        { status: 400 }
      )
    }

    // Retrieve donation from Firestore
    const donation = await getDonation(donationId)

    // Return 404 if donation not found
    if (!donation) {
      return NextResponse.json(
        { error: 'Donation not found' },
        { status: 404 }
      )
    }

    // Build response with status message
    const statusMessage = statusMessages[donation.status]

    const response: StatusResponse = {
      id: donation.id,
      status: donation.status,
      amountUsd: donation.amountUsd,
      totalUsd: donation.totalUsd,
      message: statusMessage,
      createdAt: donation.createdAt,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/donations/[id]/status:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve donation status' },
      { status: 500 }
    )
  }
}
