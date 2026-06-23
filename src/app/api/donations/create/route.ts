import { NextRequest, NextResponse } from 'next/server'
import type { DonationInput, DonationResponse } from '@/types/donation'
import { saveDonationToFirestore } from '@/lib/donation/firestore'
import { saveDonorToFirestore } from '@/lib/donation/firestore-donors'
import { saveDonationToSupabase } from '@/lib/donation/supabase'
import { saveDonorToSupabase } from '@/lib/donation/supabase-donors'
import { dollr } from '@/lib/donation/dollr'
import { MIN_DONATION_USD, DONATION_STATUS } from '@/lib/donation/constants'
import { COUNTRIES } from '@/lib/country-data'
import { formatPhoneForDollr, extractCountryCodeFromPhone } from '@/lib/phone-formatter'
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
      const isCardPayment = input.paymentMethod === 'card'
      const checkoutMode = isCardPayment ? 'HOSTED' : 'DIRECT'

      // Format party phone: use donor's phone for cards, mobile phone for mobile money
      const partyPhone = isCardPayment
        ? formatPhoneForDollr(input.phone)
        : formatPhoneForDollr(input.mobilePhone!)

      // Validate that we have a valid phone number
      if (!partyPhone || partyPhone.length < 8) {
        return NextResponse.json(
          { success: false, error: 'Valid phone number required' },
          { status: 400 }
        )
      }

      const checkoutBody = {
        mode: checkoutMode,
        source_kind: 'ORDER',
        party_name: `${input.firstName} ${input.lastName}`,
        party_phone: partyPhone,
        party_email: input.email,
        currency: 'USD',
        items: [
          {
            name: 'Donation',
            currency: 'USD',
            amount: totalUsd,
          },
        ],
        ...(isCardPayment && {
          success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/donation-success`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/donate`,
        }),
      }

      const checkoutResponse = await fetch(`${BASE_URL}/v1/checkouts/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(checkoutBody),
      })

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.text()
        console.error('Checkout create error response:', errorData)
        throw new Error(`Checkout create failed: ${checkoutResponse.status} - ${errorData}`)
      }

      const checkoutData: any = await checkoutResponse.json()
      const sourceId = checkoutData.source_id

      // For HOSTED mode (card), return the payment URL for redirect immediately
      if (isCardPayment) {
        console.log('[Donations] HOSTED checkout response:', JSON.stringify(checkoutData, null, 2))

        // Extract payment URL
        const paymentUrl = checkoutData.url || checkoutData.payment_url || checkoutData.checkout_url
        console.log('[Donations] Payment URL:', paymentUrl)

        // Generate a temporary donation ID for the response
        const tempDonationId = `temp-${sourceId}`

        // NOTE: We skip saving to database for card payments. The donation will be saved
        // only after the webhook confirms payment from Dollr.

        return NextResponse.json(
          {
            success: true,
            donationId: tempDonationId,
            status: 'awaiting_payment',
            paymentUrl: paymentUrl,
          },
          { status: 201 }
        )
      }

      // Step 2: Create checkout session (for DIRECT mode - mobile money)
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
        const phoneFormatted = formatPhoneForDollr(input.phone)
        const countryCodeFromPhone = extractCountryCodeFromPhone(phoneFormatted)
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
              country_code: countryCodeFromPhone || input.country,
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
        const countryCodeFromPhone = extractCountryCodeFromPhone(phoneFormatted)
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
              country_code: countryCodeFromPhone || input.country,
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

      // Step 4.5: For mobile money, check payment status immediately
      let initialPaymentStatus = executionData.status || DONATION_STATUS.AWAITING_PAYMENT
      if (input.paymentMethod === 'mobile') {
        try {
          const statusResponse = await dollr.getPaymentStatus(referenceId)
          initialPaymentStatus = statusResponse.status
          console.log('[Donations] Immediate status check for mobile money:', initialPaymentStatus)
        } catch (statusError) {
          console.warn('[Donations] Could not check status immediately for mobile money:', statusError)
          // Fall back to execution status
        }
      }

      // Step 5: Save donor to Firestore and Supabase
      let donorId: string
      try {
        donorId = await saveDonorToFirestore(
          input.firstName,
          input.lastName,
          input.email,
          input.phone,
          input.country
        )
      } catch (error) {
        console.error('Error saving donor to Firestore:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to save donor information' },
          { status: 500 }
        )
      }

      // Save donor to Supabase (non-blocking)
      try {
        await saveDonorToSupabase(
          input.firstName,
          input.lastName,
          input.email,
          input.phone,
          input.country
        )
      } catch (error) {
        console.warn('Supabase donor save error (non-fatal):', error)
      }

      // Step 6: Save donation to Firestore
      let donationId: string
      try {
        donationId = await saveDonationToFirestore(
          donorId,
          input.amountUsd,
          input.paymentMethod,
          input.coverFees,
          ipAddress,
          referenceId,
          input.message
        )
      } catch (error) {
        console.error('Firestore donation save error:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to save donation' },
          { status: 500 }
        )
      }

      // Step 7: Save donation to Supabase (non-blocking)
      try {
        await saveDonationToSupabase(
          donationId,
          donorId,
          input.amountUsd,
          input.paymentMethod,
          input.coverFees,
          ipAddress,
          referenceId,
          input.message
        )
      } catch (error) {
        console.warn('Supabase save error (non-fatal):', error)
      }

      // Return success
      return NextResponse.json(
        {
          success: true,
          donationId,
          status: initialPaymentStatus,
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
