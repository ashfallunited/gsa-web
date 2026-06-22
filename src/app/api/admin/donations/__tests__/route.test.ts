import assert from 'assert'

/**
 * Tests for admin donations endpoints
 * Tests list with filters, pagination, CSV export, and auth
 */

// Mock types
interface MockDonation {
  id: string
  firstName: string
  lastName: string
  email: string
  country: string
  amountUsd: number
  paymentMethod: 'card' | 'mobile'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  completedAt: Date | null
}

interface ListResponse {
  data: MockDonation[]
  total: number
  limit: number
  offset: number
}

interface ExportResponse {
  csv: string
  headers: Record<string, string>
}

// Mock Database
class MockFirestore {
  private donations: Map<string, MockDonation> = new Map()

  constructor() {
    // Initialize with test data
    const now = new Date('2026-06-22T10:00:00Z')
    const yesterday = new Date('2026-06-21T10:00:00Z')

    this.donations.set('donation1', {
      id: 'donation1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      country: 'US',
      amountUsd: 100,
      paymentMethod: 'card',
      status: 'completed',
      createdAt: now,
      completedAt: now,
    })

    this.donations.set('donation2', {
      id: 'donation2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      country: 'UK',
      amountUsd: 50,
      paymentMethod: 'mobile',
      status: 'pending',
      createdAt: yesterday,
      completedAt: null,
    })

    this.donations.set('donation3', {
      id: 'donation3',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@example.com',
      country: 'CA',
      amountUsd: 200,
      paymentMethod: 'card',
      status: 'completed',
      createdAt: now,
      completedAt: now,
    })

    this.donations.set('donation4', {
      id: 'donation4',
      firstName: 'Alice',
      lastName: 'Williams',
      email: 'alice@example.com',
      country: 'US',
      amountUsd: 75,
      paymentMethod: 'mobile',
      status: 'failed',
      createdAt: yesterday,
      completedAt: null,
    })
  }

  async queryDonations(filters: {
    status?: string
    paymentMethod?: string
    dateFrom?: Date
    dateTo?: Date
    limit: number
    offset: number
  }): Promise<{ donations: MockDonation[]; total: number }> {
    let results = Array.from(this.donations.values())

    // Apply filters
    if (filters.status) {
      results = results.filter((d) => d.status === filters.status)
    }

    if (filters.paymentMethod) {
      results = results.filter((d) => d.paymentMethod === filters.paymentMethod)
    }

    if (filters.dateFrom) {
      results = results.filter((d) => d.createdAt >= filters.dateFrom!)
    }

    if (filters.dateTo) {
      results = results.filter((d) => d.createdAt <= filters.dateTo!)
    }

    const total = results.length
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Apply pagination
    results = results.slice(filters.offset, filters.offset + filters.limit)

    return { donations: results, total }
  }
}

// Mock Auth
class MockAuth {
  isAdmin: boolean = false

  async verifyAdmin(): Promise<boolean> {
    return this.isAdmin
  }
}

// Handler implementations
async function handleListRequest(
  filters: {
    status?: string
    paymentMethod?: string
    dateFrom?: string
    dateTo?: string
    limit: number
    offset: number
  },
  auth: MockAuth,
  db: MockFirestore
): Promise<{ status: number; data: ListResponse | { error: string } }> {
  // Verify auth
  if (!(await auth.verifyAdmin())) {
    return { status: 401, data: { error: 'Unauthorized' } }
  }

  // Validate parameters
  if (filters.limit < 1 || filters.limit > 500) {
    return { status: 400, data: { error: 'Limit must be between 1 and 500' } }
  }

  if (filters.offset < 0) {
    return { status: 400, data: { error: 'Offset must be >= 0' } }
  }

  // Validate status
  const validStatuses = ['pending', 'processing', 'completed', 'failed']
  if (filters.status && !validStatuses.includes(filters.status)) {
    return {
      status: 400,
      data: { error: 'Invalid status. Must be one of: pending, processing, completed, failed' },
    }
  }

  // Validate payment method
  const validPaymentMethods = ['card', 'mobile']
  if (filters.paymentMethod && !validPaymentMethods.includes(filters.paymentMethod)) {
    return {
      status: 400,
      data: { error: 'Invalid paymentMethod. Must be one of: card, mobile' },
    }
  }

  // Validate dates
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined

  if ((filters.dateFrom && isNaN(dateFrom!.getTime())) || (filters.dateTo && isNaN(dateTo!.getTime()))) {
    return {
      status: 400,
      data: { error: 'Invalid date format. Use ISO 8601 format' },
    }
  }

  const { donations, total } = await db.queryDonations({
    status: filters.status,
    paymentMethod: filters.paymentMethod,
    dateFrom,
    dateTo,
    limit: filters.limit,
    offset: filters.offset,
  })

  return {
    status: 200,
    data: {
      data: donations,
      total,
      limit: filters.limit,
      offset: filters.offset,
    },
  }
}

