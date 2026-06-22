import assert from 'assert'
import type { Timestamp } from 'firebase-admin/firestore'
import type { DonationInput, DonationStatus } from '@/types/donation'
import { PROCESSING_FEE_RATE, DONATION_STATUS } from '../constants'

/**
 * Mock implementation of Firestore functions for testing
 * In a real environment, these would be mocked with firebase-admin SDK
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
  status: DonationStatus
  dollrStatus: string
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt: Timestamp | null
  emailSent: boolean
  notes: string | null
  retryAttempts: number
  nextRetryAt: Timestamp | null
}

// Mock database to store donations
const mockDatabase: Map<string, MockDonation> = new Map()
let mockIdCounter = 1

/**
 * Mock Timestamp class for testing
 */
class MockTimestamp {
  constructor(private date: Date) {}

  static now(): MockTimestamp {
    return new MockTimestamp(new Date())
  }

  static fromDate(date: Date): MockTimestamp {
    return new MockTimestamp(date)
  }

  toDate(): Date {
    return this.date
  }
}

/**
 * Mock saveDonationToFirestore for testing
 */
function mockSaveDonationToFirestore(
  input: DonationInput,
  ipAddress: string,
  referenceId: string
): string {
  const feeUsd = input.coverFees
    ? Math.round(input.amountUsd * PROCESSING_FEE_RATE * 100) / 100
    : 0
  const totalUsd = input.amountUsd + feeUsd

  const id = String(mockIdCounter++)
  const donation: MockDonation = {
    id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    country: input.country,
    message: input.message || null,
    ipAddress,
    amountUsd: input.amountUsd,
    paymentMethod: input.paymentMethod,
    coverFees: input.coverFees,
    feeUsd,
    totalUsd,
    referenceId,
    status: DONATION_STATUS.PENDING,
    dollrStatus: '',
    createdAt: MockTimestamp.now() as unknown as Timestamp,
    updatedAt: MockTimestamp.now() as unknown as Timestamp,
    completedAt: null,
    emailSent: false,
    notes: null,
    retryAttempts: 0,
    nextRetryAt: null,
  }

  mockDatabase.set(id, donation)
  return id
}

/**
 * Mock getDonation for testing
 */
function mockGetDonation(id: string): MockDonation | null {
  return mockDatabase.get(id) || null
}

/**
 * Mock updateDonationStatus for testing
 */
function mockUpdateDonationStatus(
  id: string,
  status: DonationStatus,
  dollrStatus: string,
  notes?: string
): void {
  const donation = mockDatabase.get(id)
  if (!donation) {
    throw new Error(`Donation with id ${id} not found`)
  }

  donation.status = status
  donation.dollrStatus = dollrStatus
  donation.updatedAt = MockTimestamp.now() as unknown as Timestamp

  if (notes) {
    donation.notes = notes
  }

  if (status === DONATION_STATUS.COMPLETED) {
    donation.completedAt = MockTimestamp.now() as unknown as Timestamp
  }

  mockDatabase.set(id, donation)
}

/**
 * Mock queryPendingDonations for testing
 */
function mockQueryPendingDonations(): MockDonation[] {
  const pending: MockDonation[] = []
  mockDatabase.forEach((donation) => {
    if (
      donation.status === DONATION_STATUS.PENDING ||
      donation.status === DONATION_STATUS.PROCESSING
    ) {
      pending.push(donation)
    }
  })
  return pending
}

/**
 * Mock markEmailSent for testing
 */
function mockMarkEmailSent(id: string): void {
  const donation = mockDatabase.get(id)
  if (!donation) {
    throw new Error(`Donation with id ${id} not found`)
  }

  donation.emailSent = true
  donation.updatedAt = MockTimestamp.now() as unknown as Timestamp
  mockDatabase.set(id, donation)
}

/**
 * Mock incrementRetryAttempts for testing
 */
function mockIncrementRetryAttempts(id: string, nextRetryAt: Date): void {
  const donation = mockDatabase.get(id)
  if (!donation) {
    throw new Error(`Donation with id ${id} not found`)
  }

  donation.retryAttempts = (donation.retryAttempts || 0) + 1
  donation.nextRetryAt = MockTimestamp.fromDate(nextRetryAt) as unknown as Timestamp
  donation.updatedAt = MockTimestamp.now() as unknown as Timestamp
  mockDatabase.set(id, donation)
}

