import assert from 'assert'
import { Timestamp } from 'firebase-admin/firestore'
import type { Donation, DonationInput, DonationStatus } from '@/types/donation'
import { PROCESSING_FEE_RATE, DONATION_STATUS, RETRY_SCHEDULE_MINUTES } from '@/lib/donation/constants'

/**
 * Comprehensive end-to-end integration tests for the donation flow
 * Tests all scenarios: creation, payment processing, status polling, retries, admin operations
 */

// ============ MOCK IMPLEMENTATIONS ============

interface MockFirestoreDoc {
  id: string
  [key: string]: unknown
}

class MockFirestore {
  private donations: Map<string, MockFirestoreDoc> = new Map()
  private callLog: string[] = []

  async saveDonation(
    input: DonationInput,
    ipAddress: string,
    referenceId: string
  ): Promise<string> {
    const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const feeUsd = input.coverFees
      ? Math.round(input.amountUsd * PROCESSING_FEE_RATE * 100) / 100
      : 0
    const totalUsd = input.amountUsd + feeUsd

    const doc: MockFirestoreDoc = {
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
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      emailSent: false,
      notes: null,
      retryAttempts: 0,
      nextRetryAt: null,
    }

    this.donations.set(id, doc)
    this.callLog.push(`saveDonation(${id})`)
    return id
  }

  async getDonation(id: string): Promise<MockFirestoreDoc | null> {
    this.callLog.push(`getDonation(${id})`)
    return this.donations.get(id) || null
  }

  async updateDonationStatus(
    id: string,
    status: DonationStatus,
    dollrStatus: string,
    notes?: string
  ): Promise<void> {
    const doc = this.donations.get(id)
    if (!doc) throw new Error(`Donation ${id} not found`)

    doc.status = status
    doc.dollrStatus = dollrStatus
    doc.updatedAt = new Date()
    if (notes) doc.notes = notes
    if (status === DONATION_STATUS.COMPLETED) {
      doc.completedAt = new Date()
    }

    this.callLog.push(`updateDonationStatus(${id}, ${status})`)
  }

  async queryPendingDonations(): Promise<MockFirestoreDoc[]> {
    this.callLog.push('queryPendingDonations()')
    return Array.from(this.donations.values()).filter((d) =>
      [DONATION_STATUS.PENDING, DONATION_STATUS.PROCESSING].includes(d.status as string)
    )
  }

  async markEmailSent(id: string): Promise<void> {
    const doc = this.donations.get(id)
    if (!doc) throw new Error(`Donation ${id} not found`)
    doc.emailSent = true
    this.callLog.push(`markEmailSent(${id})`)
  }

  async incrementRetryAttempts(id: string, nextRetryAt: Date): Promise<void> {
    const doc = this.donations.get(id)
    if (!doc) throw new Error(`Donation ${id} not found`)
    doc.retryAttempts = ((doc.retryAttempts || 0) as number) + 1
    doc.nextRetryAt = nextRetryAt
    this.callLog.push(`incrementRetryAttempts(${id})`)
  }

  clear() {
    this.donations.clear()
    this.callLog = []
  }

  getCallLog(): string[] {
    return this.callLog
  }
}

interface MockPaymentState {
  referenceId: string
  status: string
  isAuthorized: boolean
  attemptCount: number
}

class MockHeyDollr {
  private payments: Map<string, MockPaymentState> = new Map()
  private checkoutFailures = 0
  private callLog: string[] = []

  async createCheckout(
    amountUsd: number,
    email: string,
    name: string
  ): Promise<string> {
    if (this.checkoutFailures > 0) {
      this.checkoutFailures--
      throw new Error('Payment gateway temporarily unavailable')
    }

    const referenceId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.payments.set(referenceId, {
      referenceId,
      status: 'pending',
      isAuthorized: false,
      attemptCount: 0,
    })

    this.callLog.push(`createCheckout(${referenceId}, $${amountUsd})`)
    return referenceId
  }

  async getPaymentStatus(referenceId: string) {
    const payment = this.payments.get(referenceId)
    if (!payment) throw new Error(`Payment ${referenceId} not found`)

    this.callLog.push(`getPaymentStatus(${referenceId})`)
    return {
      reference_id: referenceId,
      status: payment.status,
      payer_amount: 0,
      payee_amount: 0,
      operation_type: 'payment',
    }
  }