async function handleExportRequest(
  filters: {
    status?: string
    paymentMethod?: string
    dateFrom?: string
    dateTo?: string
  },
  auth: MockAuth,
  db: MockFirestore
): Promise<{ status: number; data: string | { error: string }; headers?: Record<string, string> }> {
  // Verify auth
  if (!(await auth.verifyAdmin())) {
    return { status: 401, data: { error: 'Unauthorized' } }
  }

  // Validate status
  const validStatuses = ['pending', 'processing', 'completed', 'failed']
  if (filters.status && !validStatuses.includes(filters.status)) {
    return {
      status: 400,
      data: { error: 'Invalid status' },
    }
  }

  // Validate payment method
  const validPaymentMethods = ['card', 'mobile']
  if (filters.paymentMethod && !validPaymentMethods.includes(filters.paymentMethod)) {
    return {
      status: 400,
      data: { error: 'Invalid paymentMethod' },
    }
  }

  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined

  const { donations } = await db.queryDonations({
    status: filters.status,
    paymentMethod: filters.paymentMethod,
    dateFrom,
    dateTo,
    limit: 1000,
    offset: 0,
  })

  // Generate CSV
  const csvHeader =
    'id,first_name,last_name,email,country,amount_usd,payment_method,status,created_at,completed_at\n'
  const csvRows = donations.map((d) => {
    const completedAt = d.completedAt ? d.completedAt.toISOString() : ''
    return `"${d.id}","${d.firstName}","${d.lastName}","${d.email}","${d.country}",${d.amountUsd},"${d.paymentMethod}","${d.status}","${d.createdAt.toISOString()}","${completedAt}"`
  })

  const csv = csvHeader + csvRows.join('\n')
  const today = new Date().toISOString().split('T')[0]
  const filename = `donations_${today}.csv`

  return {
    status: 200,
    data: csv,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  }
}

// ============ TESTS ============

async function testListAllDonations(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockFirestore()

  const response = await handleListRequest(
    { status: undefined, paymentMethod: undefined, limit: 50, offset: 0 },
    auth,
    db
  )

  assert.strictEqual(response.status, 200, 'Should return 200')
  const data = response.data as ListResponse
  assert.strictEqual(data.data.length, 4, 'Should return all 4 donations')
  assert.strictEqual(data.total, 4, 'Total should be 4')
  assert.strictEqual(data.limit, 50, 'Limit should be 50')
  assert.strictEqual(data.offset, 0, 'Offset should be 0')
}

async function testListWithStatusFilter(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockFirestore()

  const response = await handleListRequest(
    { status: 'completed', paymentMethod: undefined, limit: 50, offset: 0 },
    auth,
    db
  )

  assert.strictEqual(response.status, 200, 'Should return 200')
  const data = response.data as ListResponse
  assert.strictEqual(data.data.length, 2, 'Should return 2 completed donations')
  assert.strictEqual(data.total, 2, 'Total should be 2')
  assert(data.data.every((d) => d.status === 'completed'), 'All should have completed status')
}

async function testListWithPaymentMethodFilter(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockFirestore()

  const response = await handleListRequest(
    { status: undefined, paymentMethod: 'mobile', limit: 50, offset: 0 },
    auth,
    db
  )

  assert.strictEqual(response.status, 200, 'Should return 200')
  const data = response.data as ListResponse
  assert.strictEqual(data.data.length, 2, 'Should return 2 mobile donations')
  assert.strictEqual(data.total, 2, 'Total should be 2')
  assert(data.data.every((d) => d.paymentMethod === 'mobile'), 'All should have mobile payment method')
}

async function testListWithMultipleFilters(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockFirestore()

  const response = await handleListRequest(
    { status: 'completed', paymentMethod: 'card', limit: 50, offset: 0 },
    auth,
    db
  )

  assert.strictEqual(response.status, 200, 'Should return 200')
  const data = response.data as ListResponse
  assert.strictEqual(data.data.length, 2, 'Should return 2 completed card donations')
  assert(data.data.every((d) => d.status === 'completed' && d.paymentMethod === 'card'), 'Should match both filters')
}

async function testListWithPagination(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockFirestore()

  const response1 = await handleListRequest(
    { status: undefined, paymentMethod: undefined, limit: 2, offset: 0 },
    auth,
    db
  )

  assert.strictEqual(response1.status, 200, 'First page should return 200')
  let data = response1.data as ListResponse
  assert.strictEqual(data.data.length, 2, 'First page should have 2 items')
  assert.strictEqual(data.total, 4, 'Total should be 4')
  assert.strictEqual(data.offset, 0, 'First page offset should be 0')

  const response2 = await handleListRequest(
    { status: undefined, paymentMethod: undefined, limit: 2, offset: 2 },
    auth,
    db
  )

  assert.strictEqual(response2.status, 200, 'Second page should return 200')
  data = response2.data as ListResponse
  assert.strictEqual(data.data.length, 2, 'Second page should have 2 items')
  assert.strictEqual(data.offset, 2, 'Second page offset should be 2')
}

