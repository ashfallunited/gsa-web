import assert from 'assert'
import type { DonationInput, DonationStatus } from '@/types/donation'
import { PROCESSING_FEE_RATE, DONATION_STATUS } from '../constants'

/**
 * Mock implementation of Supabase functions for testing
 * In a real environment, these would use the Supabase SDK
 */

interface MockDonation {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  message: string | null
  ip_address: string
  amount_usd: number
  payment_method: 'card' | 'mobile'
  cover_fees: boolean
  fee_usd: number
  total_usd: number
  reference_id: string
  status: DonationStatus
  dollr_status: string
  created_at: string
  updated_at: string
  completed_at: string | null
  email_sent: boolean
  admin_notes: string | null
  retry_attempts: number
  next_retry_at: string | null
}

interface MockEmailLog {
  id: string
  donation_id: string
  email_type: 'auto_thank_you' | 'admin_custom'
  recipient_email: string
  subject: string
  admin_email: string | null
  sent_at: string
  status: string
}

// Mock database to store donations and email logs
const mockDatabase: Map<string, MockDonation> = new Map()
const mockEmailLogs: MockEmailLog[] = []
let mockEmailLogIdCounter = 1

/**
 * Mock saveDonationToSupabase for testing
 */
function mockSaveDonationToSupabase(
  input: DonationInput,
  ipAddress: string,
  referenceId: string,
  firebaseId: string
): void {
  const feeUsd = input.coverFees
    ? Math.round(input.amountUsd * PROCESSING_FEE_RATE * 100) / 100
    : 0
  const totalUsd = input.amountUsd + feeUsd

  const now = new Date().toISOString()

  const donation: MockDonation = {
    id: firebaseId,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    country: input.country,
    message: input.message || null,
    ip_address: ipAddress,
    amount_usd: input.amountUsd,
    payment_method: input.paymentMethod,
    cover_fees: input.coverFees,
    fee_usd: feeUsd,
    total_usd: totalUsd,
    reference_id: referenceId,
    status: DONATION_STATUS.PENDING,
    dollr_status: '',
    created_at: now,
    updated_at: now,
    completed_at: null,
    email_sent: false,
    admin_notes: null,
    retry_attempts: 0,
    next_retry_at: null,
  }

  mockDatabase.set(firebaseId, donation)
}

/**
 * Mock updateSupabaseDonation for testing
 */
function mockUpdateSupabaseDonation(
  id: string,
  status: DonationStatus,
  dollrStatus: string,
  notes?: string
): void {
  const donation = mockDatabase.get(id)
  if (!donation) {
    throw new Error(`Donation with id ${id} not found`)
  }

  const now = new Date().toISOString()

  donation.status = status
  donation.dollr_status = dollrStatus
  donation.updated_at = now

  if (notes) {
    donation.admin_notes = notes
  }

  if (status === DONATION_STATUS.COMPLETED) {
    donation.completed_at = now
  }

  mockDatabase.set(id, donation)
}

/**
 * Mock markEmailSentSupabase for testing
 */
function mockMarkEmailSentSupabase(donationId: string): void {
  const donation = mockDatabase.get(donationId)
  if (!donation) {
    throw new Error(`Donation with id ${donationId} not found`)
  }

  const now = new Date().toISOString()

  donation.email_sent = true
  donation.updated_at = now

  mockDatabase.set(donationId, donation)
}

/**
 * Mock logEmail for testing
 */
function mockLogEmail(
  donationId: string,
  emailType: 'auto_thank_you' | 'admin_custom',
  recipientEmail: string,
  subject: string,
  adminEmail?: string
): void {
  const now = new Date().toISOString()

  const emailLog: MockEmailLog = {
    id: String(mockEmailLogIdCounter++),
    donation_id: donationId,
    email_type: emailType,
    recipient_email: recipientEmail,
    subject,
    admin_email: adminEmail || null,
    sent_at: now,
    status: 'sent',
  }

  mockEmailLogs.push(emailLog)
}

// ============ TESTS ============

