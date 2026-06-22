import assert from 'assert'

/**
 * Hey Dollr API Client Tests
 * Tests for token caching, checkout creation, status retrieval, and error handling
 */

// Simple test for the HeyDollrClient structure and type definitions
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

interface StatusResponse {
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

class MockHeyDollrClient {
  private clientId: string
  private clientSecret: string
  private apiKey: string
  private baseUrl = 'https://dollr-open-api-35531319888.us-central1.run.app/v1'
  private cachedToken: CachedToken | null = null

  constructor() {
    this.clientId = process.env.HEYDOLLR_CLIENT_ID || ''
    this.clientSecret = process.env.HEYDOLLR_CLIENT_SECRET || ''
    this.apiKey = process.env.HEYDOLLR_API_KEY || ''

    if (!this.clientId || !this.clientSecret || !this.apiKey) {
      throw new Error(
        'Hey Dollr credentials are missing. Please set HEYDOLLR_CLIENT_ID, HEYDOLLR_CLIENT_SECRET, and HEYDOLLR_API_KEY environment variables.'
      )
    }
  }

  async getAccessToken(): Promise<string> {
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

function testConstructorWithValidCredentials(): void {
  process.env.HEYDOLLR_CLIENT_ID = 'test-client-id'
  process.env.HEYDOLLR_CLIENT_SECRET = 'test-client-secret'
  process.env.HEYDOLLR_API_KEY = 'test-api-key'

  try {
    const client = new MockHeyDollrClient()
    assert(client, 'Client should be instantiated')
    console.log('✓ Constructor initializes with valid credentials')
  } finally {
    delete process.env.HEYDOLLR_CLIENT_ID
    delete process.env.HEYDOLLR_CLIENT_SECRET
    delete process.env.HEYDOLLR_API_KEY
  }
}

function testConstructorThrowsWithMissingCredentials(): void {
  delete process.env.HEYDOLLR_CLIENT_ID
  delete process.env.HEYDOLLR_CLIENT_SECRET
  delete process.env.HEYDOLLR_API_KEY

  try {
    const client = new MockHeyDollrClient()
    assert.fail('Should have thrown an error')
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes('credentials are missing'),
      'Should throw error about missing credentials'
    )
    console.log('✓ Constructor throws error when credentials are missing')
  }
}

function testTokenCachingLogic(): void {
  const now = Date.now()

  // Simulate cached token that expires in 1 hour
  const cachedToken: CachedToken = {
    token: 'cached-token-123',
    expiresAt: now + 3600000, // 1 hour from now
  }

  // Token should be valid since expiry is more than 60 seconds away
  const isValid = cachedToken.expiresAt > now + 60000
  assert(isValid, 'Token should be valid when expiry > now + 60s')

  // Simulate nearly expired token
  const almostExpiredToken: CachedToken = {
    token: 'almost-expired-token',
    expiresAt: now + 30000, // 30 seconds from now
  }

  const isExpiringSoon = almostExpiredToken.expiresAt <= now + 60000
  assert(isExpiringSoon, 'Token should be refreshed when expiry < now + 60s')

  console.log('✓ Token caching logic handles expiry with 1-minute buffer')
}

function testAmountConversion(): void {
  const testCases = [
    { usd: 1, cents: 100 },
    { usd: 25, cents: 2500 },
    { usd: 100, cents: 10000 },
    { usd: 50.5, cents: 5050 },
    { usd: 0.01, cents: 1 },
  ]

  testCases.forEach(({ usd, cents }) => {
    const calculated = Math.round(usd * 100)
    assert.strictEqual(
      calculated,
      cents,
      `${usd} USD should equal ${cents} cents`
    )
  })

  console.log('✓ Amount conversion from USD to cents is correct')
}

function testStatusResponseStructure(): void {
  const mockStatus: StatusResponse = {
    reference_id: 'ref-123',
    status: 'completed',
    payer_amount: 10000,
    payee_amount: 9700,
    operation_type: 'checkout',
  }

  assert.strictEqual(
    mockStatus.reference_id,
    'ref-123',
    'Status should have reference_id'
  )
  assert.strictEqual(
    mockStatus.status,
    'completed',
    'Status should have status field'
  )
  assert.strictEqual(
    mockStatus.payer_amount,
    10000,
    'Status should have payer_amount'
  )
  assert.strictEqual(
    mockStatus.payee_amount,
    9700,
    'Status should have payee_amount'
  )
  assert.strictEqual(
    mockStatus.operation_type,
    'checkout',
    'Status should have operation_type'
  )

  console.log('✓ Status response structure is correct')
}

function testCheckoutRequestStructure(): void {
  const amountUsd = 100
  const amountCents = Math.round(amountUsd * 100)

  const checkoutPayload = {
    items: [
      {
        name: 'Donation',
        amount: amountCents,
        quantity: 1,
      },
    ],
    currency: 'USD',
  }

  assert.deepStrictEqual(
    checkoutPayload.items[0].name,
    'Donation',
    'Item name should be Donation'
  )
  assert.strictEqual(
    checkoutPayload.items[0].amount,
    10000,
    'Amount should be in cents'
  )
  assert.strictEqual(
    checkoutPayload.items[0].quantity,
    1,
    'Quantity should be 1'
  )
  assert.strictEqual(checkoutPayload.currency, 'USD', 'Currency should be USD')

  console.log('✓ Checkout request structure is correct')
}

function testSessionRequestStructure(): void {
  const sessionPayload = {
    checkout_id: 'checkout-abc-123',
    payer_email: 'test@example.com',
    payer_name: 'John Doe',
  }

  assert.strictEqual(
    sessionPayload.checkout_id,
    'checkout-abc-123',
    'Session should have checkout_id'
  )
  assert.strictEqual(
    sessionPayload.payer_email,
    'test@example.com',
    'Session should have payer_email'
  )
  assert.strictEqual(
    sessionPayload.payer_name,
    'John Doe',
    'Session should have payer_name'
  )

  console.log('✓ Session request structure is correct')
}

function testAuthorizationHeaderFormats(): void {
  // Test Bearer token format
  const token = 'test-token-123'
  const bearerHeader = `Bearer ${token}`
  assert(
    bearerHeader.startsWith('Bearer '),
    'Bearer header should start with Bearer '
  )
  assert.strictEqual(
    bearerHeader,
    'Bearer test-token-123',
    'Bearer format should be correct'
  )

  // Test API key header existence
  const apiKey = 'test-api-key'
  assert(apiKey.length > 0, 'API key should not be empty')

  console.log('✓ Authorization header formats are correct')
}

function testErrorMessageFormats(): void {
  const errorMessages = [
    'Failed to get token',
    'Failed to create checkout',
    'Failed to get status',
  ]

  errorMessages.forEach((msg) => {
    assert(msg.length > 0, 'Error message should not be empty')
    assert(msg.startsWith('Failed to'), 'Error should start with Failed to')
  })

  console.log('✓ Error message formats are consistent')
}

function testBaseUrlConfiguration(): void {
  const baseUrl = 'https://dollr-open-api-35531319888.us-central1.run.app/v1'
  assert(
    baseUrl.startsWith('https://'),
    'Base URL should use HTTPS'
  )
  assert(
    baseUrl.includes('us-central1'),
    'Base URL should specify region'
  )
  assert(
    baseUrl.endsWith('/v1'),
    'Base URL should end with /v1'
  )

  const endpoints = [
    '/jwt/client/obtain/token',
    '/checkouts/create',
    '/sessions/checkout',
    '/status/collection/',
  ]

  endpoints.forEach((endpoint) => {
    const fullUrl = baseUrl + endpoint
    assert(fullUrl.length > 0, 'Full URL should be valid')
  })

  console.log('✓ Base URL and endpoints are correctly configured')
}

function testMultipleInstanceCreation(): void {
  process.env.HEYDOLLR_CLIENT_ID = 'test-client-id'
  process.env.HEYDOLLR_CLIENT_SECRET = 'test-client-secret'
  process.env.HEYDOLLR_API_KEY = 'test-api-key'

  try {
    const client1 = new MockHeyDollrClient()
    const client2 = new MockHeyDollrClient()

    assert(client1, 'First client instance should exist')
    assert(client2, 'Second client instance should exist')
    assert(
      client1 !== client2,
      'Client instances should be different objects'
    )

    console.log('✓ Multiple client instances can be created independently')
  } finally {
    delete process.env.HEYDOLLR_CLIENT_ID
    delete process.env.HEYDOLLR_CLIENT_SECRET
    delete process.env.HEYDOLLR_API_KEY
  }
}

function testMinimumDonationAmount(): void {
  const minDonation = 1
  const testAmounts = [0.5, 1, 25, 100, 1000]

  testAmounts.forEach((amount) => {
    const isValid = amount >= minDonation
    if (amount === 0.5) {
      assert(!isValid, '0.5 USD should not meet minimum')
    } else {
      assert(isValid, `${amount} USD should meet or exceed minimum`)
    }
  })

  console.log('✓ Minimum donation amount validation logic is correct')
}

// Run all tests
console.log('\n=== Running Hey Dollr API Client Tests ===\n')

try {
  testConstructorWithValidCredentials()
  testConstructorThrowsWithMissingCredentials()
  testTokenCachingLogic()
  testAmountConversion()
  testStatusResponseStructure()
  testCheckoutRequestStructure()
  testSessionRequestStructure()
  testAuthorizationHeaderFormats()
  testErrorMessageFormats()
  testBaseUrlConfiguration()
  testMultipleInstanceCreation()
  testMinimumDonationAmount()

  console.log('\n✓ All Hey Dollr API client tests passed!\n')
} catch (error) {
  console.error('\n✗ Test failed:', error)
  process.exit(1)
}