async function testListWithDateFilter(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockFirestore()

  const response = await handleListRequest(
    { status: undefined, paymentMethod: undefined, dateFrom: '2026-06-22', limit: 50, offset: 0 },
    auth,
    db
  )

  assert.strictEqual(response.status, 200, 'Should return 200')
  const data = response.data as ListResponse
  assert.strictEqual(data.data.length, 2, 'Should return 2 donations from 2026-06-22')
}

async function testListUnauthorized(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = false
  const db = new MockFirestore()

  const response = await handleListRequest(
    { status: undefined, paymentMethod: undefined, limit: 50, offset: 0 },
    auth,
    db
  )

  assert.strictEqual(response.status, 401, 'Should return 401 for unauthorized access')
}

async function testListInvalidStatus(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockFirestore()

  const response = await handleListRequest(
    { status: 'invalid', paymentMethod: undefined, limit: 50, offset: 0 },
    auth,
    db
  )

  assert.strictEqual(response.status, 400, 'Should return 400 for invalid status')
}

async function testListInvalidPaymentMethod(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockFirestore()

  const response = await handleListRequest(
    { status: undefined, paymentMethod: 'invalid', limit: 50, offset: 0 },
    auth,
    db
  )

  assert.strictEqual(response.status, 400, 'Should return 400 for invalid payment method')
}

async function testExportAllDonations(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockFirestore()

  const response = await handleExportRequest({}, auth, db)

  assert.strictEqual(response.status, 200, 'Should return 200')
  assert.strictEqual(typeof response.data, 'string', 'Should return CSV string')
  const csv = response.data as string
  assert(csv.includes('id,first_name,last_name,email,country'), 'Should have CSV header')
  assert(csv.includes('donation1'), 'Should include donation data')
  assert.strictEqual(response.headers?.['Content-Type'], 'text/csv; charset=utf-8', 'Should have correct content type')
  assert(
    response.headers?.['Content-Disposition']?.includes('attachment'),
    'Should have attachment disposition'
  )
}

async function testExportWithFilter(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockFirestore()

  const response = await handleExportRequest({ status: 'completed' }, auth, db)

  assert.strictEqual(response.status, 200, 'Should return 200')
  const csv = response.data as string
  assert(csv.includes('completed'), 'Should include completed status')
  // Count occurrences of "completed" status in CSV
  const lines = csv.split('\n').filter((line) => line.length > 0)
  assert(lines.length >= 2, 'Should have header plus at least 1 data row') // header + data rows
}

async function testExportCSVFormat(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockFirestore()

  const response = await handleExportRequest({}, auth, db)

  assert.strictEqual(response.status, 200, 'Should return 200')
  const csv = response.data as string
  const lines = csv.split('\n')
  assert(lines.length > 1, 'CSV should have multiple lines')

  // Check header
  const header = lines[0]
  const expectedColumns = [
    'id',
    'first_name',
    'last_name',
    'email',
    'country',
    'amount_usd',
    'payment_method',
    'status',
    'created_at',
    'completed_at',
  ]
  expectedColumns.forEach((col) => {
    assert(header.includes(col), `Header should include ${col}`)
  })

  // Check data rows are properly quoted
  const dataLine = lines[1]
  assert(dataLine.includes('"'), 'Data should have quoted values')
}

async function testExportUnauthorized(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = false
  const db = new MockFirestore()

  const response = await handleExportRequest({}, auth, db)

  assert.strictEqual(response.status, 401, 'Should return 401 for unauthorized access')
}

// ============ RUN TESTS ============

async function runAllTests(): Promise<void> {
  console.log('Running admin donations endpoint tests...\n')

  await testListAllDonations()
  console.log('✓ List all donations returns all records with pagination')

  await testListWithStatusFilter()
  console.log('✓ List with status filter returns matching donations')

  await testListWithPaymentMethodFilter()
  console.log('✓ List with payment method filter returns matching donations')

  await testListWithMultipleFilters()
  console.log('✓ List with multiple filters applies all filters correctly')

  await testListWithPagination()
  console.log('✓ List with pagination returns correct pages')

  await testListWithDateFilter()
  console.log('✓ List with date filter returns matching donations')

  await testListUnauthorized()
  console.log('✓ List returns 401 for unauthorized requests')

  await testListInvalidStatus()
  console.log('✓ List returns 400 for invalid status')

  await testListInvalidPaymentMethod()
  console.log('✓ List returns 400 for invalid payment method')

  await testExportAllDonations()
  console.log('✓ Export returns all donations as CSV')

  await testExportWithFilter()
  console.log('✓ Export with filter returns filtered CSV')

  await testExportCSVFormat()
  console.log('✓ Export CSV has correct format and columns')

  await testExportUnauthorized()
  console.log('✓ Export returns 401 for unauthorized requests')

  console.log('\nAll admin donations endpoint tests passed!')
}

runAllTests().catch((error) => {
  console.error('Test suite failed:', error)
  process.exit(1)
})