function testSaveDonationWithoutFees(): void {
  mockDatabase.clear()
  mockEmailLogs.length = 0

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

  const firebaseId = 'donation-001'
  mockSaveDonationToSupabase(input, '192.168.1.1', 'ref123', firebaseId)
  const donation = mockDatabase.get(firebaseId)

  assert(donation !== undefined, 'Donation should be saved')
  assert.strictEqual(donation!.first_name, 'John', 'First name should be stored (snake_case)')
  assert.strictEqual(donation!.amount_usd, 100, 'Amount should be 100 (snake_case)')
  assert.strictEqual(donation!.fee_usd, 0, 'Fee should be 0 when coverFees is false')
  assert.strictEqual(donation!.total_usd, 100, 'Total should be 100')
  assert.strictEqual(donation!.status, DONATION_STATUS.PENDING, 'Status should be pending')
  assert.strictEqual(donation!.ip_address, '192.168.1.1', 'IP address should be stored (snake_case)')
  assert.strictEqual(donation!.reference_id, 'ref123', 'Reference ID should be stored (snake_case)')
  assert.strictEqual(donation!.id, firebaseId, 'ID should match Firebase ID for dual-write consistency')
}

function testSaveDonationWithFees(): void {
  mockDatabase.clear()
  mockEmailLogs.length = 0

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

  const firebaseId = 'donation-002'
  mockSaveDonationToSupabase(input, '10.0.0.1', 'ref456', firebaseId)
  const donation = mockDatabase.get(firebaseId)

  assert(donation !== undefined, 'Donation should be saved')
  // Fee calculation: 100 * 0.029 = 2.9, rounded to nearest cent = 2.90
  const expectedFee = Math.round(100 * PROCESSING_FEE_RATE * 100) / 100
  assert.strictEqual(donation!.fee_usd, expectedFee, `Fee should be ${expectedFee}`)
  assert.strictEqual(donation!.total_usd, 100 + expectedFee, `Total should be ${100 + expectedFee}`)
  assert.strictEqual(donation!.cover_fees, true, 'cover_fees should be true')
}

function testFeeCalculationPrecision(): void {
  // Test that fee calculation is precise to 2 decimal places
  const amounts = [25, 50, 100, 250, 500]

  amounts.forEach((amount) => {
    mockDatabase.clear()

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

    const firebaseId = `donation-fee-${amount}`
    mockSaveDonationToSupabase(input, '192.168.1.1', `ref_${amount}`, firebaseId)
    const donation = mockDatabase.get(firebaseId)!

    // Verify fee is exactly 2 decimal places
    const feeDecimalPlaces = String(donation.fee_usd).split('.')[1]?.length || 0
    assert(feeDecimalPlaces <= 2, `Fee for ${amount} should have max 2 decimal places`)

    // Verify total is calculated correctly
    const calculatedTotal = donation.amount_usd + donation.fee_usd
    assert(
      Math.abs(donation.total_usd - calculatedTotal) < 0.01,
      `Total should equal amount + fee`
    )
  })
}

function testFieldMappingSnakeCase(): void {
  mockDatabase.clear()
  mockEmailLogs.length = 0

  const input: DonationInput = {
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice@example.com',
    phone: '+1111111111',
    country: 'CA',
    amountUsd: 250,
    paymentMethod: 'card',
    coverFees: true,
    message: 'Test message',
  }

  const firebaseId = 'donation-mapping-test'
  mockSaveDonationToSupabase(input, '10.10.10.10', 'ref-mapping', firebaseId)
  const donation = mockDatabase.get(firebaseId)!

  // Verify all fields use snake_case
  assert.strictEqual(donation.first_name, input.firstName, 'Should map firstName → first_name')
  assert.strictEqual(donation.last_name, input.lastName, 'Should map lastName → last_name')
  assert.strictEqual(donation.amount_usd, input.amountUsd, 'Should map amountUsd → amount_usd')
  assert.strictEqual(
    donation.payment_method,
    input.paymentMethod,
    'Should map paymentMethod → payment_method'
  )
  assert.strictEqual(donation.cover_fees, input.coverFees, 'Should map coverFees → cover_fees')
  assert.strictEqual(donation.ip_address, '10.10.10.10', 'Should map ipAddress → ip_address')
  assert.strictEqual(donation.reference_id, 'ref-mapping', 'Should map referenceId → reference_id')
}

function testSaveDonationInitializesAllFields(): void {
  mockDatabase.clear()
  mockEmailLogs.length = 0

  const input: DonationInput = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
  }

  const firebaseId = 'donation-init-test'
  mockSaveDonationToSupabase(input, '192.168.1.1', 'ref-init', firebaseId)
  const donation = mockDatabase.get(firebaseId)!

  // Verify all fields are initialized correctly
  assert.strictEqual(donation.email_sent, false, 'email_sent should be false')
  assert.strictEqual(donation.admin_notes, null, 'admin_notes should be null')
  assert.strictEqual(donation.retry_attempts, 0, 'retry_attempts should be 0')
  assert.strictEqual(donation.next_retry_at, null, 'next_retry_at should be null')
  assert.strictEqual(donation.dollr_status, '', 'dollr_status should be empty string')
  assert.strictEqual(donation.completed_at, null, 'completed_at should be null')
  assert(donation.created_at !== null, 'created_at should be set')
  assert(donation.updated_at !== null, 'updated_at should be set')
}

