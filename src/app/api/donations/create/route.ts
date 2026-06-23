import { NextRequest, NextResponse } from 'next/server'
import type { DonationInput, DonationResponse } from '@/types/donation'
import { saveDonationToFirestore } from '@/lib/donation/firestore'
import { saveDonationToSupabase } from '@/lib/donation/supabase'
import { dollr } from '@/lib/donation/dollr'
import { MIN_DONATION_USD } from '@/lib/donation/constants'
import { COUNTRIES } from '@/lib/country-data'
import { formatPhoneForDollr } from '@/lib/phone-formatter'
import { randomUUID } from 'crypto'

const BASE_URL = 'https://api.heydollr.app'

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

  if (!input.firstName?.trim()) {
    errors.firstName = 'First name is required'
  }

  if (!input.lastName?.trim()) {
    errors.lastName = 'Last name is required'
  }

  if (!input.email?.trim()) {
    errors.email = 'Email is required'
  } else if (!validateEmail(input.email)) {
    errors.email = 'Email format is invalid'
  }

  if (!input.country) {
    errors.country = 'Country is required'
  } else {
    const countryExists = COUNTRIES.some((c) => c.code === input.country)
    if (!countryExists) {
      errors.country = 'Invalid country selection'
    }
  }

  if (typeof input.amountUsd !== 'number' || isNaN(input.amountUsd)) {
    errors.amountUsd = 'Amount must be a valid number'
  } else if (input.amountUsd < MIN_DONATION_USD) {
    errors.amountUsd = `Minimum donation is $${MIN_DONATION_USD}`
  }

  if (!['card', 'mobile'].includes(input.paymentMethod)) {
    errors.paymentMethod = 'Invalid payment method'
  }

  if (typeof input.coverFees !== 'boolean') {
    errors.coverFees = 'Cover fees must be a boolean'
  }

  // Validate payment details
  if (input.paymentMethod === 'card') {
    if (!input.cardNumber?.replace(/\s/g, '')) {
      errors.cardNumber = 'Card number is required'
    }
    if (!input.cardExpiry) {
      errors.cardExpiry = 'Card expiry is required'
    }
    if (!input.cardCVV) {
      errors.cardCVV = 'Card CVV is required'
    }
  } else if (input.paymentMethod === 'mobile') {
    if (!input.mobilePhone) {
      errors.mobilePhone = 'Phone number is required'
    }
    if (!input.detectedProvider) {
      errors.detectedProvider = 'Provider could not be detected'
    }
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

  return 'unknown'
}

/**
 * POST /api/donations/create
 * Creates a donation and executes payment through Dollr
 */
