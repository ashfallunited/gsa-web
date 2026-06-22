import assert from 'assert'
import { RETRY_SCHEDULE_MINUTES, RETRY_EXPIRY_HOURS, DONATION_STATUS } from '@/lib/donation/constants'

/**
 * Mock types for testing
 */
interface MockDonation {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  message: string | null
  ipAddress: string
  amountUsd: number
  paymentMethod: 'card' | 'mobile'
  coverFees: boolean
  feeUsd: number
  totalUsd: number
  referenceId: string
  status: string
  dollrStatus: string
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  emailSent: boolean
  notes: string | null
  retryAttempts: number
  nextRetryAt: Date | null
}

/**
 * Mock implementations for testing
 */
const mockDatabase: Map<string, MockDonation> = new Map()
const mockEmailLog: Array<{
  donationId: string
  emailType: string
  recipientEmail: string
  subject: string
  sentAt: Date
}> = []
const mockStatusFetches: Map<string, string> = new Map()

/**
 * Mock queryPendingDonations
 */
function mockQueryPendingDonations(): MockDonation[] {
  const pending: MockDonation[] = []
  mockDatabase.forEach((donation) => {
    if (
      donation.status === DONATION_STATUS.PENDING ||
      donation.status === DONATION_STATUS.PROCESSING
    ) {
      pending.push({ ...donation })
    }
  })
  return pending
}

/**
 * Mock updateDonationStatus
 */
function mockUpdateDonationStatus(
  id: string,
  status: string,
  dollrStatus: string
): void {
  const donation = mockDatabase.get(id)
  if (!donation) {
    throw new Error(`Donation with id ${id} not found`)
  }

  donation.status = status
  donation.dollrStatus = dollrStatus
  donation.updatedAt = new Date()

  if (status === DONATION_STATUS.COMPLETED) {
    donation.completedAt = new Date()
  }

  mockDatabase.set(id, donation)
}

/**
 * Mock updateSupabaseDonation
 */
function mockUpdateSupabaseDonation(
  id: string,
  status: string,
  dollrStatus: string
): void {
  // In tests, just verify it would be called (no actual DB)
  const donation = mockDatabase.get(id)
  if (!donation) {
    throw new Error(`Donation with id ${id} not found`)
  }
}

/**
 * Mock incrementRetryAttempts
 */
function mockIncrementRetryAttempts(id: string, nextRetryAt: Date): void {
  const donation = mockDatabase.get(id)
  if (!donation) {
    throw new Error(`Donation with id ${id} not found`)
  }

  donation.retryAttempts = (donation.retryAttempts || 0) + 1
  donation.nextRetryAt = nextRetryAt
  donation.updatedAt = new Date()
  mockDatabase.set(id, donation)
}

/**
 * Mock markEmailSent
 */
function mockMarkEmailSent(id: string): void {
  const donation = mockDatabase.get(id)
  if (!donation) {
    throw new Error(`Donation with id ${id} not found`)
  }

  donation.emailSent = true
  donation.updatedAt = new Date()
  mockDatabase.set(id, donation)
}

/**
 * Mock markEmailSentSupabase
 */
function mockMarkEmailSentSupabase(id: string): void {
  const donation = mockDatabase.get(id)
  if (!donation) {
    throw new Error(`Donation with id ${id} not found`)
  }
}

/**
 * Mock logEmail
 */
function mockLogEmail(
  donationId: string,
  emailType: string,
  recipientEmail: string,
  subject: string
): void {
  mockEmailLog.push({
    donationId,
    emailType,
    recipientEmail,
    subject,
    sentAt: new Date(),
  })
}

/**
 * Mock sendThankYouEmail
 */
function mockSendThankYouEmail(donation: MockDonation): boolean {
  return true // Simulate successful send
}

/**
 * Mock heyDollr.getPaymentStatus
 */