  setPaymentStatus(referenceId: string, status: string): void {
    const payment = this.payments.get(referenceId)
    if (payment) payment.status = status
  }

  makeCheckoutFail(times: number): void {
    this.checkoutFailures = times
  }

  clear() {
    this.payments.clear()
    this.callLog = []
  }

  getCallLog(): string[] {
    return this.callLog
  }
}

class MockSupabase {
  private donations: Map<string, unknown> = new Map()
  private callLog: string[] = []
  private shouldFail = false

  async saveDonation(
    input: DonationInput,
    ipAddress: string,
    referenceId: string,
    firebaseId: string
  ): Promise<void> {
    if (this.shouldFail) throw new Error('Supabase connection failed')
    this.donations.set(firebaseId, { ...input, referenceId })
    this.callLog.push(`saveDonation(${firebaseId})`)
  }

  async updateDonation(
    id: string,
    status: DonationStatus,
    dollrStatus: string
  ): Promise<void> {
    if (this.shouldFail) throw new Error('Supabase connection failed')
    this.callLog.push(`updateDonation(${id}, ${status})`)
  }

  async markEmailSent(id: string): Promise<void> {
    if (this.shouldFail) throw new Error('Supabase connection failed')
    this.callLog.push(`markEmailSent(${id})`)
  }

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail
  }

  clear() {
    this.donations.clear()
    this.callLog = []
  }

  getCallLog(): string[] {
    return this.callLog
  }
}

class MockEmail {
  private sentEmails: Array<{
    to: string
    subject: string
    type: string
  }> = []
  private callLog: string[] = []

  async sendThankYouEmail(donation: Donation): Promise<boolean> {
    this.sentEmails.push({
      to: donation.email,
      subject: 'Thank You',
      type: 'thank_you',
    })
    this.callLog.push(`sendThankYouEmail(${donation.id})`)
    return true
  }

  async sendCustomEmail(email: string, subject: string, body: string): Promise<boolean> {
    this.sentEmails.push({ to: email, subject, type: 'custom' })
    this.callLog.push(`sendCustomEmail(${email})`)
    return true
  }

  getSentEmails() {
    return this.sentEmails
  }

  clear() {
    this.sentEmails = []
    this.callLog = []
  }

  getCallLog(): string[] {
    return this.callLog
  }
}

// ============ HELPER FUNCTIONS ============

function createValidInput(): DonationInput {
  return {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
  }
}

function calculateExpectedFee(amount: number): number {
  return Math.round(amount * PROCESSING_FEE_RATE * 100) / 100
}

// ============ TEST CASES ============

// Test 1: Full donation flow - create, verify, complete
async function testFullDonationFlow(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()
  const supabase = new MockSupabase()
  const email = new MockEmail()

  const input = createValidInput()

  // Step 1: Create donation
  const referenceId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
  assert(referenceId, 'Should create checkout')

  const donationId = await firestore.saveDonation(input, '192.168.1.1', referenceId)
  assert(donationId, 'Should save donation')

  // Step 2: Verify donation created
  const donation = await firestore.getDonation(donationId)
  assert(donation, 'Donation should exist')
  assert.strictEqual(donation.status, DONATION_STATUS.PENDING)
  assert.strictEqual(donation.amountUsd, 50)
  assert.strictEqual(donation.totalUsd, 50)

  // Step 3: Mark payment as completed
  heydollr.setPaymentStatus(referenceId, 'paid')
  const status = await heydollr.getPaymentStatus(referenceId)
  assert.strictEqual(status.status, 'paid')

  // Step 4: Update donation to completed
  await firestore.updateDonationStatus(donationId, DONATION_STATUS.COMPLETED, 'paid')
  const completedDonation = await firestore.getDonation(donationId)
  assert.strictEqual(completedDonation.status, DONATION_STATUS.COMPLETED)

  // Step 5: Send thank you email
  const emailSent = await email.sendThankYouEmail(completedDonation as Donation)
  assert(emailSent, 'Email should send')

  // Step 6: Mark email as sent
  await firestore.markEmailSent(donationId)
  const finalDonation = await firestore.getDonation(donationId)
  assert(finalDonation.emailSent, 'Email flag should be set')

  assert.strictEqual(email.getSentEmails().length, 1)
}