export async function POST(req: NextRequest): Promise<NextResponse<DonationResponse>> {
  try {
    let input: DonationInput
    try {
      input = await req.json()
    } catch (_error) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Validate input
    const validationErrors = validateDonationInput(input)
    if (validationErrors) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', fields: validationErrors },
        { status: 400 }
      )
    }

    const ipAddress = getClientIpAddress(req)

    // Calculate fees
    const feeUsd = input.coverFees ? Math.round(input.amountUsd * 0.029 * 100) / 100 : 0
    const totalUsd = input.amountUsd + feeUsd

    // Get Dollr access token
    let token: string
    try {
      token = await dollr.getAccessToken()
    } catch (error) {
      console.error('Failed to get Dollr token:', error)
      return NextResponse.json(
        { success: false, error: 'Payment service unavailable' },
        { status: 503 }
      )
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    try {
      // Step 1: Create checkout source
      const checkoutResponse = await fetch(`${BASE_URL}/v1/checkouts/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: 'online',
          source_kind: 'ORDER',
          party_name: `${input.firstName} ${input.lastName}`,
          party_phone: input.paymentMethod === 'mobile' ? formatPhoneForDollr(input.mobilePhone!) : 'unknown',
          party_email: input.email,
          currency: 'USD',
          items: [
            {
              name: 'Donation',
              currency: 'USD',
              qty: 1,
              amount: totalUsd,
            },
          ],
        }),
      })

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.text()
        console.error('Checkout create error response:', errorData)
        throw new Error(`Checkout create failed: ${checkoutResponse.status} - ${errorData}`)
      }

      const checkoutData: any = await checkoutResponse.json()
      const sourceId = checkoutData.id

      // Step 2: Create checkout session
      const sessionResponse = await fetch(`${BASE_URL}/v1/sessions/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source_id: sourceId,
          source_type: 'ORDER',
        }),
      })

      if (!sessionResponse.ok) {
        throw new Error(`Session create failed: ${sessionResponse.status}`)
      }

      const sessionData: any = await sessionResponse.json()
      const sessionId = sessionData.id

      // Step 3: Create payment account
      let paymentAccountId: string
      if (input.paymentMethod === 'card') {
        const cardResponse = await fetch(
          `${BASE_URL}/v1/payment-accounts/create?operation_type=COLLECTION`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              account_name: `${input.firstName} Card`,
              provider: 'CARD_ONLINE',
              method: 'CARD_ONLINE',
              party_id: checkoutData.party_id,
              country_code: input.country,
              insensitive_account_number: input.cardNumber!.replace(/\s/g, ''),
              card_expiry_month: input.cardExpiry!.split('/')[0],
              card_expiry_year: '20' + input.cardExpiry!.split('/')[1],
              card_cvv: input.cardCVV!,
            }),
          }
        )

        if (!cardResponse.ok) {
          throw new Error(`Card account create failed: ${cardResponse.status}`)
        }

        const cardData: any = await cardResponse.json()
        paymentAccountId = cardData.id
      } else {
        // Mobile money
        const phoneFormatted = formatPhoneForDollr(input.mobilePhone!)
        const mobileResponse = await fetch(
          `${BASE_URL}/v1/payment-accounts/create?operation_type=COLLECTION`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              account_name: `${input.firstName} ${input.detectedProvider}`,
              provider: input.detectedProvider,
              method: input.detectedProvider,
              party_id: checkoutData.party_id,
              country_code: input.country,
              insensitive_account_number: phoneFormatted,
            }),
          }
        )

        if (!mobileResponse.ok) {
          throw new Error(`Mobile account create failed: ${mobileResponse.status}`)
        }

        const mobileData: any = await mobileResponse.json()
        paymentAccountId = mobileData.id
      }

      // Step 4: Execute collection
      const referenceId = randomUUID()
      const executionResponse = await fetch(`${BASE_URL}/v1/executions/collection`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: String(sessionId),
          payment_account_id: String(paymentAccountId),
          currency: 'USD',
          reference_id: referenceId,
        }),
      })

      if (!executionResponse.ok) {
        throw new Error(`Execution failed: ${executionResponse.status}`)
      }

      const executionData: any = await executionResponse.json()

      // Step 5: Save to Firestore
      let donationId: string
      try {
        donationId = await saveDonationToFirestore(
          { ...input, mobilePhone: input.paymentMethod === 'mobile' ? formatPhoneForDollr(input.mobilePhone!) : input.mobilePhone },
          ipAddress,
          referenceId
        )
      } catch (error) {
        console.error('Firestore save error:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to save donation' },
          { status: 500 }
        )
      }

      // Step 6: Save to Supabase (non-blocking)
      try {
        await saveDonationToSupabase(
          { ...input, mobilePhone: input.paymentMethod === 'mobile' ? formatPhoneForDollr(input.mobilePhone!) : input.mobilePhone },
          ipAddress,
          referenceId,
          donationId
        )
      } catch (error) {
        console.warn('Supabase save error (non-fatal):', error)
      }

      // Return success
      return NextResponse.json(
        {
          success: true,
          donationId,
          status: executionData.status || 'pending',
        },
        { status: 201 }
      )
    } catch (error) {
      console.error('Dollr API error:', error)
      return NextResponse.json(
        { success: false, error: 'Payment processing failed. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
