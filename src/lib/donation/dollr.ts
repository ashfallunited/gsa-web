/**
 * Dollr API Client
 * Handles payment processing for donations via Dollr
 */

interface TokenResponse {
  access_token: string
  expires_in: number
}

interface CheckoutSourceResponse {
  id: string
  type: string
}

interface SessionCheckoutResponse {
  id: string
  reference_id: string
  status: string
  expires_at: string
}

interface ExecutionResponse {
  reference_id: string
  status: string
  payer_amount: number
  payee_amount: number
  operation_type: string
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

export class DollrClient {
  private clientId: string
  private clientSecret: string
  private baseUrl = 'https://dollr-open-api-35531319888.us-central1.run.app/v1'
  private cachedToken: CachedToken | null = null

  constructor() {
    this.clientId = process.env.DOLLR_CLIENT_ID || ''
    this.clientSecret = process.env.DOLLR_CLIENT_SECRET || ''
  }

  private validateCredentials(): void {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'Dollr credentials are missing. Please set DOLLR_CLIENT_ID and DOLLR_CLIENT_SECRET environment variables.'
      )
    }
  }

  /**
   * Get access token from Dollr API
   * Caches token until 1 minute before expiry
   */
  async getAccessToken(): Promise<string> {
    this.validateCredentials()
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
   * Create a donation invoice and return reference ID for payment tracking
   * Implements Dollr's 3-step payment flow: source → session → execution
   */
  async createCheckout(
    amountUsd: number,
    email: string,
    name: string
  ): Promise<string> {
    const token = await this.getAccessToken()
    const amountCents = Math.round(amountUsd * 100)

    try {
      // Step 1: Create invoice source
      const sourceResponse = await fetch(`${this.baseUrl}/checkouts/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: 'online',
          source_kind: 'invoice',
          party_phone: 'unknown', // Required by API
          party_email: email,
          party_name: name,
          currency: 'USD',
          items: [
            {
              name: 'Donation',
              amount: amountCents,
              quantity: 1,
            },
          ],
        }),
      })

      if (!sourceResponse.ok) {
        throw new Error(`Create source failed: HTTP ${sourceResponse.status}`)
      }

      const sourceData = (await sourceResponse.json()) as CheckoutSourceResponse

      // Step 2: Create checkout session linked to source
      const sessionResponse = await fetch(`${this.baseUrl}/sessions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          source_id: sourceData.id,
          source_type: 'invoice',
        }),
      })

      if (!sessionResponse.ok) {
        throw new Error(`Create session failed: HTTP ${sessionResponse.status}`)
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

export const dollr = new DollrClient()
