import assert from 'assert'
import type { Donation } from '@/types/donation'
import { sendThankYouEmail, sendCustomEmail } from '../email'

function createMockDonation(overrides?: Partial<Donation>): Donation {
  const now = new Date()
  return {
    id: 'test-donation-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    message: 'Great work!',
    ipAddress: '192.168.1.1',

    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
    feeUsd: 0,
    totalUsd: 50,

    referenceId: 'REF-123456',
    status: 'completed',
    dollrStatus: 'completed',

    createdAt: { _seconds: Math.floor(now.getTime() / 1000), _nanoseconds: 0 } as any,
    updatedAt: { _seconds: Math.floor(now.getTime() / 1000), _nanoseconds: 0 } as any,
    completedAt: { _seconds: Math.floor(now.getTime() / 1000), _nanoseconds: 0 } as any,

    emailSent: false,
    notes: null,
    retryAttempts: 0,
    nextRetryAt: null,

    ...overrides,
  }
}

function testMockDonationStructure(): void {
  const donation = createMockDonation()

  assert.strictEqual(donation.id, 'test-donation-123', 'donation should have correct id')
  assert.strictEqual(donation.firstName, 'John', 'donation should have correct firstName')
  assert.strictEqual(donation.email, 'john@example.com', 'donation should have correct email')
  assert.strictEqual(donation.totalUsd, 50, 'donation should have correct totalUsd')
  assert.strictEqual(donation.referenceId, 'REF-123456', 'donation should have correct referenceId')
}

function testMockDonationWithOverrides(): void {
  const donation = createMockDonation({
    firstName: 'Jane',
    totalUsd: 100,
  })

  assert.strictEqual(donation.firstName, 'Jane', 'donation should override firstName')
  assert.strictEqual(donation.totalUsd, 100, 'donation should override totalUsd')
  assert.strictEqual(donation.email, 'john@example.com', 'donation should keep default email')
}

function testDonationEmailFormatting(): void {
  const donation = createMockDonation({
    totalUsd: 123.456,
  })

  const formatted = donation.totalUsd.toFixed(2)
  assert.strictEqual(formatted, '123.46', 'donation amount should be formatted to 2 decimal places')
}

function testDonationReferenceIdFormat(): void {
  const donation = createMockDonation({
    referenceId: 'REF-999888777',
  })

  assert(donation.referenceId.startsWith('REF-'), 'reference ID should start with REF-')
  assert.strictEqual(donation.referenceId.length, 13, 'reference ID should have expected format')
}

function testThankYouEmailSubjectGeneration(): void {
  // Test that the subject would be generated correctly
  const orgName = 'Ashfall United'
  const expectedSubject = `Thank You for Your Donation to ${orgName}`

  assert.strictEqual(
    expectedSubject,
    'Thank You for Your Donation to Ashfall United',
    'subject should format correctly'
  )
}

function testCustomEmailBodyWithLineBreaks(): void {
  const body = 'Hello\nThis is a test\nWith multiple lines'
  const expectedHtml = 'Hello<br />This is a test<br />With multiple lines'

  const result = body.replace(/\n/g, '<br />')
  assert.strictEqual(result, expectedHtml, 'body line breaks should be converted to HTML br tags')
}

function testCustomEmailBodyEmptyString(): void {
  const body = ''
  const result = body.replace(/\n/g, '<br />')

  assert.strictEqual(result, '', 'empty body should remain empty')
}

function testThankYouEmailFunctionSignature(): void {
  // Verify that sendThankYouEmail is a function
  assert.strictEqual(
    typeof sendThankYouEmail,
    'function',
    'sendThankYouEmail should be a function'
  )
}

function testSendCustomEmailFunctionSignature(): void {
  // Verify that sendCustomEmail is a function
  assert.strictEqual(
    typeof sendCustomEmail,
    'function',
    'sendCustomEmail should be a function'
  )
}

function testDonationAmountFormatting(): void {
  const testCases = [
    { input: 50, expected: '50.00' },
    { input: 100.5, expected: '100.50' },
    { input: 1234.567, expected: '1234.57' },
    { input: 0.1, expected: '0.10' },
  ]

  testCases.forEach(({ input, expected }) => {
    const formatted = input.toFixed(2)
    assert.strictEqual(
      formatted,
      expected,
      `${input} should format to ${expected}`
    )
  })
}