function testUpdateSupabaseDonationStatus(): void {
  mockDatabase.clear()
  mockEmailLogs.length = 0

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

  const firebaseId = 'donation-update-test'
  mockSaveDonationToSupabase(input, '192.168.1.1', 'ref-update', firebaseId)
  mockUpdateSupabaseDonation(firebaseId, DONATION_STATUS.PROCESSING, 'processing_at_dollr')

  const updated = mockDatabase.get(firebaseId)!
  assert.strictEqual(updated.status, DONATION_STATUS.PROCESSING, 'Status should be updated')
  assert.strictEqual(updated.dollr_status, 'processing_at_dollr', 'Dollr status should be updated')
}

function testUpdateSupabaseDonationWithNotes(): void {
  mockDatabase.clear()
  mockEmailLogs.length = 0

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

  const firebaseId = 'donation-notes-test'
  mockSaveDonationToSupabase(input, '192.168.1.1', 'ref-notes', firebaseId)
  mockUpdateSupabaseDonation(
    firebaseId,
    DONATION_STATUS.FAILED,
    'failed_at_dollr',
    'Payment declined by issuer'
  )

  const updated = mockDatabase.get(firebaseId)!
  assert.strictEqual(updated.status, DONATION_STATUS.FAILED, 'Status should be failed')
  assert.strictEqual(
    updated.admin_notes,
    'Payment declined by issuer',
    'Admin notes should be updated'
  )
}

function testUpdateSupabaseDonationToCompletedSetsTimestamp(): void {
  mockDatabase.clear()
  mockEmailLogs.length = 0

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

  const firebaseId = 'donation-completed-test'
  mockSaveDonationToSupabase(input, '192.168.1.1', 'ref-completed', firebaseId)
  assert.strictEqual(
    mockDatabase.get(firebaseId)!.completed_at,
    null,
    'completed_at should be null initially'
  )

  mockUpdateSupabaseDonation(firebaseId, DONATION_STATUS.COMPLETED, 'completed_at_dollr')

  const updated = mockDatabase.get(firebaseId)!
  assert.strictEqual(updated.status, DONATION_STATUS.COMPLETED, 'Status should be completed')
  assert(updated.completed_at !== null, 'completed_at should be set')
}

function testMarkEmailSentSupabase(): void {
  mockDatabase.clear()
  mockEmailLogs.length = 0

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

  const firebaseId = 'donation-email-test'
  mockSaveDonationToSupabase(input, '192.168.1.1', 'ref-email', firebaseId)
  assert.strictEqual(
    mockDatabase.get(firebaseId)!.email_sent,
    false,
    'email_sent should be false initially'
  )

  mockMarkEmailSentSupabase(firebaseId)

  const updated = mockDatabase.get(firebaseId)!
  assert.strictEqual(updated.email_sent, true, 'email_sent should be true after marking')
}

function testLogEmailAutoThankYou(): void {
  mockDatabase.clear()
  mockEmailLogs.length = 0
  mockEmailLogIdCounter = 1

  const firebaseId = 'donation-log-auto'
  mockLogEmail(firebaseId, 'auto_thank_you', 'john@example.com', 'Thank you for your donation')

  assert.strictEqual(mockEmailLogs.length, 1, 'Should have 1 email log')
  const log = mockEmailLogs[0]!
  assert.strictEqual(log.donation_id, firebaseId, 'donation_id should match')
  assert.strictEqual(log.email_type, 'auto_thank_you', 'email_type should be auto_thank_you')
  assert.strictEqual(log.recipient_email, 'john@example.com', 'recipient_email should match')
  assert.strictEqual(log.subject, 'Thank you for your donation', 'subject should match')
  assert.strictEqual(log.admin_email, null, 'admin_email should be null for auto emails')
  assert.strictEqual(log.status, 'sent', 'status should be sent')
}