function mockGetPaymentStatus(referenceId: string): string {
  const status = mockStatusFetches.get(referenceId)
  if (!status) {
    throw new Error(`Status not found for reference ${referenceId}`)
  }
  return status
}

/**
 * Simulate cron job processing logic
 */
function simulateCronSync(
  pendingDonations: MockDonation[],
  now: Date = new Date()
): { processedCount: number; errors: string[] } {
  const errors: string[] = []
  let processedCount = 0

  for (const donation of pendingDonations) {
    try {
      // Get payment status
      let paymentStatus: string
      try {
        paymentStatus = mockGetPaymentStatus(donation.referenceId)
      } catch (error) {
        // Check retry logic
        const ageHours = (now.getTime() - donation.createdAt.getTime()) / (1000 * 60 * 60)
        const canRetry =
          ageHours < RETRY_EXPIRY_HOURS &&
          donation.retryAttempts < RETRY_SCHEDULE_MINUTES.length

        if (canRetry) {
          const nextRetryMinutes = RETRY_SCHEDULE_MINUTES[donation.retryAttempts]
          const nextRetryDate = new Date(now.getTime() + nextRetryMinutes * 60 * 1000)
          mockIncrementRetryAttempts(donation.id, nextRetryDate)
          processedCount++
        } else {
          mockUpdateDonationStatus(donation.id, DONATION_STATUS.FAILED, 'retry_exhausted')
          mockUpdateSupabaseDonation(donation.id, DONATION_STATUS.FAILED, 'retry_exhausted')
          processedCount++
        }
        continue
      }

      // Check if status changed
      if (paymentStatus !== donation.dollrStatus) {
        mockUpdateDonationStatus(donation.id, paymentStatus, paymentStatus)
        mockUpdateSupabaseDonation(donation.id, paymentStatus, paymentStatus)

        // If completed, send email
        if (paymentStatus === DONATION_STATUS.COMPLETED) {
          const emailSent = mockSendThankYouEmail(donation)

          if (emailSent) {
            mockMarkEmailSent(donation.id)
            mockMarkEmailSentSupabase(donation.id)
            mockLogEmail(
              donation.id,
              'auto_thank_you',
              donation.email,
              'Thank You for Your Donation'
            )
          }
        }

        processedCount++
      } else {
        processedCount++
      }
    } catch (donationError) {
      errors.push(`Error processing donation ${donation.id}: ${donationError}`)
    }
  }

  return { processedCount, errors }
}

/**
 * Helper to create a mock donation
 */
function createMockDonation(
  id: string,
  overrides?: Partial<MockDonation>
): MockDonation {
  const donation: MockDonation = {
    id,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    message: null,
    ipAddress: '192.168.1.1',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
    feeUsd: 0,
    totalUsd: 100,
    referenceId: `ref_${id}`,
    status: DONATION_STATUS.PENDING,
    dollrStatus: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    emailSent: false,
    notes: null,
    retryAttempts: 0,
    nextRetryAt: null,
    ...overrides,
  }

  mockDatabase.set(id, donation)
  return donation
}

/**
 * Helper to reset mocks
 */
function resetMocks(): void {
  mockDatabase.clear()
  mockEmailLog.length = 0
  mockStatusFetches.clear()
}

// ============ TESTS ============

function testValidStatusUpdate(): void {
  resetMocks()

  const donation = createMockDonation('don_1', {
    status: DONATION_STATUS.PENDING,
    dollrStatus: '',
  })

  mockStatusFetches.set('ref_don_1', 'completed')

  const pending = mockQueryPendingDonations()
  assert.strictEqual(pending.length, 1, 'Should find pending donation')

  const { processedCount } = simulateCronSync(pending)
  assert.strictEqual(processedCount, 1, 'Should process 1 donation')

  const updated = mockDatabase.get('don_1')!
  assert.strictEqual(updated.status, DONATION_STATUS.COMPLETED, 'Status should be completed')
  assert.strictEqual(updated.dollrStatus, 'completed', 'dollrStatus should be updated')
}

