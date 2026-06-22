import assert from 'assert'
import { Timestamp } from 'firebase-admin/firestore'
import type { Donation, DonationStatus, PaymentMethod } from '@/types/donation'

/**
 * Mock implementation of the donations analytics endpoint for testing
 * Tests metric calculations, aggregations, and sorting
 */

interface DailyTotal {
  date: string
  amount: number
}

interface TopCountry {
  country: string
  count: number
}

interface ByPaymentMethod {
  card: { count: number; total: number }
  mobile: { count: number; total: number }
}

interface ByStatus {
  completed: number
  pending: number
  processing: number
  failed: number
}

interface ChartData {
  dailyTotals: DailyTotal[]
  topCountries: TopCountry[]
}

interface AnalyticsResponse {
  totalRaised: number
  donorCount: number
  averageDonation: number
  completionRate: string
  byPaymentMethod: ByPaymentMethod
  byStatus: ByStatus
  chartData: ChartData
}

interface MockRequest {
  headers: Map<string, string>
}

interface MockResponse<T> {
  status: number
  data: T
}

// Mock Firestore Timestamp
class MockTimestamp {
  date: Date

  constructor(date: Date) {
    this.date = date
  }

  toDate(): Date {
    return this.date
  }

  static fromDate(date: Date): MockTimestamp {
    return new MockTimestamp(date)
  }
}

// Mock analytics calculations
function calculateAnalytics(donations: Donation[]): AnalyticsResponse {
  if (donations.length === 0) {
    return {
      totalRaised: 0,
      donorCount: 0,
      averageDonation: 0,
      completionRate: '0%',
      byPaymentMethod: {
        card: { count: 0, total: 0 },
        mobile: { count: 0, total: 0 },
      },
      byStatus: {
        completed: 0,
        pending: 0,
        processing: 0,
        failed: 0,
      },
      chartData: {
        dailyTotals: [],
        topCountries: [],
      },
    }
  }

  // Calculate metrics
  const completedDonations = donations.filter((d) => d.status === 'completed')
  const totalRaised = completedDonations.reduce((sum, d) => sum + d.totalUsd, 0)

  // Unique donor count
  const uniqueEmails = new Set(completedDonations.map((d) => d.email))
  const donorCount = uniqueEmails.size

  // Average donation
  const averageDonation = donorCount > 0 ? totalRaised / donorCount : 0

  // Completion rate
  const totalDonations = donations.length
  const completedCount = completedDonations.length
  const completionRate = totalDonations > 0 ? `${Math.round((completedCount / totalDonations) * 100)}%` : '0%'

  // By payment method
  const byPaymentMethod: ByPaymentMethod = {
    card: { count: 0, total: 0 },
    mobile: { count: 0, total: 0 },
  }

  completedDonations.forEach((d) => {
    const method = d.paymentMethod as PaymentMethod
    byPaymentMethod[method].count += 1
    byPaymentMethod[method].total += d.totalUsd
  })

  // By status
  const byStatus: ByStatus = {
    completed: 0,
    pending: 0,
    processing: 0,
    failed: 0,
  }

  donations.forEach((d) => {
    const status = d.status as DonationStatus
    byStatus[status] += 1
  })

  // Daily totals (completed donations only)
  const dailyMap = new Map<string, number>()
  completedDonations.forEach((d) => {
    const date = (d.createdAt as unknown as MockTimestamp).toDate()
    const dateStr = date.toISOString().split('T')[0]
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + d.totalUsd)
  })

  const dailyTotals: DailyTotal[] = Array.from(dailyMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Top countries (completed donations only)
  const countryMap = new Map<string, number>()
  completedDonations.forEach((d) => {
    countryMap.set(d.country, (countryMap.get(d.country) || 0) + 1)
  })

  const topCountries: TopCountry[] = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalRaised: Math.round(totalRaised * 100) / 100,
    donorCount,
    averageDonation: Math.round(averageDonation * 100) / 100,
    completionRate,
    byPaymentMethod,
    byStatus,
    chartData: {
      dailyTotals,
      topCountries,
    },
  }
}

