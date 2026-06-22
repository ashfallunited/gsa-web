/**
 * Hey Dollr API Client
 * Handles payment processing for donations via Hey Dollr
 */

interface TokenResponse {
  access_token: string
  expires_in: number
}

interface CheckoutCreateResponse {
  checkout_id: string
}

interface SessionCheckoutResponse {
  reference_id: string
}

export interface StatusResponse {
  reference_id: string
  status: string
  payer_amount: number
  payee_amount: number
  operation_type: string
}

interface CachedToken {
  token: string
  expiresAt: number
}

export class HeyDollrClient {
  private clientId: string
  private clientSecret: string
  private baseUrl = 'https://dollr-open-api-35531319888.us-central1.run.app/v1'
  private cachedToken: CachedToken | null = null

  constructor() {
    this.clientId = process.env.HEYDOLLR_CLIENT_ID || ''
    this.clientSecret = process.env.HEYDOLLR_CLIENT_SECRET || ''

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'Hey Dollr credentials are missing. Please set HEYDOLLR_CLIENT_ID and HEYDOLLR_CLIENT_SECRET environment variables.'
      )
    }
  }

  /**
   * Get access token from Hey Dollr API
   * Caches token until 1 minute before expiry
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now()

    // Return cached token if still valid (with 1 minute buffer)
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60000) {
      return this.cachedToken.token
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/jwt/client/obtain/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
          body: JSON.stringify({
            client_id: this.clientId,
            client_secret: this.clientSecret,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = (await response.json()) as TokenResponse
      const expiresAt = now + (data.expires_in * 1000)

      this.cachedToken = {
        token: data.access_token,
        expiresAt,
      }

      return data.access_token
    } catch (error) {
      throw new Error(
        `Failed to get token: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Create a checkout and session for payment
   */
  async createCheckout(
    amountUsd: number,
    email: string,
    name: string
  ): Promise<string> {
    const token = await this.getAccessToken()
    const amountCents = Math.round(amountUsd * 100)

    try {
      // Step 1: Create checkout
      const checkoutResponse = await fetch(`${this.baseUrl}/checkouts/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          items: [
            {
              name: 'Donation',
              amount: amountCents,
              quantity: 1,
            },
          ],
          currency: 'USD',
        }),
      })

      if (!checkoutResponse.ok) {
        throw new Error(`HTTP ${checkoutResponse.status}`)
      }

      const checkoutData =
        (await checkoutResponse.json()) as CheckoutCreateResponse

      // Step 2: Create session
      const sessionResponse = await fetch(
        `${this.baseUrl}/sessions/checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-API-Key': this.apiKey,
          },
          body: JSON.stringify({
            checkout_id: checkoutData.checkout_id,
            payer_email: email,
            payer_name: name,
          }),
        }
      )

      if (!sessionResponse.ok) {
        throw new Error(`HTTP ${sessionResponse.status}`)
      }

      const sessionData =
        (await sessionResponse.json()) as SessionCheckoutResponse
      return sessionData.reference_id
    } catch (error) {
      throw new Error(
        `Failed to create checkout: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get payment status by reference ID
   */
  async getPaymentStatus(referenceId: string): Promise<StatusResponse> {
    const token = await this.getAccessToken()

    try {
      const response = await fetch(
        `${this.baseUrl}/status/collection/${referenceId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-API-Key': this.apiKey,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = (await response.json()) as StatusResponse
      return data
    } catch (error) {
      throw new Error(
        `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

export const heyDollr = new HeyDollrClient()
export { HeyDollrClient }