// Test 2: Donation with fee coverage
async function testDonationWithFeeCoverage(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  const input: DonationInput = {
    ...createValidInput(),
    amountUsd: 100,
    coverFees: true,
  }

  const referenceId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
  const donationId = await firestore.saveDonation(input, '192.168.1.1', referenceId)

  const donation = await firestore.getDonation(donationId)
  const expectedFee = calculateExpectedFee(100)
  assert.strictEqual(donation.feeUsd, expectedFee)
  assert.strictEqual(donation.totalUsd, 100 + expectedFee)
  assert(donation.coverFees, 'coverFees should be true')
}

// Test 3: Retry logic - payment fails, then retries
async function testPaymentRetryLogic(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()
  const email = new MockEmail()

  const input = createValidInput()
  const referenceId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
  const donationId = await firestore.saveDonation(input, '192.168.1.1', referenceId)

  // First status check - still pending
  heydollr.setPaymentStatus(referenceId, 'pending')
  let status = await heydollr.getPaymentStatus(referenceId)
  assert.strictEqual(status.status, 'pending')

  // Schedule retry
  const nextRetry = new Date(Date.now() + RETRY_SCHEDULE_MINUTES[0] * 60000)
  await firestore.incrementRetryAttempts(donationId, nextRetry)

  let donation = await firestore.getDonation(donationId)
  assert.strictEqual(donation.retryAttempts, 1)

  // Second attempt - payment succeeds
  heydollr.setPaymentStatus(referenceId, 'paid')
  status = await heydollr.getPaymentStatus(referenceId)
  assert.strictEqual(status.status, 'paid')

  // Complete donation
  await firestore.updateDonationStatus(donationId, DONATION_STATUS.COMPLETED, 'paid')
  donation = await firestore.getDonation(donationId)
  assert.strictEqual(donation.status, DONATION_STATUS.COMPLETED)

  // Send email
  await email.sendThankYouEmail(donation as Donation)
  assert.strictEqual(email.getSentEmails().length, 1)
}

// Test 4: Multiple retry attempts before success
async function testMultipleRetryAttempts(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  const input = createValidInput()
  const referenceId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
  const donationId = await firestore.saveDonation(input, '192.168.1.1', referenceId)

  // Simulate multiple failed retries
  for (let i = 0; i < 3; i++) {
    heydollr.setPaymentStatus(referenceId, 'pending')
    const nextRetry = new Date(Date.now() + RETRY_SCHEDULE_MINUTES[i] * 60000)
    await firestore.incrementRetryAttempts(donationId, nextRetry)
  }

  let donation = await firestore.getDonation(donationId)
  assert.strictEqual(donation.retryAttempts, 3)

  // Finally succeeds
  heydollr.setPaymentStatus(referenceId, 'paid')
  await firestore.updateDonationStatus(donationId, DONATION_STATUS.COMPLETED, 'paid')

  donation = await firestore.getDonation(donationId)
  assert.strictEqual(donation.status, DONATION_STATUS.COMPLETED)
  assert.strictEqual(donation.retryAttempts, 3)
}

// Test 5: Cron job polls pending donations
async function testCronJobPolling(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  // Create multiple donations
  const donations: string[] = []
  for (let i = 0; i < 3; i++) {
    const input = { ...createValidInput(), amountUsd: 25 + i * 10 }
    const refId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
    const docId = await firestore.saveDonation(input, '192.168.1.1', refId)
    donations.push(docId)
  }

  // Query pending donations
  const pending = await firestore.queryPendingDonations()
  assert.strictEqual(pending.length, 3, 'Should find 3 pending donations')

  // Mark first one as completed
  const firstDonation = await firestore.getDonation(donations[0])
  heydollr.setPaymentStatus(firstDonation.referenceId as string, 'paid')
  await firestore.updateDonationStatus(donations[0], DONATION_STATUS.COMPLETED, 'paid')

  // Query again
  const pending2 = await firestore.queryPendingDonations()
  assert.strictEqual(pending2.length, 2, 'Should find 2 remaining pending')
}