function testLogEmailAdminCustom(): void {
  mockDatabase.clear()
  mockEmailLogs.length = 0
  mockEmailLogIdCounter = 1

  const firebaseId = 'donation-log-custom'
  mockLogEmail(
    firebaseId,
    'admin_custom',
    'donor@example.com',
    'Custom message from admin',
    'admin@example.com'
  )

  assert.strictEqual(mockEmailLogs.length, 1, 'Should have 1 email log')
  const log = mockEmailLogs[0]!
  assert.strictEqual(log.donation_id, firebaseId, 'donation_id should match')
  assert.strictEqual(log.email_type, 'admin_custom', 'email_type should be admin_custom')
  assert.strictEqual(log.admin_email, 'admin@example.com', 'admin_email should be set')
}

function testLogEmailMultiple(): void {
  mockDatabase.clear()
  mockEmailLogs.length = 0
  mockEmailLogIdCounter = 1

  const firebaseId = 'donation-multi-log'

  mockLogEmail(firebaseId, 'auto_thank_you', 'donor@example.com', 'Thank you')
  mockLogEmail(firebaseId, 'admin_custom', 'donor@example.com', 'Custom follow-up', 'admin@example.com')

  assert.strictEqual(mockEmailLogs.length, 2, 'Should have 2 email logs')
  assert.strictEqual(mockEmailLogs[0]!.email_type, 'auto_thank_you', 'First log should be auto')
  assert.strictEqual(mockEmailLogs[1]!.email_type, 'admin_custom', 'Second log should be custom')
}

function testUpdateNonexistentDonationThrows(): void {
  mockDatabase.clear()

  assert.throws(
    () => mockUpdateSupabaseDonation('nonexistent', DONATION_STATUS.COMPLETED, 'test'),
    /not found/,
    'Should throw error for nonexistent donation'
  )
}

function testMarkEmailSentNonexistentThrows(): void {
  mockDatabase.clear()

  assert.throws(
    () => mockMarkEmailSentSupabase('nonexistent'),
    /not found/,
    'Should throw error for nonexistent donation'
  )
}

function testDualWriteConsistency(): void {
  // Test that the same Firebase ID is used consistently across writes
  mockDatabase.clear()
  mockEmailLogs.length = 0

  const input: DonationInput = {
    firstName: 'Consistency',
    lastName: 'Test',
    email: 'consistency@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 100,
    paymentMethod: 'card',
    coverFees: false,
  }

  const firebaseId = 'firebase-uuid-12345'
  mockSaveDonationToSupabase(input, '192.168.1.1', 'ref-consistent', firebaseId)

  const donation = mockDatabase.get(firebaseId)!
  assert.strictEqual(
    donation.id,
    firebaseId,
    'Supabase donation ID should match Firebase ID for consistency'
  )

  // Update using the same ID
  mockUpdateSupabaseDonation(firebaseId, DONATION_STATUS.PROCESSING, 'processing')
  const updated = mockDatabase.get(firebaseId)!
  assert.strictEqual(updated.id, firebaseId, 'ID should remain consistent after update')

  // Log email using the same ID
  mockLogEmail(firebaseId, 'auto_thank_you', 'test@example.com', 'Subject')
  const log = mockEmailLogs[0]!
  assert.strictEqual(log.donation_id, firebaseId, 'Email log should reference same donation ID')
}

// ============ RUN TESTS ============

console.log('Running Supabase donation tests...\n')

testSaveDonationWithoutFees()
console.log('✓ Save donation without fees')

testSaveDonationWithFees()
console.log('✓ Save donation with fees')

testFeeCalculationPrecision()
console.log('✓ Fee calculation is precise to 2 decimal places')

testFieldMappingSnakeCase()
console.log('✓ Field mapping converts camelCase to snake_case')

testSaveDonationInitializesAllFields()
console.log('✓ Save donation initializes all fields correctly')

testUpdateSupabaseDonationStatus()
console.log('✓ Update donation status')

testUpdateSupabaseDonationWithNotes()
console.log('✓ Update donation status with admin notes')

testUpdateSupabaseDonationToCompletedSetsTimestamp()
console.log('✓ Update to completed sets completed_at timestamp')

testMarkEmailSentSupabase()
console.log('✓ Mark email as sent')

testLogEmailAutoThankYou()
console.log('✓ Log auto thank you email')

testLogEmailAdminCustom()
console.log('✓ Log admin custom email with admin_email field')

testLogEmailMultiple()
console.log('✓ Log multiple emails for same donation')

testUpdateNonexistentDonationThrows()
console.log('✓ Update nonexistent donation throws error')

testMarkEmailSentNonexistentThrows()
console.log('✓ Mark email sent on nonexistent donation throws error')

testDualWriteConsistency()
console.log('✓ Dual-write consistency with Firebase IDs')

console.log('\nAll Supabase donation tests passed!')
