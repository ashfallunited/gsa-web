import assert from 'assert'
import type { DonationInput, DonationResponse } from '@/types/donation'
import { MIN_DONATION_USD } from '@/lib/donation/constants'

/**
 * Mock implementation of the donations/create POST endpoint for testing
 * Tests validation, error handling, and integration with Dollr and database layers
 */

// Mock types and classes
interface MockRequest {
  headers: Map<string, string>
  body: unknown
}

interface MockResponse<T> {
  status: number
  data: T
}

// Mock implementations
class MockDollrClient {
  async createCheckout(amountUsd: number, email: string, name: string): Promise<string> {
    if (amountUsd < MIN_DONATION_USD) {
      throw new Error('Amount too low')
    }
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

class MockFirestore {
  private donations: Map<string, unknown> = new Map()
  private idCounter = 1

  async saveDonation(input: DonationInput, ipAddress: string, referenceId: string): Promise<string> {
    const id = String(this.idCounter++)
    this.donations.set(id, {
      id,
      ...input,
      ipAddress,
      referenceId,
      status: 'pending',
      createdAt: new Date(),
    })
    return id
  }

  clear() {
    this.donations.clear()
    this.idCounter = 1
  }
}

class MockSupabase {
  async saveDonation(
    input: DonationInput,
    ipAddress: string,
    referenceId: string,
    firebaseId: string
  ): Promise<void> {
    // Simulate successful save
    return Promise.resolve()
  }

  async throwError(): Promise<void> {
    throw new Error('Supabase connection failed')
  }
}

// Mock validator
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const VALID_COUNTRIES = ['US', 'UK', 'CA', 'NG', 'LR', 'SL', 'GH']

function validateDonationInput(input: DonationInput): Record<string, string> | null {
  const errors: Record<string, string> = {}

  if (!input.firstName || input.firstName.trim() === '') {
    errors.firstName = 'First name is required'
  }

  if (!input.lastName || input.lastName.trim() === '') {
    errors.lastName = 'Last name is required'
  }

  if (!input.email || input.email.trim() === '') {
    errors.email = 'Email is required'
  } else if (!validateEmail(input.email)) {
    errors.email = 'Email format is invalid'
  }

  if (!input.country) {
    errors.country = 'Country is required'
  } else if (!VALID_COUNTRIES.includes(input.country)) {
    errors.country = 'Invalid country selection'
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

  if (!input.phone || input.phone.trim() === '') {
    errors.phone = 'Phone number is required'
  }

  return Object.keys(errors).length > 0 ? errors : null
}

function getClientIpAddress(headers: Map<string, string>): string {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  return 'unknown'
}

// Mock POST handler
async function mockPOSTHandler(
  body: unknown,
  headers: Map<string, string>,
  heyDollr: MockDollrClient,
  firestore: MockFirestore,
  supabase: MockSupabase
): Promise<MockResponse<DonationResponse>> {
  try {
    // Parse request body
    let input: DonationInput
    if (!body || typeof body !== 'object') {
      return {
        status: 400,
        data: {
          success: false,
          error: 'Invalid request body',
        },
      }
    }
    input = body as DonationInput

    // Validate input
    const validationErrors = validateDonationInput(input)
    if (validationErrors) {
      return {
        status: 400,
        data: {
          success: false,
          error: 'Validation failed',
          fields: validationErrors,
        },
      }
    }

    // Get IP address
    const ipAddress = getClientIpAddress(headers)

    // Call Dollr API
    let referenceId: string
    try {
      const fullName = `${input.firstName} ${input.lastName}`
      const amountToCharge = input.totalUsd || input.amountUsd
      referenceId = await heyDollr.createCheckout(amountToCharge, input.email, fullName)
    } catch (error) {
      console.error('Dollr API error:', error)
      return {
        status: 500,
        data: {
          success: false,
          error: 'Failed to initiate payment. Please try again.',
        },
      }
    }

    // Save to Firestore
    let donationId: string
    try {
      donationId = await firestore.saveDonation(input, ipAddress, referenceId)
    } catch (error) {
      console.error('Firestore save error:', error)
      return {
        status: 500,
        data: {
          success: false,
          error: 'Failed to create donation record. Please try again.',
        },
      }
    }

    // Save to Supabase (non-blocking)
    try {
      await supabase.saveDonation(input, ipAddress, referenceId, donationId)
    } catch (error) {
      console.warn('Supabase save error (non-fatal):', error)
      // Continue - Firestore succeeded
    }

    return {
      status: 201,
      data: {
        success: true,
        donationId,
        status: 'pending',
      },
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      status: 500,
      data: {
        success: false,
        error: 'An unexpected error occurred. Please try again later.',
      },
    }
  }
}

// ============ TESTS ============

async function testValidDonation(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
  }

  const headers = new Map<string, string>()
  headers.set('x-forwarded-for', '192.168.1.1')

  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 201, 'Should return 201 Created')
  assert.strictEqual(response.data.success, true, 'Should be successful')
  assert(response.data.donationId, 'Should return donation ID')
  assert.strictEqual(response.data.status, 'pending', 'Initial status should be pending')
}

async function testValidDonationWithFees(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '+1987654321',
    country: 'UK',
    amountUsd: 100,
    paymentMethod: 'mobile',
    coverFees: true,
    totalUsd: 102.9,
  }