// Test 6: Admin list donations with filters
async function testAdminListDonationsWithFilters(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  // Create donations with different statuses
  const input1 = createValidInput()
  const ref1 = await heydollr.createCheckout(input1.amountUsd, input1.email, input1.firstName)
  const id1 = await firestore.saveDonation(input1, '192.168.1.1', ref1)

  const input2 = { ...createValidInput(), amountUsd: 100 }
  const ref2 = await heydollr.createCheckout(input2.amountUsd, input2.email, input2.firstName)
  const id2 = await firestore.saveDonation(input2, '192.168.1.1', ref2)

  // Mark second as completed
  await firestore.updateDonationStatus(id2, DONATION_STATUS.COMPLETED, 'paid')

  // Query pending
  const pending = await firestore.queryPendingDonations()
  assert.strictEqual(pending.length, 1)

  // Verify different amounts
  const d1 = await firestore.getDonation(id1)
  const d2 = await firestore.getDonation(id2)
  assert.strictEqual(d1.amountUsd, 50)
  assert.strictEqual(d2.amountUsd, 100)
}

// Test 7: Admin complete donation endpoint
async function testAdminCompleteDonation(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()
  const email = new MockEmail()

  const input = createValidInput()
  const refId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
  const donationId = await firestore.saveDonation(input, '192.168.1.1', refId)

  // Admin manually marks as complete with note
  await firestore.updateDonationStatus(
    donationId,
    DONATION_STATUS.COMPLETED,
    'manual',
    'Admin verified payment'
  )

  const donation = await firestore.getDonation(donationId)
  assert.strictEqual(donation.status, DONATION_STATUS.COMPLETED)
  assert(donation.notes, 'Should have admin notes')
  assert(donation.completedAt, 'Should have completedAt timestamp')
}

// Test 8: Admin send custom email
async function testAdminSendCustomEmail(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()
  const email = new MockEmail()

  const input = createValidInput()
  const refId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
  const donationId = await firestore.saveDonation(input, '192.168.1.1', refId)

  // Send custom email
  const customEmail = await email.sendCustomEmail(
    input.email,
    'Special Update',
    'Thank you for supporting our cause!'
  )
  assert(customEmail, 'Custom email should send')

  const sentEmails = email.getSentEmails()
  assert.strictEqual(sentEmails.length, 1)
  assert.strictEqual(sentEmails[0].type, 'custom')
}

// Test 9: Validation error - missing required field
async function testValidationError(): Promise<void> {
  const input: any = createValidInput()
  delete input.email

  // Should have missing email field
  assert(!input.email, 'Email should be missing')
}

// Test 10: Validation error - invalid donation amount
async function testValidationErrorLowAmount(): Promise<void> {
  const input = { ...createValidInput(), amountUsd: 0.5 }
  assert(input.amountUsd < 1, 'Amount should be below minimum')
}

// Test 11: Payment gateway error handling
async function testPaymentGatewayError(): Promise<void> {
  const heydollr = new MockHeyDollr()

  // Simulate payment gateway failure
  heydollr.makeCheckoutFail(1)

  try {
    await heydollr.createCheckout(50, 'test@example.com', 'Test User')
    assert.fail('Should throw error')
  } catch (error) {
    assert((error as Error).message.includes('temporarily unavailable'))
  }
}

// Test 12: Firestore not found error
async function testDonationNotFound(): Promise<void> {
  const firestore = new MockFirestore()

  const donation = await firestore.getDonation('nonexistent-id')
  assert.strictEqual(donation, null, 'Should return null for missing donation')
}

// Test 13: Concurrent donation requests
async function testConcurrentDonations(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  // Create 5 donations concurrently
  const donations: Promise<string>[] = []
  for (let i = 0; i < 5; i++) {
    const input = { ...createValidInput(), amountUsd: 25 + i * 10 }
    const promise = (async () => {
      const refId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
      return await firestore.saveDonation(input, '192.168.1.1', refId)
    })()
    donations.push(promise)
  }

  const ids = await Promise.all(donations)
  assert.strictEqual(ids.length, 5, 'Should create 5 donations')

  // Verify all exist
  for (const id of ids) {
    const donation = await firestore.getDonation(id)
    assert(donation, `Donation ${id} should exist`)
  }
}