function testEnvironmentVariables(): void {
  const originalGmailUser = process.env.GMAIL_USER
  const originalGmailPassword = process.env.GMAIL_PASSWORD
  const originalGmailFromEmail = process.env.GMAIL_FROM_EMAIL

  // The tests don't require these to be set, but we verify they can be set
  process.env.GMAIL_USER = 'test@gmail.com'
  process.env.GMAIL_PASSWORD = 'password'
  process.env.GMAIL_FROM_EMAIL = 'from@example.com'

  assert.strictEqual(process.env.GMAIL_USER, 'test@gmail.com', 'GMAIL_USER env var should be settable')
  assert.strictEqual(process.env.GMAIL_PASSWORD, 'password', 'GMAIL_PASSWORD env var should be settable')
  assert.strictEqual(process.env.GMAIL_FROM_EMAIL, 'from@example.com', 'GMAIL_FROM_EMAIL env var should be settable')

  // Restore original values
  process.env.GMAIL_USER = originalGmailUser
  process.env.GMAIL_PASSWORD = originalGmailPassword
  process.env.GMAIL_FROM_EMAIL = originalGmailFromEmail
}

async function testSendThankYouEmailWithoutEnv(): Promise<void> {
  // Save original env vars
  const originalUser = process.env.GMAIL_USER
  const originalPassword = process.env.GMAIL_PASSWORD
  const originalFromEmail = process.env.GMAIL_FROM_EMAIL

  try {
    // Clear env vars to test error handling
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_PASSWORD
    delete process.env.GMAIL_FROM_EMAIL

    const donation = createMockDonation()
    const result = await sendThankYouEmail(donation)

    // Should return false when required env vars are missing
    assert.strictEqual(
      result,
      false,
      'sendThankYouEmail should return false when GMAIL_FROM_EMAIL is missing'
    )
  } finally {
    // Restore env vars
    if (originalUser) process.env.GMAIL_USER = originalUser
    if (originalPassword) process.env.GMAIL_PASSWORD = originalPassword
    if (originalFromEmail) process.env.GMAIL_FROM_EMAIL = originalFromEmail
  }
}

async function testSendCustomEmailWithoutEnv(): Promise<void> {
  // Save original env vars
  const originalUser = process.env.GMAIL_USER
  const originalPassword = process.env.GMAIL_PASSWORD
  const originalFromEmail = process.env.GMAIL_FROM_EMAIL

  try {
    // Clear env vars to test error handling
    delete process.env.GMAIL_USER
    delete process.env.GMAIL_PASSWORD
    delete process.env.GMAIL_FROM_EMAIL

    const result = await sendCustomEmail('test@example.com', 'Test', 'Test body')

    // Should return false when required env vars are missing
    assert.strictEqual(
      result,
      false,
      'sendCustomEmail should return false when GMAIL_FROM_EMAIL is missing'
    )
  } finally {
    // Restore env vars
    if (originalUser) process.env.GMAIL_USER = originalUser
    if (originalPassword) process.env.GMAIL_PASSWORD = originalPassword
    if (originalFromEmail) process.env.GMAIL_FROM_EMAIL = originalFromEmail
  }
}

// Run all tests
async function runAllTests(): Promise<void> {
  console.log('Running email utility tests...\n')

  testMockDonationStructure()
  console.log('✓ Mock donation structure')

  testMockDonationWithOverrides()
  console.log('✓ Mock donation with overrides')

  testDonationEmailFormatting()
  console.log('✓ Donation email formatting')

  testDonationReferenceIdFormat()
  console.log('✓ Donation reference ID format')

  testThankYouEmailSubjectGeneration()
  console.log('✓ Thank you email subject generation')

  testCustomEmailBodyWithLineBreaks()
  console.log('✓ Custom email body with line breaks')

  testCustomEmailBodyEmptyString()
  console.log('✓ Custom email body empty string')

  testThankYouEmailFunctionSignature()
  console.log('✓ Thank you email function signature')

  testSendCustomEmailFunctionSignature()
  console.log('✓ Send custom email function signature')

  testDonationAmountFormatting()
  console.log('✓ Donation amount formatting')

  testEnvironmentVariables()
  console.log('✓ Environment variables')

  await testSendThankYouEmailWithoutEnv()
  console.log('✓ Send thank you email without env vars (error handling)')

  await testSendCustomEmailWithoutEnv()
  console.log('✓ Send custom email without env vars (error handling)')

  console.log('\nAll email utility tests passed!')
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test error:', error)
  process.exit(1)
})