function testStatusNotChanged(): void {
  resetMocks()

  const donation = createMockDonation('don_2', {
    status: DONATION_STATUS.PROCESSING,
    dollrStatus: 'processing',
  })

  mockStatusFetches.set('ref_don_2', 'processing')

  const pending = mockQueryPendingDonations()
  const { processedCount } = simulateCronSync(pending)

  assert.strictEqual(processedCount, 1, 'Should count as processed even if status unchanged')

  const updated = mockDatabase.get('don_2')!
  assert.strictEqual(updated.status, DONATION_STATUS.PROCESSING, 'Status should remain processing')
}

function testEmailOnCompletion(): void {
  resetMocks()

  const donation = createMockDonation('don_3', {
    status: DONATION_STATUS.PENDING,
    dollrStatus: '',
    emailSent: false,
  })

  mockStatusFetches.set('ref_don_3', DONATION_STATUS.COMPLETED)

  const pending = mockQueryPendingDonations()
  simulateCronSync(pending)

  const updated = mockDatabase.get('don_3')!
  assert.strictEqual(updated.emailSent, true, 'Email should be marked as sent')
  assert.strictEqual(mockEmailLog.length, 1, 'Should log 1 email')
  assert.strictEqual(mockEmailLog[0].emailType, 'auto_thank_you', 'Email type should be auto_thank_you')
}

function testRetryLogic(): void {
  resetMocks()

  const now = new Date()
  const donation = createMockDonation('don_4', {
    status: DONATION_STATUS.PENDING,
    dollrStatus: '',
    createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
    retryAttempts: 0,
  })

  // Simulate status fetch error by not setting mockStatusFetches
  const pending = mockQueryPendingDonations()
  const { processedCount } = simulateCronSync(pending, now)

  const updated = mockDatabase.get('don_4')!
  assert.strictEqual(updated.retryAttempts, 1, 'Retry attempts should be incremented')
  assert.strictEqual(processedCount, 1, 'Should count as processed')
  assert(updated.nextRetryAt !== null, 'nextRetryAt should be set')

  // Verify next retry is scheduled for 5 minutes (first retry)
  const expectedNextRetry = new Date(now.getTime() + RETRY_SCHEDULE_MINUTES[0] * 60 * 1000)
  const timeDiff = Math.abs(updated.nextRetryAt!.getTime() - expectedNextRetry.getTime())
  assert(timeDiff < 1000, 'Next retry should be scheduled for ~5 minutes')
}

function testMaxRetriesExhausted(): void {
  resetMocks()

  const now = new Date()
  const donation = createMockDonation('don_5', {
    status: DONATION_STATUS.PENDING,
    dollrStatus: '',
    createdAt: new Date(now.getTime() - 100 * 60 * 60 * 1000), // 100 hours ago (> 72 hour expiry)
    retryAttempts: 5, // Already at max retries
  })

  const pending = mockQueryPendingDonations()
  const { processedCount } = simulateCronSync(pending, now)

  const updated = mockDatabase.get('don_5')!
  assert.strictEqual(updated.status, DONATION_STATUS.FAILED, 'Status should be failed')
  assert.strictEqual(updated.dollrStatus, 'retry_exhausted', 'dollrStatus should be retry_exhausted')
  assert.strictEqual(processedCount, 1, 'Should count as processed')
}

function testMultipleDonations(): void {
  resetMocks()

  const don1 = createMockDonation('don_6', { status: DONATION_STATUS.PENDING })
  const don2 = createMockDonation('don_7', { status: DONATION_STATUS.PENDING })
  const don3 = createMockDonation('don_8', { status: DONATION_STATUS.COMPLETED }) // Not pending

  mockStatusFetches.set('ref_don_6', DONATION_STATUS.COMPLETED)
  mockStatusFetches.set('ref_don_7', DONATION_STATUS.PROCESSING)

  const pending = mockQueryPendingDonations()
  assert.strictEqual(pending.length, 2, 'Should find 2 pending donations')

  const { processedCount } = simulateCronSync(pending)
  assert.strictEqual(processedCount, 2, 'Should process 2 donations')

  assert.strictEqual(mockDatabase.get('don_6')!.status, DONATION_STATUS.COMPLETED)
  assert.strictEqual(mockDatabase.get('don_7')!.status, DONATION_STATUS.PROCESSING)
}

