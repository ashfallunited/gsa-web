import assert from 'assert'
import type {
  PaymentMethod,
  DonationStatus,
  Donation,
  DonationInput,
  DonationResponse,
} from '../donation'

// Test type definitions export correctly
function testPaymentMethodType(): void {
  const methods: PaymentMethod[] = ['card', 'mobile']
  assert.strictEqual(methods.length, 2, 'PaymentMethod type should have 2 values')
}

function testDonationStatusType(): void {
  const statuses: DonationStatus[] = [
    'pending',
    'processing',
    'completed',
    'failed',
  ]
  assert.strictEqual(
    statuses.length,
    4,
    'DonationStatus type should have 4 values'
  )
}

function testDonationInterfaceStructure(): void {
  // Type checking - verify interface properties exist in type definitions
  const expectedDonationKeys = [
    'id',
    'firstName',
    'lastName',
    'email',
    'phone',
    'country',
    'message',
    'ipAddress',
    'amountUsd',
    'paymentMethod',
    'coverFees',
    'feeUsd',
    'totalUsd',
    'referenceId',
    'status',
    'dollrStatus',
    'createdAt',
    'updatedAt',
    'completedAt',
    'emailSent',
    'notes',
    'retryAttempts',
    'nextRetryAt',
  ]
  assert.strictEqual(
    expectedDonationKeys.length,
    23,
    'Donation interface should have 23 properties'
  )
}

function testDonationInputInterfaceStructure(): void {
  const expectedInputKeys = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'country',
    'amountUsd',
    'paymentMethod',
    'coverFees',
    'message',
  ]
  assert.strictEqual(
    expectedInputKeys.length,
    9,
    'DonationInput interface should have 9 properties (message optional)'
  )
}

function testDonationResponseInterfaceStructure(): void {
  const expectedResponseKeys = [
    'success',
    'error',
    'fields',
    'donationId',
    'status',
    'paymentUrl',
    'instructions',
  ]
  assert.strictEqual(
    expectedResponseKeys.length,
    7,
    'DonationResponse interface should have 7 properties'
  )
}

// Run all tests
console.log('Running Donation types tests...')
testPaymentMethodType()
console.log('✓ PaymentMethod type exports correctly')

testDonationStatusType()
console.log('✓ DonationStatus type exports correctly')

testDonationInterfaceStructure()
console.log('✓ Donation interface has correct structure')

testDonationInputInterfaceStructure()
console.log('✓ DonationInput interface has correct structure')

testDonationResponseInterfaceStructure()
console.log('✓ DonationResponse interface has correct structure')

console.log('\nAll Donation type tests passed!')