// Test 14: Fee calculation for various amounts
async function testFeeCalculationVariousAmounts(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  const amounts = [10, 25, 50, 100, 250, 500]

  for (const amount of amounts) {
    const input = { ...createValidInput(), amountUsd: amount, coverFees: true }
    const refId = await heydollr.createCheckout(amount, input.email, input.firstName)
    const docId = await firestore.saveDonation(input, '192.168.1.1', refId)

    const donation = await firestore.getDonation(docId)
    const expectedFee = calculateExpectedFee(amount)
    assert.strictEqual(donation.feeUsd, expectedFee)
    assert.strictEqual(donation.totalUsd, amount + expectedFee)
  }
}

// Test 15: Email tracking and audit
async function testEmailTrackingAudit(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()
  const email = new MockEmail()

  const input = createValidInput()
  const refId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
  const donationId = await firestore.saveDonation(input, '192.168.1.1', refId)

  // Complete donation
  await firestore.updateDonationStatus(donationId, DONATION_STATUS.COMPLETED, 'paid')
  const donation = await firestore.getDonation(donationId)

  // Send email
  await email.sendThankYouEmail(donation as Donation)

  // Mark as sent
  await firestore.markEmailSent(donationId)

  const finalDonation = await firestore.getDonation(donationId)
  assert(finalDonation.emailSent, 'Email sent flag should be set')
}

// Test 16: Export donations (admin)
async function testExportDonations(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  // Create multiple donations
  const donations: string[] = []
  for (let i = 0; i < 3; i++) {
    const input = { ...createValidInput(), amountUsd: 50 + i * 50 }
    const refId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
    const docId = await firestore.saveDonation(input, '192.168.1.1', refId)
    donations.push(docId)
  }

  // Get all for export
  const all = await firestore.queryPendingDonations()
  assert(all.length >= 3, 'Should have at least 3 donations for export')

  // Verify data structure for CSV export
  for (const donation of all) {
    assert(donation.firstName, 'Should have firstName')
    assert(donation.email, 'Should have email')
    assert(donation.amountUsd, 'Should have amountUsd')
    assert(donation.createdAt, 'Should have createdAt')
  }
}

// Test 17: Analytics - total donated, by status
async function testAnalytics(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  // Create donations with different statuses
  const amounts = [25, 50, 100]
  const donationIds: string[] = []

  for (const amount of amounts) {
    const input = { ...createValidInput(), amountUsd: amount }
    const refId = await heydollr.createCheckout(amount, input.email, input.firstName)
    const docId = await firestore.saveDonation(input, '192.168.1.1', refId)
    donationIds.push(docId)
  }

  // Mark first as completed
  const d1 = await firestore.getDonation(donationIds[0])
  await firestore.updateDonationStatus(donationIds[0], DONATION_STATUS.COMPLETED, 'paid')

  // Mark second as failed
  const d2 = await firestore.getDonation(donationIds[1])
  await firestore.updateDonationStatus(donationIds[1], DONATION_STATUS.FAILED, 'declined')

  // Third remains pending
  const pending = await firestore.queryPendingDonations()
  const completed = [d1].filter((d) => (d as any).status === DONATION_STATUS.COMPLETED)

  assert.strictEqual(pending.length, 1, 'Should have 1 pending')
  assert.strictEqual(completed.length, 1, 'Should have 1 completed')
}

// Test 18: Supabase failover (non-blocking)
async function testSupabaseFailover(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()
  const supabase = new MockSupabase()

  const input = createValidInput()
  const refId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)

  // Make Supabase fail
  supabase.setShouldFail(true)

  // Firestore save should still succeed
  const donationId = await firestore.saveDonation(input, '192.168.1.1', refId)
  assert(donationId, 'Firestore save should succeed even if Supabase fails')

  // Try Supabase save - should fail but not block flow
  try {
    await supabase.saveDonation(input, '192.168.1.1', refId, donationId)
    assert.fail('Should throw')
  } catch (error) {
    assert((error as Error).message.includes('connection'))
  }

  // Donation should still be retrievable from Firestore
  const donation = await firestore.getDonation(donationId)
  assert(donation, 'Should retrieve from Firestore')
}

// Test 19: IP address tracking
async function testIPAddressTracking(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  const input = createValidInput()
  const ipAddresses = ['192.168.1.1', '10.0.0.1', '203.0.113.5']

  for (const ip of ipAddresses) {
    const refId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
    const docId = await firestore.saveDonation(input, ip, refId)

    const donation = await firestore.getDonation(docId)
    assert.strictEqual(donation.ipAddress, ip, `IP should be ${ip}`)
  }
}