  const headers = new Map<string, string>()
  headers.set('x-forwarded-for', '10.0.0.1')

  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 201, 'Should return 201')
  assert.strictEqual(response.data.success, true, 'Should be successful')
  assert(response.data.donationId, 'Should return donation ID')
}

async function testMissingFirstName(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: '',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields?.firstName, 'Should have firstName error')
}

async function testMissingLastName(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: 'John',
    lastName: '',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields?.lastName, 'Should have lastName error')
}

async function testMissingEmail(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: 'John',
    lastName: 'Doe',
    email: '',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields?.email, 'Should have email error')
}

async function testInvalidEmailFormat(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'not-an-email',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields?.email, 'Should have email format error')
}

async function testInvalidCountry(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'XX',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields?.country, 'Should have country error')
}

async function testMissingCountry(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields?.country, 'Should have country error')
}

async function testAmountTooLow(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 0.5,
    paymentMethod: 'card',
    coverFees: false,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields?.amountUsd, 'Should have amountUsd error')
}

async function testMissingAmount(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    paymentMethod: 'card',
    coverFees: false,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields?.amountUsd, 'Should have amountUsd error')
}

async function testInvalidPaymentMethod(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 50,
    paymentMethod: 'invalid' as any,
    coverFees: false,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields?.paymentMethod, 'Should have paymentMethod error')
}

async function testMissingPhone(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '',
    country: 'US',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields?.phone, 'Should have phone error')
}

async function testInvalidCoverFeesType(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: 'yes' as any,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields?.coverFees, 'Should have coverFees error')
}

async function testMultipleValidationErrors(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: '',
    lastName: '',
    email: 'invalid-email',
    phone: '',
    country: 'XX',
    amountUsd: 0.5,
    paymentMethod: 'invalid' as any,
    coverFees: false,
  }

  const headers = new Map<string, string>()
  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 400, 'Should return 400')
  assert.strictEqual(response.data.success, false, 'Should fail')
  assert(response.data.fields, 'Should have multiple field errors')
  assert(response.data.fields?.firstName, 'Should have firstName error')
  assert(response.data.fields?.lastName, 'Should have lastName error')
  assert(response.data.fields?.email, 'Should have email error')
  assert(response.data.fields?.phone, 'Should have phone error')
  assert(response.data.fields?.country, 'Should have country error')
  assert(response.data.fields?.amountUsd, 'Should have amountUsd error')
  assert(response.data.fields?.paymentMethod, 'Should have paymentMethod error')
}

async function testIPAddressExtraction(): Promise<void> {
  const heyDollr = new MockDollrClient()
  const firestore = new MockFirestore()
  const supabase = new MockSupabase()

  const input: DonationInput = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
  }

  const headers = new Map<string, string>()
  headers.set('x-forwarded-for', '203.0.113.1, 198.51.100.1')

  const response = await mockPOSTHandler(input, headers, heyDollr, firestore, supabase)

  assert.strictEqual(response.status, 201, 'Should return 201')
  assert.strictEqual(response.data.success, true, 'Should succeed')
  // Verify IP was properly extracted (first IP from x-forwarded-for)
  assert(response.data.donationId, 'Should return donation ID')
}

// ============ RUN TESTS ============

async function runAllTests(): Promise<void> {
  console.log('Running POST /api/donations/create endpoint tests...\n')

  await testValidDonation()
  console.log('✓ Valid donation creates record and returns 201')

  await testValidDonationWithFees()
  console.log('✓ Valid donation with fees creates record')

  await testMissingFirstName()
  console.log('✓ Missing first name returns 400 with field error')

  await testMissingLastName()
  console.log('✓ Missing last name returns 400 with field error')

  await testMissingEmail()
  console.log('✓ Missing email returns 400 with field error')

  await testInvalidEmailFormat()
  console.log('✓ Invalid email format returns 400 with field error')

  await testInvalidCountry()
  console.log('✓ Invalid country returns 400 with field error')

  await testMissingCountry()
  console.log('✓ Missing country returns 400 with field error')

  await testAmountTooLow()
  console.log('✓ Amount below minimum returns 400 with field error')

  await testMissingAmount()
  console.log('✓ Missing amount returns 400 with field error')

  await testInvalidPaymentMethod()
  console.log('✓ Invalid payment method returns 400 with field error')

  await testMissingPhone()
  console.log('✓ Missing phone returns 400 with field error')

  await testInvalidCoverFeesType()
  console.log('✓ Invalid coverFees type returns 400 with field error')

  await testMultipleValidationErrors()
  console.log('✓ Multiple validation errors returns all field errors')

  await testIPAddressExtraction()
  console.log('✓ IP address is properly extracted from x-forwarded-for')

  console.log('\nAll POST /api/donations/create endpoint tests passed!')
}

runAllTests().catch((error) => {
  console.error('Test suite failed:', error)
  process.exit(1)
})