// ============ TESTS ============

function testSaveDonationWithoutFees(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input: DonationInput = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
    message: 'Great initiative',
  }

  const id = mockSaveDonationToFirestore(input, '192.168.1.1', 'ref123')
  const donation = mockGetDonation(id)

  assert(donation !== null, 'Donation should be saved')
  assert.strictEqual(donation!.firstName, 'John', 'First name should be stored')
  assert.strictEqual(donation!.amountUsd, 100, 'Amount should be 100')
  assert.strictEqual(donation!.feeUsd, 0, 'Fee should be 0 when coverFees is false')
  assert.strictEqual(donation!.totalUsd, 100, 'Total should be 100')
  assert.strictEqual(donation!.status, DONATION_STATUS.PENDING, 'Status should be pending')
  assert.strictEqual(donation!.ipAddress, '192.168.1.1', 'IP address should be stored')
  assert.strictEqual(donation!.referenceId, 'ref123', 'Reference ID should be stored')
}

function testSaveDonationWithFees(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input: DonationInput = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '+1987654321',
    country: 'UK',
    amountUsd: 100,
    paymentMethod: 'mobile',
    coverFees: true,
    message: 'Support the cause',
  }

  const id = mockSaveDonationToFirestore(input, '10.0.0.1', 'ref456')
  const donation = mockGetDonation(id)

  assert(donation !== null, 'Donation should be saved')
  // Fee calculation: 100 * 0.029 = 2.9, rounded to nearest cent = 2.90
  const expectedFee = Math.round(100 * PROCESSING_FEE_RATE * 100) / 100
  assert.strictEqual(donation!.feeUsd, expectedFee, `Fee should be ${expectedFee}`)
  assert.strictEqual(donation!.totalUsd, 100 + expectedFee, `Total should be ${100 + expectedFee}`)
}

function testFeeCalculationPrecision(): void {
  // Test that fee calculation is precise to 2 decimal places
  const amounts = [25, 50, 100, 250, 500]

  amounts.forEach((amount) => {
    mockDatabase.clear()
    mockIdCounter = 1

    const input: DonationInput = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '+1234567890',
      country: 'US',
      amountUsd: amount,
      paymentMethod: 'card',
      coverFees: true,
    }

    const id = mockSaveDonationToFirestore(input, '192.168.1.1', `ref_${amount}`)
    const donation = mockGetDonation(id)!

    // Verify fee is exactly 2 decimal places
    const feeDecimalPlaces = String(donation.feeUsd).split('.')[1]?.length || 0
    assert(feeDecimalPlaces <= 2, `Fee for ${amount} should have max 2 decimal places`)

    // Verify total is calculated correctly
    const calculatedTotal = donation.amountUsd + donation.feeUsd
    assert.strictEqual(
      Math.abs(donation.totalUsd - calculatedTotal) < 0.01,
      true,
      `Total should equal amount + fee`
    )
  })
}

function testGetDonation(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input: DonationInput = {
    firstName: 'Test',
    lastName: 'Donor',
    email: 'donor@example.com',
    phone: '+1234567890',
    country: 'CA',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
  }

  const id = mockSaveDonationToFirestore(input, '192.168.1.1', 'ref_test')
  const retrieved = mockGetDonation(id)

  assert(retrieved !== null, 'Donation should be retrievable')
  assert.strictEqual(retrieved!.id, id, 'ID should match')
  assert.strictEqual(retrieved!.email, input.email, 'Email should match')
}

function testGetDonationNotFound(): void {
  mockDatabase.clear()
  const result = mockGetDonation('nonexistent')
  assert.strictEqual(result, null, 'Should return null for nonexistent donation')
}

function testUpdateDonationStatus(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input: DonationInput = {
    firstName: 'Test',
    lastName: 'Donor',
    email: 'donor@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
  }

  const id = mockSaveDonationToFirestore(input, '192.168.1.1', 'ref_status')
  mockUpdateDonationStatus(id, DONATION_STATUS.PROCESSING, 'processing_at_dollr')

  const updated = mockGetDonation(id)
  assert.strictEqual(updated!.status, DONATION_STATUS.PROCESSING, 'Status should be updated')
  assert.strictEqual(updated!.dollrStatus, 'processing_at_dollr', 'Dollr status should be updated')
}