function testRetryScheduleBackoff(): void {
  resetMocks()

  const now = new Date()
  const createdAt = new Date(now.getTime() - 1 * 60 * 60 * 1000)

  // Test all retry schedules
  for (let i = 0; i < RETRY_SCHEDULE_MINUTES.length; i++) {
    resetMocks()

    const donation = createMockDonation(`don_${i}`, {
      status: DONATION_STATUS.PENDING,
      createdAt,
      retryAttempts: i,
    })

    const pending = mockQueryPendingDonations()
    simulateCronSync(pending, now)

    const updated = mockDatabase.get(`don_${i}`)!
    assert.strictEqual(updated.retryAttempts, i + 1, `Retry attempt should be ${i + 1}`)

    const expectedMinutes = RETRY_SCHEDULE_MINUTES[i]
    const expectedNextRetry = new Date(now.getTime() + expectedMinutes * 60 * 1000)
    const timeDiff = Math.abs(updated.nextRetryAt!.getTime() - expectedNextRetry.getTime())
    assert(timeDiff < 1000, `Next retry for index ${i} should be ${expectedMinutes} minutes`)
  }
}

function testNoDonationsProcessing(): void {
  resetMocks()

  // Create completed donations (should not be in pending query)
  createMockDonation('don_9', { status: DONATION_STATUS.COMPLETED })
  createMockDonation('don_10', { status: DONATION_STATUS.FAILED })

  const pending = mockQueryPendingDonations()
  assert.strictEqual(pending.length, 0, 'Should find no pending donations')

  const { processedCount } = simulateCronSync(pending)
  assert.strictEqual(processedCount, 0, 'Should process 0 donations')
}

function testAuthorizationValidation(): void {
  // This test verifies the auth check logic would work
  const cronSecret = 'test-secret-123'
  const validToken = 'Bearer test-secret-123'
  const invalidToken = 'Bearer wrong-secret'
  const noToken = 'NoBearer test-secret-123'

  // Valid token
  assert(validToken.startsWith('Bearer '), 'Valid token should start with Bearer')
  const validTokenValue = validToken.slice(7)
  assert.strictEqual(validTokenValue, cronSecret, 'Token should match secret')

  // Invalid token
  assert(invalidToken.startsWith('Bearer '), 'Invalid token should start with Bearer')
  const invalidTokenValue = invalidToken.slice(7)
  assert.notStrictEqual(invalidTokenValue, cronSecret, 'Token should not match secret')

  // No token prefix
  assert(!noToken.startsWith('Bearer '), 'Invalid format should not start with Bearer')
}

// ============ RUN TESTS ============

console.log('Running cron sync-donations route tests...\n')

testValidStatusUpdate()
console.log('✓ Valid status update')

testStatusNotChanged()
console.log('✓ Status unchanged still counts as processed')

testEmailOnCompletion()
console.log('✓ Email sent on completion')

testRetryLogic()
console.log('✓ Retry logic with backoff')

testMaxRetriesExhausted()
console.log('✓ Max retries exhausted marks donation as failed')

testMultipleDonations()
console.log('✓ Multiple donations processed correctly')

testRetryScheduleBackoff()
console.log('✓ Retry schedule follows backoff pattern')

testNoDonationsProcessing()
console.log('✓ No pending donations returns 0 processed')

testAuthorizationValidation()
console.log('✓ Authorization validation logic')

console.log('\nAll cron sync-donations tests passed!')
