import { NextRequest, NextResponse } from 'next/server'
import { dollr } from '@/lib/donation/dollr'

interface PredictionRequest {
  amountUsd: number
  targetCurrency: 'USD' | 'LRD'
  paymentProvider: string
  coverFees: boolean
}

interface PredictionResponse {
  amountUsd: number
  targetCurrency: string
  payerAmount: number
  payerCurrency: string
  platformFee: number
  gatewayFee: number
  fxFee: number
  totalFee: number
  message: string
}

/**
 * POST /api/donations/predict-amount
 * Gets predictions for amount and fees in target currency
 */
export async function POST(req: NextRequest): Promise<NextResponse<PredictionResponse | { error: string }>> {
  try {
    const body = (await req.json()) as PredictionRequest

    const { amountUsd, targetCurrency, paymentProvider, coverFees } = body

    if (!amountUsd || amountUsd < 1) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (!targetCurrency || !['USD', 'LRD'].includes(targetCurrency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }

    if (!paymentProvider) {
      return NextResponse.json({ error: 'Payment provider required' }, { status: 400 })
    }

    // If target is USD, just return the amount with basic fee calculation
    if (targetCurrency === 'USD') {
      const feeUsd = coverFees ? Math.round(amountUsd * 0.029 * 100) / 100 : 0
      return NextResponse.json({
        amountUsd,
        targetCurrency: 'USD',
        payerAmount: amountUsd + feeUsd,
        payerCurrency: 'USD',
        platformFee: 0,
        gatewayFee: 0,
        fxFee: 0,
        totalFee: feeUsd,
        message: `You'll pay $${(amountUsd + feeUsd).toFixed(2)} USD`,
      })
    }

    // For LRD, call Dollr predictions API
    try {
      const token = await dollr.getAccessToken()
      const BASE_URL = 'https://api.heydollr.app'

      const response = await fetch(`${BASE_URL}/v1/predictions/amount-and-fees`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // @ts-ignore - fetch doesn't support params in native Node.js, so we construct the URL
      })

      // Construct URL with query params manually
      const params = new URLSearchParams({
        base_amount: amountUsd.toString(),
        base_currency: 'USD',
        target_currency: 'LRD',
        payment_method: paymentProvider,
        operation_type: 'COLLECTION',
        fee_bearer: coverFees ? 'PAYER' : 'PAYEE',
      })

      const predictionResponse = await fetch(`${BASE_URL}/v1/predictions/amount-and-fees?${params}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!predictionResponse.ok) {
        const errorData = await predictionResponse.text()
        console.error('[Predictions] Dollr error:', errorData)
        // Fall back to basic calculation
        const feeUsd = coverFees ? Math.round(amountUsd * 0.029 * 100) / 100 : 0
        // Rough estimate: 1 USD ≈ 1750 LRD
        const estimatedLrd = Math.round((amountUsd + feeUsd) * 1750)
        return NextResponse.json({
          amountUsd,
          targetCurrency: 'LRD',
          payerAmount: estimatedLrd,
          payerCurrency: 'LRD',
          platformFee: 0,
          gatewayFee: 0,
          fxFee: 0,
          totalFee: 0,
          message: `Approximately ₺${estimatedLrd.toLocaleString()} LRD (estimated)`,
        })
      }

      const prediction: any = await predictionResponse.json()

      return NextResponse.json({
        amountUsd,
        targetCurrency: 'LRD',
        payerAmount: Math.round(prediction.payer_amount || 0),
        payerCurrency: prediction.payer_currency || 'LRD',
        platformFee: Math.round(prediction.platform_fee || 0),
        gatewayFee: Math.round(prediction.gateway_fee || 0),
        fxFee: Math.round(prediction.fx_fee || 0),
        totalFee:
          Math.round(prediction.platform_fee || 0) +
          Math.round(prediction.gateway_fee || 0) +
          Math.round(prediction.fx_fee || 0),
        message: `You'll pay ₺${Math.round(prediction.payer_amount || 0).toLocaleString()} LRD`,
      })
    } catch (dollrError) {
      console.error('[Predictions] Error calling Dollr:', dollrError)
      // Return fallback estimate
      const feeUsd = coverFees ? Math.round(amountUsd * 0.029 * 100) / 100 : 0
      const estimatedLrd = Math.round((amountUsd + feeUsd) * 1750)
      return NextResponse.json({
        amountUsd,
        targetCurrency: 'LRD',
        payerAmount: estimatedLrd,
        payerCurrency: 'LRD',
        platformFee: 0,
        gatewayFee: 0,
        fxFee: 0,
        totalFee: 0,
        message: `Approximately ₺${estimatedLrd.toLocaleString()} LRD (estimated)`,
      })
    }
  } catch (error) {
    console.error('[Predictions] Error:', error)
    return NextResponse.json({ error: 'Failed to get prediction' }, { status: 500 })
  }
}