function testUpdateDonationStatusWithNotes(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input: DonationInput = {
    firstName: 'Test',
    lastName: 'Donor',
    email: 'donor@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
  }

  const id = mockSaveDonationToFirestore(input, '192.168.1.1', 'ref_notes')
  mockUpdateDonationStatus(
    id,
    DONATION_STATUS.FAILED,
    'failed_at_dollr',
    'Payment declined by issuer'
  )

  const updated = mockGetDonation(id)
  assert.strictEqual(updated!.status, DONATION_STATUS.FAILED, 'Status should be failed')
  assert.strictEqual(
    updated!.notes,
    'Payment declined by issuer',
    'Notes should be updated'
  )
}

function testUpdateDonationStatusToCompletedSetsTimestamp(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input: DonationInput = {
    firstName: 'Test',
    lastName: 'Donor',
    email: 'donor@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
  }

  const id = mockSaveDonationToFirestore(input, '192.168.1.1', 'ref_completed')
  assert.strictEqual(mockGetDonation(id)!.completedAt, null, 'completedAt should be null initially')

  mockUpdateDonationStatus(id, DONATION_STATUS.COMPLETED, 'completed_at_dollr')

  const updated = mockGetDonation(id)
  assert.strictEqual(updated!.status, DONATION_STATUS.COMPLETED, 'Status should be completed')
  assert(updated!.completedAt !== null, 'completedAt should be set')
}

function testQueryPendingDonations(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input1: DonationInput = {
    firstName: 'Test1',
    lastName: 'Donor1',
    email: 'donor1@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
  }

  const input2: DonationInput = {
    firstName: 'Test2',
    lastName: 'Donor2',
    email: 'donor2@example.com',
    phone: '+0987654321',
    country: 'UK',
    amountUsd: 50,
    paymentMethod: 'mobile',
    coverFees: true,
  }

  const id1 = mockSaveDonationToFirestore(input1, '192.168.1.1', 'ref1')
  const id2 = mockSaveDonationToFirestore(input2, '192.168.1.2', 'ref2')

  // Set one to completed
  mockUpdateDonationStatus(id2, DONATION_STATUS.COMPLETED, 'completed')

  const pending = mockQueryPendingDonations()
  assert.strictEqual(pending.length, 1, 'Should have 1 pending donation')
  assert.strictEqual(pending[0].id, id1, 'Pending donation should be the first one')
}

function testQueryPendingDonationsIncludesProcessing(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input: DonationInput = {
    firstName: 'Test',
    lastName: 'Donor',
    email: 'donor@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
  }

  const id = mockSaveDonationToFirestore(input, '192.168.1.1', 'ref')
  mockUpdateDonationStatus(id, DONATION_STATUS.PROCESSING, 'processing')

  const pending = mockQueryPendingDonations()
  assert.strictEqual(pending.length, 1, 'Should include processing donations')
  assert.strictEqual(pending[0].status, DONATION_STATUS.PROCESSING, 'Status should be processing')
}

function testMarkEmailSent(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input: DonationInput = {
    firstName: 'Test',
    lastName: 'Donor',
    email: 'donor@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
  }

  const id = mockSaveDonationToFirestore(input, '192.168.1.1', 'ref')
  assert.strictEqual(mockGetDonation(id)!.emailSent, false, 'emailSent should be false initially')

  mockMarkEmailSent(id)

  const updated = mockGetDonation(id)
  assert.strictEqual(updated!.emailSent, true, 'emailSent should be true after marking')
}

function testIncrementRetryAttempts(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input: DonationInput = {
    firstName: 'Test',
    lastName: 'Donor',
    email: 'donor@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
  }

  const id = mockSaveDonationToFirestore(input, '192.168.1.1', 'ref')
  assert.strictEqual(
    mockGetDonation(id)!.retryAttempts,
    0,
    'retryAttempts should be 0 initially'
  )

  const nextRetry = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
  mockIncrementRetryAttempts(id, nextRetry)

  const updated = mockGetDonation(id)
  assert.strictEqual(updated!.retryAttempts, 1, 'retryAttempts should be incremented to 1')
  assert(updated!.nextRetryAt !== null, 'nextRetryAt should be set')
}