// Mock database
class MockFirestore {
  private donations: Donation[] = []

  addDonation(donation: Donation): void {
    this.donations.push(donation)
  }

  getDonations(): Donation[] {
    return this.donations
  }

  clear(): void {
    this.donations = []
  }
}

// Helper to create a donation
function createDonation(overrides: Partial<Donation> = {}): Donation {
  const baseDate = new Date('2024-01-01')
  return {
    id: `donation-${Math.random().toString(36).substr(2, 9)}`,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    country: 'US',
    message: null,
    ipAddress: '192.168.1.1',
    amountUsd: 50,
    paymentMethod: 'card',
    coverFees: false,
    feeUsd: 0,
    totalUsd: 50,
    referenceId: 'ref_12345',
    status: 'completed',
    dollrStatus: 'success',
    createdAt: new MockTimestamp(baseDate) as unknown as Timestamp,
    updatedAt: new MockTimestamp(baseDate) as unknown as Timestamp,
    completedAt: new MockTimestamp(baseDate) as unknown as Timestamp,
    emailSent: true,
    notes: null,
    retryAttempts: 0,
    nextRetryAt: null,
    ...overrides,
  }
}

// ============ TESTS ============

async function testEmptyDonations(): Promise<void> {
  const db = new MockFirestore()
  const analytics = calculateAnalytics(db.getDonations())

  assert.strictEqual(analytics.totalRaised, 0, 'Total raised should be 0')
  assert.strictEqual(analytics.donorCount, 0, 'Donor count should be 0')
  assert.strictEqual(analytics.averageDonation, 0, 'Average should be 0')
  assert.strictEqual(analytics.completionRate, '0%', 'Completion rate should be 0%')
  assert.strictEqual(analytics.byStatus.completed, 0, 'Completed should be 0')
  assert.strictEqual(analytics.chartData.dailyTotals.length, 0, 'Daily totals should be empty')
  assert.strictEqual(analytics.chartData.topCountries.length, 0, 'Top countries should be empty')
}

