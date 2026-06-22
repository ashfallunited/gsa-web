import assert from 'assert'
import {
  DONATION_PRESETS_USD,
  MIN_DONATION_USD,
  PROCESSING_FEE_RATE,
  DONATION_STATUS,
  PAYMENT_METHODS,
  RETRY_SCHEDULE_MINUTES,
  RETRY_EXPIRY_HOURS,
  POLLING_INTERVAL_MINUTES,
  IMPACT_TIERS,
} from '../constants'

function testDonationPresetsUsd(): void {
  assert(
    Array.isArray(DONATION_PRESETS_USD),
    'DONATION_PRESETS_USD should be an array'
  )
  assert.deepStrictEqual(
    DONATION_PRESETS_USD,
    [25, 50, 100, 250, 500],
    'DONATION_PRESETS_USD should have correct values'
  )
  assert.strictEqual(
    DONATION_PRESETS_USD.length,
    5,
    'DONATION_PRESETS_USD should have 5 presets'
  )
}

function testMinDonationUsd(): void {
  assert.strictEqual(
    MIN_DONATION_USD,
    1,
    'MIN_DONATION_USD should be 1'
  )
  assert.strictEqual(
    typeof MIN_DONATION_USD,
    'number',
    'MIN_DONATION_USD should be a number'
  )
}

function testProcessingFeeRate(): void {
  assert.strictEqual(
    PROCESSING_FEE_RATE,
    0.029,
    'PROCESSING_FEE_RATE should be 0.029 (2.9%)'
  )
  assert.strictEqual(
    typeof PROCESSING_FEE_RATE,
    'number',
    'PROCESSING_FEE_RATE should be a number'
  )
}

function testDonationStatus(): void {
  assert(
    typeof DONATION_STATUS === 'object',
    'DONATION_STATUS should be an object'
  )
  assert.strictEqual(
    DONATION_STATUS.PENDING,
    'pending',
    'PENDING should be "pending"'
  )
  assert.strictEqual(
    DONATION_STATUS.PROCESSING,
    'processing',
    'PROCESSING should be "processing"'
  )
  assert.strictEqual(
    DONATION_STATUS.COMPLETED,
    'completed',
    'COMPLETED should be "completed"'
  )
  assert.strictEqual(
    DONATION_STATUS.FAILED,
    'failed',
    'FAILED should be "failed"'
  )
}

function testPaymentMethods(): void {
  assert(
    typeof PAYMENT_METHODS === 'object',
    'PAYMENT_METHODS should be an object'
  )
  assert.strictEqual(
    PAYMENT_METHODS.CARD,
    'card',
    'CARD should be "card"'
  )
  assert.strictEqual(
    PAYMENT_METHODS.MOBILE,
    'mobile',
    'MOBILE should be "mobile"'
  )
}

function testRetryScheduleMinutes(): void {
  assert(
    Array.isArray(RETRY_SCHEDULE_MINUTES),
    'RETRY_SCHEDULE_MINUTES should be an array'
  )
  assert.deepStrictEqual(
    RETRY_SCHEDULE_MINUTES,
    [5, 15, 45, 120, 360],
    'RETRY_SCHEDULE_MINUTES should have exponential backoff values'
  )
  assert.strictEqual(
    RETRY_SCHEDULE_MINUTES.length,
    5,
    'RETRY_SCHEDULE_MINUTES should have 5 retry intervals'
  )
}

function testRetryExpiryHours(): void {
  assert.strictEqual(
    RETRY_EXPIRY_HOURS,
    72,
    'RETRY_EXPIRY_HOURS should be 72'
  )
  assert.strictEqual(
    typeof RETRY_EXPIRY_HOURS,
    'number',
    'RETRY_EXPIRY_HOURS should be a number'
  )
}

function testPollingIntervalMinutes(): void {
  assert.strictEqual(
    POLLING_INTERVAL_MINUTES,
    2,
    'POLLING_INTERVAL_MINUTES should be 2'
  )
  assert.strictEqual(
    typeof POLLING_INTERVAL_MINUTES,
    'number',
    'POLLING_INTERVAL_MINUTES should be a number'
  )
}

function testImpactTiers(): void {
  assert(
    Array.isArray(IMPACT_TIERS),
    'IMPACT_TIERS should be an array'
  )
  assert.strictEqual(
    IMPACT_TIERS.length,
    4,
    'IMPACT_TIERS should have 4 tiers'
  )

  const expectedTiers = [
    { amount: '$25', label: 'Training kit for one youth player' },
    { amount: '$50', label: 'A week of meals for programme participants' },
    { amount: '$100', label: 'Educational materials for an entire cohort' },
    { amount: '$250+', label: 'Supports volunteers and community sessions' },
  ]

  IMPACT_TIERS.forEach((tier, index) => {
    assert.strictEqual(
      tier.amount,
      expectedTiers[index].amount,
      `Tier ${index} should have correct amount`
    )
    assert.strictEqual(
      tier.label,
      expectedTiers[index].label,
      `Tier ${index} should have correct label`
    )
  })
}

// Run all tests
console.log('Running donation constants tests...')

testDonationPresetsUsd()
console.log('✓ DONATION_PRESETS_USD has correct values')

testMinDonationUsd()
console.log('✓ MIN_DONATION_USD is 1')

testProcessingFeeRate()
console.log('✓ PROCESSING_FEE_RATE is 0.029 (2.9%)')

testDonationStatus()
console.log('✓ DONATION_STATUS has all 4 statuses')

testPaymentMethods()
console.log('✓ PAYMENT_METHODS has card and mobile')

testRetryScheduleMinutes()
console.log('✓ RETRY_SCHEDULE_MINUTES has exponential backoff intervals')

testRetryExpiryHours()
console.log('✓ RETRY_EXPIRY_HOURS is 72')

testPollingIntervalMinutes()
console.log('✓ POLLING_INTERVAL_MINUTES is 2')

testImpactTiers()
console.log('✓ IMPACT_TIERS has 4 tiers with correct data')

console.log('\nAll donation constants tests passed!')