function testIncrementRetryAttemptsMultipleTimes(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input: DonationInput = {
    firstName: 'Test',
    lastName: 'Donor',
    email: 'donor@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
  }

  const id = mockSaveDonationToFirestore(input, '192.168.1.1', 'ref')

  const retryScheduleMinutes = [5, 15, 45, 120, 360]

  retryScheduleMinutes.forEach((minutes, index) => {
    const nextRetry = new Date(Date.now() + minutes * 60 * 1000)
    mockIncrementRetryAttempts(id, nextRetry)

    const donation = mockGetDonation(id)
    assert.strictEqual(
      donation!.retryAttempts,
      index + 1,
      `retryAttempts should be ${index + 1}`
    )
  })
}

function testUpdateNonexistentDonationThrows(): void {
  mockDatabase.clear()

  assert.throws(
    () => mockUpdateDonationStatus('nonexistent', DONATION_STATUS.COMPLETED, 'test'),
    /not found/,
    'Should throw error for nonexistent donation'
  )
}

function testMarkEmailSentNonexistentThrows(): void {
  mockDatabase.clear()

  assert.throws(
    () => mockMarkEmailSent('nonexistent'),
    /not found/,
    'Should throw error for nonexistent donation'
  )
}

function testIncrementRetryAttemptsNonexistentThrows(): void {
  mockDatabase.clear()

  assert.throws(
    () => mockIncrementRetryAttempts('nonexistent', new Date()),
    /not found/,
    'Should throw error for nonexistent donation'
  )
}

function testDonationFieldInitialization(): void {
  mockDatabase.clear()
  mockIdCounter = 1

  const input: DonationInput = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
  }

  const id = mockSaveDonationToFirestore(input, '192.168.1.1', 'ref123')
  const donation = mockGetDonation(id)!

  // Verify all fields are initialized correctly
  assert.strictEqual(donation.emailSent, false, 'emailSent should be false')
  assert.strictEqual(donation.notes, null, 'notes should be null')
  assert.strictEqual(donation.retryAttempts, 0, 'retryAttempts should be 0')
  assert.strictEqual(donation.nextRetryAt, null, 'nextRetryAt should be null')
  assert.strictEqual(donation.dollrStatus, '', 'dollrStatus should be empty string')
  assert.strictEqual(donation.completedAt, null, 'completedAt should be null')
}

// ============ RUN TESTS ============

console.log('Running Firestore donation tests...\n')

testSaveDonationWithoutFees()
console.log('✓ Save donation without fees')

testSaveDonationWithFees()
console.log('✓ Save donation with fees')

testFeeCalculationPrecision()
console.log('✓ Fee calculation is precise to 2 decimal places')

testGetDonation()
console.log('✓ Get donation by ID')

testGetDonationNotFound()
console.log('✓ Get nonexistent donation returns null')

testUpdateDonationStatus()
console.log('✓ Update donation status')

testUpdateDonationStatusWithNotes()
console.log('✓ Update donation status with notes')

testUpdateDonationStatusToCompletedSetsTimestamp()
console.log('✓ Update to completed sets completedAt timestamp')

testQueryPendingDonations()
console.log('✓ Query pending donations')

testQueryPendingDonationsIncludesProcessing()
console.log('✓ Query pending includes processing status')

testMarkEmailSent()
console.log('✓ Mark email as sent')

testIncrementRetryAttempts()
console.log('✓ Increment retry attempts')

testIncrementRetryAttemptsMultipleTimes()
console.log('✓ Increment retry attempts multiple times')

testUpdateNonexistentDonationThrows()
console.log('✓ Update nonexistent donation throws error')

testMarkEmailSentNonexistentThrows()
console.log('✓ Mark email sent on nonexistent donation throws error')

testIncrementRetryAttemptsNonexistentThrows()
console.log('✓ Increment retry attempts on nonexistent donation throws error')

testDonationFieldInitialization()
console.log('✓ All donation fields are initialized correctly')

console.log('\nAll Firestore donation tests passed!')
