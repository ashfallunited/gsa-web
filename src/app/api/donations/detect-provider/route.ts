import { NextRequest, NextResponse } from 'next/server'
import { dollr } from '@/lib/donation/dollr'

/**
 * GET /api/donations/detect-provider?phone=...
 * Detects the mobile money provider (MTN, Orange, etc.) from a phone number using Dollr API
 */
export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone')

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Call Dollr predictions API to detect provider
    try {
      const token = await dollr.getAccessToken()

      const response = await fetch(
        `https://api.heydollr.app/v1/predictions/mmo-provider-info?phone=${encodeURIComponent(phone)}&operation_type=COLLECTION`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        console.error('Dollr prediction error:', response.status, response.statusText)
        return NextResponse.json(
          { error: 'Failed to detect provider' },
          { status: response.status }
        )
      }

      const data = await response.json()
      return NextResponse.json({
        provider: data.gateway_provider,
        method: data.payment_method,
      })
    } catch (error) {
      console.error('Dollr API error:', error)
      return NextResponse.json(
        { error: 'Failed to detect provider' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Provider detection error:', error)
    return NextResponse.json(
      { error: 'Failed to detect provider' },
      { status: 500 }
    )
  }
}
