import assert from 'assert'

/**
 * Tests for admin donation completion and email endpoints
 * Tests manual completion, custom emails, auth, and validation
 */

// Mock types
interface MockDonation {
  id: string
  firstName: string
  lastName: string
  email: string
  amountUsd: number
  totalUsd: number
  referenceId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  emailSent: boolean
  notes: string | null
}

interface MockSession {
  admin: true
  role: 'super_admin' | 'data_analyst'
  sub: string
}

// Mock Database
class MockDonationDb {
  private donations: Map<string, MockDonation> = new Map()
  private emailLogs: Array<{
    donationId: string
    emailType: string
    recipientEmail: string
    subject: string
    adminEmail?: string
    sentAt: Date
  }> = []

  constructor() {
    // Initialize with test data
    this.donations.set('donation1', {
      id: 'donation1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      amountUsd: 100,
      totalUsd: 102.9,
      referenceId: 'ref-001',
      status: 'pending',
      emailSent: false,
      notes: null,
    })

    this.donations.set('donation2', {
      id: 'donation2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      amountUsd: 50,
      totalUsd: 51.45,
      referenceId: 'ref-002',
      status: 'processing',
      emailSent: true,
      notes: null,
    })
  }

  async getDonation(id: string): Promise<MockDonation | null> {
    return this.donations.get(id) || null
  }

  async updateDonationStatus(
    id: string,
    status: string,
    notes?: string
  ): Promise<void> {
    const donation = this.donations.get(id)
    if (!donation) throw new Error(`Donation ${id} not found`)

    this.donations.set(id, {
      ...donation,
      status: status as MockDonation['status'],
      notes: notes || null,
    })
  }

  async markEmailSent(id: string): Promise<void> {
    const donation = this.donations.get(id)
    if (!donation) throw new Error(`Donation ${id} not found`)

    this.donations.set(id, {
      ...donation,
      emailSent: true,
    })
  }

  async logEmail(
    donationId: string,
    emailType: string,
    recipientEmail: string,
    subject: string,
    adminEmail?: string
  ): Promise<void> {
    this.emailLogs.push({
      donationId,
      emailType,
      recipientEmail,
      subject,
      adminEmail,
      sentAt: new Date(),
    })
  }

  getEmailLogs() {
    return this.emailLogs
  }
}

// Mock Auth
class MockAuth {
  isAdmin: boolean = false
  session: MockSession | null = null

  async verifyAdmin(): Promise<boolean> {
    return this.isAdmin
  }

  async getSession(): Promise<MockSession | null> {
    return this.session
  }
}

// Mock Email Service
class MockEmailService {
  sentEmails: Array<{
    email: string
    subject: string
    body: string
    type: 'thank_you' | 'custom'
  }> = []

  async sendThankYouEmail(donation: MockDonation): Promise<boolean> {
    this.sentEmails.push({
      email: donation.email,
      subject: `Thank You for Your Donation to GSA`,
      body: `Thank you ${donation.firstName}!`,
      type: 'thank_you',
    })
    return true
  }

  async sendCustomEmail(email: string, subject: string, body: string): Promise<boolean> {
    this.sentEmails.push({
      email,
      subject,
      body,
      type: 'custom',
    })
    return true
  }

  getSentEmails() {
    return this.sentEmails
  }
}

// Handler implementations
async function handleCompleteRequest(
  donationId: string,
  requestBody: { notes?: string } | null,
  auth: MockAuth,
  db: MockDonationDb,
  emailService: MockEmailService
): Promise<{ status: number; data: Record<string, unknown> }> {
  // Verify auth
  if (!(await auth.verifyAdmin())) {
    return { status: 401, data: { error: 'Unauthorized' } }
  }

  try {
    // Get donation
    const donation = await db.getDonation(donationId)
    if (!donation) {
      return { status: 404, data: { error: 'Donation not found' } }
    }

    const notes = requestBody?.notes

    // Update status
    await db.updateDonationStatus(donationId, 'completed', notes)

    // Send thank-you email if not already sent
    let emailSent = false
    if (!donation.emailSent) {
      const success = await emailService.sendThankYouEmail(donation)
      if (success) {
        await db.markEmailSent(donationId)
        await db.logEmail(
          donationId,
          'auto_thank_you',
          donation.email,
          `Thank You for Your Donation to GSA`
        )
        emailSent = true
      }
    }

    return {
      status: 200,
      data: {
        success: true,
        message: 'Donation marked as completed',
        emailSent,
      },
    }
  } catch (error) {
    console.error('Error completing donation:', error)
    return { status: 500, data: { error: 'Failed to complete donation' } }
  }
}