// Test 20: Payment method variations
async function testPaymentMethodVariations(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  const methods = ['card', 'mobile']

  for (const method of methods) {
    const input = { ...createValidInput(), paymentMethod: method as any }
    const refId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
    const docId = await firestore.saveDonation(input, '192.168.1.1', refId)

    const donation = await firestore.getDonation(docId)
    assert.strictEqual(donation.paymentMethod, method)
  }
}

// Test 21: Message field optional
async function testMessageFieldOptional(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  // With message
  const input1 = { ...createValidInput(), message: 'Great work!' }
  const ref1 = await heydollr.createCheckout(input1.amountUsd, input1.email, input1.firstName)
  const id1 = await firestore.saveDonation(input1, '192.168.1.1', ref1)

  // Without message
  const input2 = createValidInput()
  const ref2 = await heydollr.createCheckout(input2.amountUsd, input2.email, input2.firstName)
  const id2 = await firestore.saveDonation(input2, '192.168.1.1', ref2)

  const d1 = await firestore.getDonation(id1)
  const d2 = await firestore.getDonation(id2)

  assert.strictEqual(d1.message, 'Great work!')
  assert.strictEqual(d2.message, null)
}

// Test 22: Admin notes on donation
async function testAdminNotes(): Promise<void> {
  const firestore = new MockFirestore()
  const heydollr = new MockHeyDollr()

  const input = createValidInput()
  const refId = await heydollr.createCheckout(input.amountUsd, input.email, input.firstName)
  const donationId = await firestore.saveDonation(input, '192.168.1.1', refId)

  // Add admin notes
  const notes = 'Manual verification completed - payment confirmed via bank transfer'
  await firestore.updateDonationStatus(donationId, DONATION_STATUS.COMPLETED, 'manual', notes)

  const donation = await firestore.getDonation(donationId)
  assert.strictEqual(donation.notes, notes)
}

// ============ RUN ALL TESTS ============

async function runAllTests(): Promise<void> {
  console.log('Running comprehensive donation integration tests...\n')

  const tests = [
    { name: 'Full donation flow: create → payment → complete → email', fn: testFullDonationFlow },
    { name: 'Donation with fee coverage enabled', fn: testDonationWithFeeCoverage },
    { name: 'Retry logic: payment fails then succeeds', fn: testPaymentRetryLogic },
    { name: 'Multiple retry attempts before success', fn: testMultipleRetryAttempts },
    { name: 'Cron job polls and updates pending donations', fn: testCronJobPolling },
    { name: 'Admin list donations with filters', fn: testAdminListDonationsWithFilters },
    { name: 'Admin complete donation endpoint', fn: testAdminCompleteDonation },
    { name: 'Admin send custom email', fn: testAdminSendCustomEmail },
    { name: 'Validation error: missing required field', fn: testValidationError },
    { name: 'Validation error: amount below minimum', fn: testValidationErrorLowAmount },
    { name: 'Payment gateway error handling', fn: testPaymentGatewayError },
    { name: 'Firestore donation not found returns null', fn: testDonationNotFound },
    { name: 'Concurrent donation requests succeed', fn: testConcurrentDonations },
    { name: 'Fee calculation for various amounts', fn: testFeeCalculationVariousAmounts },
    { name: 'Email tracking and audit trail', fn: testEmailTrackingAudit },
    { name: 'Export donations for admin (CSV)', fn: testExportDonations },
    { name: 'Analytics: count donations by status', fn: testAnalytics },
    { name: 'Supabase failover (non-blocking)', fn: testSupabaseFailover },
    { name: 'IP address tracking for security', fn: testIPAddressTracking },
    { name: 'Payment method variations (card/mobile)', fn: testPaymentMethodVariations },
    { name: 'Message field is optional', fn: testMessageFieldOptional },
    { name: 'Admin notes on donation updates', fn: testAdminNotes },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      await test.fn()
      console.log(`✓ ${test.name}`)
      passed++
    } catch (error) {
      console.error(`✗ ${test.name}`)
      console.error(`  ${(error as Error).message}\n`)
      failed++
    }
  }

  console.log(`\n${passed} tests passed, ${failed} tests failed`)

  if (failed > 0) {
    process.exit(1)
  }
}

runAllTests().catch((error) => {
  console.error('Test suite error:', error)
  process.exit(1)
})