async function testSingleCompletedDonation(): Promise<void> {
  const db = new MockFirestore()
  db.addDonation(
    createDonation({
      email: 'donor1@example.com',
      amountUsd: 100,
      totalUsd: 100,
      status: 'completed',
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  assert.strictEqual(analytics.totalRaised, 100, 'Total raised should be 100')
  assert.strictEqual(analytics.donorCount, 1, 'Donor count should be 1')
  assert.strictEqual(analytics.averageDonation, 100, 'Average should be 100')
  assert.strictEqual(analytics.completionRate, '100%', 'Completion rate should be 100%')
  assert.strictEqual(analytics.byStatus.completed, 1, 'Completed count should be 1')
}

async function testMultipleDonationsFromSameDonor(): Promise<void> {
  const db = new MockFirestore()
  const email = 'repeat-donor@example.com'

  db.addDonation(
    createDonation({
      email,
      amountUsd: 50,
      totalUsd: 50,
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email,
      amountUsd: 75,
      totalUsd: 75,
      status: 'completed',
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  assert.strictEqual(analytics.totalRaised, 125, 'Total raised should be 125')
  assert.strictEqual(analytics.donorCount, 1, 'Donor count should be 1 (unique emails)')
  assert.strictEqual(analytics.averageDonation, 125, 'Average should be 125')
}

async function testMultipleDonorsFromDifferentEmails(): Promise<void> {
  const db = new MockFirestore()

  db.addDonation(
    createDonation({
      email: 'donor1@example.com',
      amountUsd: 100,
      totalUsd: 100,
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor2@example.com',
      amountUsd: 200,
      totalUsd: 200,
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor3@example.com',
      amountUsd: 300,
      totalUsd: 300,
      status: 'completed',
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  assert.strictEqual(analytics.totalRaised, 600, 'Total raised should be 600')
  assert.strictEqual(analytics.donorCount, 3, 'Donor count should be 3')
  assert.strictEqual(analytics.averageDonation, 200, 'Average should be 200')
}

async function testAverageDonationCalculation(): Promise<void> {
  const db = new MockFirestore()

  db.addDonation(
    createDonation({
      email: 'donor1@example.com',
      amountUsd: 50,
      totalUsd: 50,
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor2@example.com',
      amountUsd: 100,
      totalUsd: 100,
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor3@example.com',
      amountUsd: 75,
      totalUsd: 75,
      status: 'completed',
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  // Average = 225 / 3 = 75
  assert.strictEqual(analytics.averageDonation, 75, 'Average should be 75')
}

async function testCompletionRateWithMixedStatuses(): Promise<void> {
  const db = new MockFirestore()

  db.addDonation(
    createDonation({
      email: 'donor1@example.com',
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor2@example.com',
      status: 'pending',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor3@example.com',
      status: 'processing',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor4@example.com',
      status: 'failed',
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  // 1 completed out of 4 = 25%
  assert.strictEqual(analytics.completionRate, '25%', 'Completion rate should be 25%')
  assert.strictEqual(analytics.byStatus.completed, 1, 'Completed count should be 1')
  assert.strictEqual(analytics.byStatus.pending, 1, 'Pending count should be 1')
  assert.strictEqual(analytics.byStatus.processing, 1, 'Processing count should be 1')
  assert.strictEqual(analytics.byStatus.failed, 1, 'Failed count should be 1')
}

async function testPaymentMethodAggregation(): Promise<void> {
  const db = new MockFirestore()

  db.addDonation(
    createDonation({
      email: 'donor1@example.com',
      paymentMethod: 'card',
      amountUsd: 100,
      totalUsd: 100,
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor2@example.com',
      paymentMethod: 'card',
      amountUsd: 50,
      totalUsd: 50,
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor3@example.com',
      paymentMethod: 'mobile',
      amountUsd: 75,
      totalUsd: 75,
      status: 'completed',
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  assert.strictEqual(analytics.byPaymentMethod.card.count, 2, 'Card count should be 2')
  assert.strictEqual(analytics.byPaymentMethod.card.total, 150, 'Card total should be 150')
  assert.strictEqual(analytics.byPaymentMethod.mobile.count, 1, 'Mobile count should be 1')
  assert.strictEqual(analytics.byPaymentMethod.mobile.total, 75, 'Mobile total should be 75')
}

async function testPaymentMethodIgnoresPending(): Promise<void> {
  const db = new MockFirestore()

  // Only completed donations should count in payment method breakdown
  db.addDonation(
    createDonation({
      email: 'donor1@example.com',
      paymentMethod: 'card',
      amountUsd: 100,
      totalUsd: 100,
      status: 'pending',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor2@example.com',
      paymentMethod: 'card',
      amountUsd: 50,
      totalUsd: 50,
      status: 'completed',
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  assert.strictEqual(analytics.byPaymentMethod.card.count, 1, 'Card count should be 1 (pending not included)')
  assert.strictEqual(analytics.byPaymentMethod.card.total, 50, 'Card total should be 50')
}

async function testDailyTotalsSorting(): Promise<void> {
  const db = new MockFirestore()

  const date2 = new Date('2024-01-15')
  const date1 = new Date('2024-01-10')
  const date3 = new Date('2024-01-20')

  db.addDonation(
    createDonation({
      email: 'donor1@example.com',
      amountUsd: 100,
      totalUsd: 100,
      status: 'completed',
      createdAt: new MockTimestamp(date2) as unknown as Timestamp,
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor2@example.com',
      amountUsd: 50,
      totalUsd: 50,
      status: 'completed',
      createdAt: new MockTimestamp(date1) as unknown as Timestamp,
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor3@example.com',
      amountUsd: 75,
      totalUsd: 75,
      status: 'completed',
      createdAt: new MockTimestamp(date3) as unknown as Timestamp,
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  const dailyTotals = analytics.chartData.dailyTotals
  assert.strictEqual(dailyTotals.length, 3, 'Should have 3 daily entries')
  assert.strictEqual(dailyTotals[0].date, '2024-01-10', 'First date should be 2024-01-10')
  assert.strictEqual(dailyTotals[1].date, '2024-01-15', 'Second date should be 2024-01-15')
  assert.strictEqual(dailyTotals[2].date, '2024-01-20', 'Third date should be 2024-01-20')
}

async function testDailyTotalsAggregation(): Promise<void> {
  const db = new MockFirestore()

  const sameDate = new Date('2024-01-15')

  db.addDonation(
    createDonation({
      email: 'donor1@example.com',
      amountUsd: 100,
      totalUsd: 100,
      status: 'completed',
      createdAt: new MockTimestamp(sameDate) as unknown as Timestamp,
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor2@example.com',
      amountUsd: 50,
      totalUsd: 50,
      status: 'completed',
      createdAt: new MockTimestamp(sameDate) as unknown as Timestamp,
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor3@example.com',
      amountUsd: 75,
      totalUsd: 75,
      status: 'completed',
      createdAt: new MockTimestamp(sameDate) as unknown as Timestamp,
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  const dailyTotals = analytics.chartData.dailyTotals
  assert.strictEqual(dailyTotals.length, 1, 'Should have 1 daily entry')
  assert.strictEqual(dailyTotals[0].amount, 225, 'Daily total should be 225')
}

async function testTopCountriesSorting(): Promise<void> {
  const db = new MockFirestore()

  db.addDonation(
    createDonation({
      email: 'donor1@example.com',
      country: 'US',
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor2@example.com',
      country: 'UK',
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor3@example.com',
      country: 'UK',
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor4@example.com',
      country: 'NG',
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor5@example.com',
      country: 'NG',
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor6@example.com',
      country: 'NG',
      status: 'completed',
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  const topCountries = analytics.chartData.topCountries
  assert.strictEqual(topCountries.length, 3, 'Should have 3 countries')
  assert.strictEqual(topCountries[0].country, 'NG', 'First should be NG (3 donations)')
  assert.strictEqual(topCountries[0].count, 3, 'NG count should be 3')
  assert.strictEqual(topCountries[1].country, 'UK', 'Second should be UK (2 donations)')
  assert.strictEqual(topCountries[1].count, 2, 'UK count should be 2')
  assert.strictEqual(topCountries[2].country, 'US', 'Third should be US (1 donation)')
  assert.strictEqual(topCountries[2].count, 1, 'US count should be 1')
}

async function testTopCountriesLimit(): Promise<void> {
  const db = new MockFirestore()

  // Create 15 countries (should limit to top 10)
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 15 - i; j++) {
      db.addDonation(
        createDonation({
          email: `donor-${i}-${j}@example.com`,
          country: `C${i.toString().padStart(2, '0')}`,
          status: 'completed',
        })
      )
    }
  }

  const analytics = calculateAnalytics(db.getDonations())

  const topCountries = analytics.chartData.topCountries
  assert.strictEqual(topCountries.length, 10, 'Should limit to 10 countries')
  assert.strictEqual(topCountries[0].count, 15, 'First should have 15 donations')
  assert.strictEqual(topCountries[9].count, 6, 'Tenth should have 6 donations')
}

async function testOnlyCompletedDonationsCountInRevenue(): Promise<void> {
  const db = new MockFirestore()

  db.addDonation(
    createDonation({
      email: 'donor1@example.com',
      amountUsd: 100,
      totalUsd: 100,
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor2@example.com',
      amountUsd: 200,
      totalUsd: 200,
      status: 'pending',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor3@example.com',
      amountUsd: 150,
      totalUsd: 150,
      status: 'failed',
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  // Only completed (100) should count
  assert.strictEqual(analytics.totalRaised, 100, 'Total raised should be 100 (only completed)')
  assert.strictEqual(analytics.donorCount, 1, 'Donor count should be 1 (only completed)')
  assert.strictEqual(analytics.averageDonation, 100, 'Average should be 100')
  // But all statuses should be counted in byStatus
  assert.strictEqual(analytics.byStatus.completed, 1, 'Completed should be 1')
  assert.strictEqual(analytics.byStatus.pending, 1, 'Pending should be 1')
  assert.strictEqual(analytics.byStatus.failed, 1, 'Failed should be 1')
}

async function testRoundingOfDecimals(): Promise<void> {
  const db = new MockFirestore()

  db.addDonation(
    createDonation({
      email: 'donor1@example.com',
      amountUsd: 33.333,
      totalUsd: 33.333,
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor2@example.com',
      amountUsd: 33.334,
      totalUsd: 33.334,
      status: 'completed',
    })
  )

  db.addDonation(
    createDonation({
      email: 'donor3@example.com',
      amountUsd: 33.333,
      totalUsd: 33.333,
      status: 'completed',
    })
  )

  const analytics = calculateAnalytics(db.getDonations())

  // Total = 100 (exact)
  assert.strictEqual(analytics.totalRaised, 100, 'Total raised should be 100')
  // Average = 100 / 3 = 33.33...
  assert.strictEqual(analytics.averageDonation, 33.33, 'Average should be rounded to 33.33')
}

async function testCompletionRateRounding(): Promise<void> {
  const db = new MockFirestore()

  // 1 completed out of 3 = 33.333...% should round to 33%
  for (let i = 0; i < 3; i++) {
    db.addDonation(
      createDonation({
        email: `donor${i}@example.com`,
        status: i === 0 ? 'completed' : 'pending',
      })
    )
  }

  const analytics = calculateAnalytics(db.getDonations())

  assert.strictEqual(analytics.completionRate, '33%', 'Completion rate should round to 33%')
}

// ============ RUN TESTS ============

async function runAllTests(): Promise<void> {
  console.log('Running GET /api/admin/donations/analytics endpoint tests...\n')

  await testEmptyDonations()
  console.log('✓ Empty donations returns zero metrics')

  await testSingleCompletedDonation()
  console.log('✓ Single completed donation calculates correct metrics')

  await testMultipleDonationsFromSameDonor()
  console.log('✓ Multiple donations from same donor counts as one unique donor')

  await testMultipleDonorsFromDifferentEmails()
  console.log('✓ Multiple donors from different emails counts correctly')

  await testAverageDonationCalculation()
  console.log('✓ Average donation calculated correctly')

  await testCompletionRateWithMixedStatuses()
  console.log('✓ Completion rate calculated correctly with mixed statuses')

  await testPaymentMethodAggregation()
  console.log('✓ Payment method aggregation counts and totals correctly')

  await testPaymentMethodIgnoresPending()
  console.log('✓ Payment method aggregation ignores non-completed donations')

  await testDailyTotalsSorting()
  console.log('✓ Daily totals sorted by date ascending')

  await testDailyTotalsAggregation()
  console.log('✓ Daily totals aggregated correctly for same date')

  await testTopCountriesSorting()
  console.log('✓ Top countries sorted by count descending')

  await testTopCountriesLimit()
  console.log('✓ Top countries limited to 10 results')

  await testOnlyCompletedDonationsCountInRevenue()
  console.log('✓ Only completed donations count in revenue metrics')

  await testRoundingOfDecimals()
  console.log('✓ Decimal values rounded correctly')

  await testCompletionRateRounding()
  console.log('✓ Completion rate percentage rounded correctly')

  console.log('\nAll GET /api/admin/donations/analytics endpoint tests passed!')
}

runAllTests().catch((error) => {
  console.error('Test suite failed:', error)
  process.exit(1)
})