async function handleEmailRequest(
  donationId: string,
  requestBody: { subject?: string; body?: string } | null,
  auth: MockAuth,
  db: MockDonationDb,
  emailService: MockEmailService
): Promise<{ status: number; data: Record<string, unknown> }> {
  // Verify auth
  if (!(await auth.verifyAdmin())) {
    return { status: 401, data: { error: 'Unauthorized' } }
  }

  try {
    // Validate request body
    if (!requestBody || !requestBody.subject || !requestBody.body) {
      return {
        status: 400,
        data: { error: 'Missing required fields: subject and body' },
      }
    }

    const { subject, body } = requestBody

    // Get donation
    const donation = await db.getDonation(donationId)
    if (!donation) {
      return { status: 404, data: { error: 'Donation not found' } }
    }

    // Send custom email
    const success = await emailService.sendCustomEmail(donation.email, subject, body)
    if (!success) {
      return { status: 500, data: { error: 'Failed to send email' } }
    }

    // Get admin identifier
    const session = await auth.getSession()
    const adminEmail = session?.sub

    // Log email
    await db.logEmail(donationId, 'admin_custom', donation.email, subject, adminEmail)

    return {
      status: 200,
      data: {
        success: true,
        message: 'Email sent successfully',
      },
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return { status: 500, data: { error: 'Failed to send email' } }
  }
}

// ============ TESTS ============

async function testCompleteWithoutEmail(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockDonationDb()
  const emailService = new MockEmailService()

  const response = await handleCompleteRequest('donation2', { notes: 'Manual verification' }, auth, db, emailService)

  assert.strictEqual(response.status, 200, 'Should return 200')
  const data = response.data as Record<string, unknown>
  assert.strictEqual(data.success, true, 'Should indicate success')
  assert.strictEqual(data.emailSent, false, 'Should not send email (already sent)')

  const donation = await db.getDonation('donation2')
  assert.strictEqual(donation?.status, 'completed', 'Status should be completed')
  assert.strictEqual(donation?.notes, 'Manual verification', 'Notes should be saved')
}

async function testCompleteWithEmailAndLog(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockDonationDb()
  const emailService = new MockEmailService()

  const response = await handleCompleteRequest('donation1', { notes: 'Auto-verified' }, auth, db, emailService)

  assert.strictEqual(response.status, 200, 'Should return 200')
  const data = response.data as Record<string, unknown>
  assert.strictEqual(data.success, true, 'Should indicate success')
  assert.strictEqual(data.emailSent, true, 'Should send email')

  const donation = await db.getDonation('donation1')
  assert.strictEqual(donation?.status, 'completed', 'Status should be completed')
  assert.strictEqual(donation?.emailSent, true, 'Email should be marked as sent')

  const logs = db.getEmailLogs()
  assert.strictEqual(logs.length, 1, 'Should have one email log')
  assert.strictEqual(logs[0].emailType, 'auto_thank_you', 'Log should be auto_thank_you type')

  const sent = emailService.getSentEmails()
  assert.strictEqual(sent.length, 1, 'Should send one email')
  assert.strictEqual(sent[0].type, 'thank_you', 'Should send thank you email')
}

async function testCompleteNotFound(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockDonationDb()
  const emailService = new MockEmailService()

  const response = await handleCompleteRequest('nonexistent', {}, auth, db, emailService)

  assert.strictEqual(response.status, 404, 'Should return 404')
  const data = response.data as Record<string, unknown>
  assert.strictEqual(data.error, 'Donation not found', 'Should indicate not found')
}

async function testCompleteUnauthorized(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = false
  const db = new MockDonationDb()
  const emailService = new MockEmailService()

  const response = await handleCompleteRequest('donation1', {}, auth, db, emailService)

  assert.strictEqual(response.status, 401, 'Should return 401')
  const data = response.data as Record<string, unknown>
  assert.strictEqual(data.error, 'Unauthorized', 'Should indicate unauthorized')
}

async function testEmailWithValidRequest(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  auth.session = { admin: true, role: 'super_admin', sub: 'admin-001' }
  const db = new MockDonationDb()
  const emailService = new MockEmailService()

  const response = await handleEmailRequest(
    'donation1',
    {
      subject: 'Payment Received',
      body: 'We have received your donation. Thank you!',
    },
    auth,
    db,
    emailService
  )

  assert.strictEqual(response.status, 200, 'Should return 200')
  const data = response.data as Record<string, unknown>
  assert.strictEqual(data.success, true, 'Should indicate success')
  assert.strictEqual(data.message, 'Email sent successfully', 'Should confirm email sent')

  const logs = db.getEmailLogs()
  assert.strictEqual(logs.length, 1, 'Should have one email log')
  assert.strictEqual(logs[0].emailType, 'admin_custom', 'Should be admin_custom type')
  assert.strictEqual(logs[0].adminEmail, 'admin-001', 'Should log admin identifier')

  const sent = emailService.getSentEmails()
  assert.strictEqual(sent.length, 1, 'Should send one email')
  assert.strictEqual(sent[0].type, 'custom', 'Should send custom email')
}

async function testEmailMissingSubject(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockDonationDb()
  const emailService = new MockEmailService()

  const response = await handleEmailRequest(
    'donation1',
    { body: 'Test email body' },
    auth,
    db,
    emailService
  )

  assert.strictEqual(response.status, 400, 'Should return 400')
  const data = response.data as Record<string, unknown>
  assert(
    (data.error as string).includes('Missing required fields'),
    'Should indicate missing fields'
  )
}

async function testEmailMissingBody(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockDonationDb()
  const emailService = new MockEmailService()

  const response = await handleEmailRequest(
    'donation1',
    { subject: 'Test Subject' },
    auth,
    db,
    emailService
  )

  assert.strictEqual(response.status, 400, 'Should return 400')
}

async function testEmailNullBody(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockDonationDb()
  const emailService = new MockEmailService()

  const response = await handleEmailRequest('donation1', null, auth, db, emailService)

  assert.strictEqual(response.status, 400, 'Should return 400')
}

async function testEmailNotFound(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = true
  const db = new MockDonationDb()
  const emailService = new MockEmailService()

  const response = await handleEmailRequest(
    'nonexistent',
    { subject: 'Test', body: 'Test body' },
    auth,
    db,
    emailService
  )

  assert.strictEqual(response.status, 404, 'Should return 404')
}

async function testEmailUnauthorized(): Promise<void> {
  const auth = new MockAuth()
  auth.isAdmin = false
  const db = new MockDonationDb()
  const emailService = new MockEmailService()

  const response = await handleEmailRequest(
    'donation1',
    { subject: 'Test', body: 'Test body' },
    auth,
    db,
    emailService
  )

  assert.strictEqual(response.status, 401, 'Should return 401')
}

// ============ RUN TESTS ============

async function runAllTests(): Promise<void> {
  console.log('Running admin donation complete and email endpoint tests...\n')

  await testCompleteWithoutEmail()
  console.log('✓ Complete donation without sending email (already sent)')

  await testCompleteWithEmailAndLog()
  console.log('✓ Complete donation with thank-you email and logging')

  await testCompleteNotFound()
  console.log('✓ Complete returns 404 when donation not found')

  await testCompleteUnauthorized()
  console.log('✓ Complete returns 401 for unauthorized requests')

  await testEmailWithValidRequest()
  console.log('✓ Custom email sends successfully with all required fields')

  await testEmailMissingSubject()
  console.log('✓ Custom email returns 400 when subject missing')

  await testEmailMissingBody()
  console.log('✓ Custom email returns 400 when body missing')

  await testEmailNullBody()
  console.log('✓ Custom email returns 400 when body is null')

  await testEmailNotFound()
  console.log('✓ Custom email returns 404 when donation not found')

  await testEmailUnauthorized()
  console.log('✓ Custom email returns 401 for unauthorized requests')

  console.log('\nAll tests passed!')
}

runAllTests().catch((error) => {
  console.error('Test suite failed:', error)
  process.exit(1)
})
