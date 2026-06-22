import { NextRequest, NextResponse } from 'next/server'
import type { DonationInput, DonationResponse } from '@/types/donation'
import { saveDonationToFirestore } from '@/lib/donation/firestore'
import { saveDonationToSupabase } from '@/lib/donation/supabase'
import { dollr } from '@/lib/donation/dollr'
import { MIN_DONATION_USD } from '@/lib/donation/constants'
import { COUNTRIES } from '@/lib/country-data'

/**
 * Validates a single email address
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates donation input and returns field errors if any
 */
function validateDonationInput(input: DonationInput): Record<string, string> | null {
  const errors: Record<string, string> = {}

  // Validate firstName
  if (!input.firstName || typeof input.firstName !== 'string' || input.firstName.trim() === '') {
    errors.firstName = 'First name is required'
  }

  // Validate lastName
  if (!input.lastName || typeof input.lastName !== 'string' || input.lastName.trim() === '') {
    errors.lastName = 'Last name is required'
  }

  // Validate email
  if (!input.email || typeof input.email !== 'string' || input.email.trim() === '') {
    errors.email = 'Email is required'
  } else if (!validateEmail(input.email)) {
    errors.email = 'Email format is invalid'
  }

  // Validate country
  if (!input.country || typeof input.country !== 'string') {
    errors.country = 'Country is required'
  } else {
    const countryExists = COUNTRIES.some((c) => c.code === input.country)
    if (!countryExists) {
      errors.country = 'Invalid country selection'
    }
  }

  // Validate amountUsd
  if (typeof input.amountUsd !== 'number' || isNaN(input.amountUsd)) {
    errors.amountUsd = 'Amount must be a valid number'
  } else if (input.amountUsd < MIN_DONATION_USD) {
    errors.amountUsd = `Minimum donation is $${MIN_DONATION_USD}`
  }

  // Validate paymentMethod
  if (!input.paymentMethod || !['card', 'mobile'].includes(input.paymentMethod)) {
    errors.paymentMethod = 'Invalid payment method'
  }

  // Validate coverFees
  if (typeof input.coverFees !== 'boolean') {
    errors.coverFees = 'Cover fees must be a boolean'
  }

  // Validate phone
  if (!input.phone || typeof input.phone !== 'string' || input.phone.trim() === '') {
    errors.phone = 'Phone number is required'
  }

  return Object.keys(errors).length > 0 ? errors : null
}

/**
 * Extracts the client's IP address from the request
 */
function getClientIpAddress(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const clientIp = req.headers.get('x-client-ip')
  if (clientIp) {
    return clientIp
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback: try to get from connection info if available
  return 'unknown'
}

/**
 * POST /api/donations/create
 * Creates a donation record and initiates payment with Dollr
 */
export async function POST(req: NextRequest): Promise<NextResponse<DonationResponse>> {
  try {
    // Parse request body
    let input: DonationInput
    try {
      input = await req.json()
    } catch (_error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
        },
        { status: 400 }
      )
    }

    // Validate input
    const validationErrors = validateDonationInput(input)
    if (validationErrors) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          fields: validationErrors,
        },
        { status: 400 }
      )
    }

    // Get IP address
    const ipAddress = getClientIpAddress(req)

    // Calculate fees
    const feeUsd = input.coverFees ? Math.round(input.amountUsd * 0.029 * 100) / 100 : 0
    const totalUsd = input.amountUsd + feeUsd

    // Call Dollr API to create checkout
    let referenceId: string
    try {
      const fullName = `${input.firstName} ${input.lastName}`
      referenceId = await dollr.createCheckout(totalUsd, input.email, fullName)
    } catch (error) {
      console.error('Dollr API error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to initiate payment. Please try again.',
        },
        { status: 500 }
      )
    }

    // Save to Firestore (primary storage)
    let donationId: string
    try {
      donationId = await saveDonationToFirestore(input, ipAddress, referenceId)
    } catch (error) {
      console.error('Firestore save error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create donation record. Please try again.',
        },
        { status: 500 }
      )
    }

    // Save to Supabase (secondary storage, non-blocking)
    // If it fails, we log it but don't fail the overall request since Firestore is primary
    try {
      await saveDonationToSupabase(input, ipAddress, referenceId, donationId)
    } catch (error) {
      console.warn('Supabase save error (non-fatal):', error)
      // Continue - Firestore write succeeded, which is what matters
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        donationId,
        status: 'pending',
        paymentUrl: undefined, // Dollr returns reference ID, actual payment URL is retrieved separately
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/donations/create:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    )
  }
}
