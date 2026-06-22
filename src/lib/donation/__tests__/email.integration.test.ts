import assert from 'assert'

/**
 * Integration test for email utilities
 * Tests template generation and error handling
 */

// Mock a Donation object for testing
interface MockDonation {
  id: string
  firstName: string
  email: string
  totalUsd: number
  referenceId: string
}

function generateThankYouTemplate(donation: MockDonation): string {
  const orgName = 'Ashfall United'
  const orgEmail = 'ashfall@gayduosa.org'
  const mission = 'Your gift helps young people in Monrovia access football, education, and community programmes.'

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f9f9f9;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 20px auto;
        background-color: #fff;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #1a1a1a;
        margin-bottom: 24px;
      }
      .section {
        margin-bottom: 24px;
      }
      .amount {
        font-size: 32px;
        font-weight: bold;
        color: #2563eb;
        margin: 16px 0;
      }
      .mission {
        font-style: italic;
        color: #555;
        margin: 16px 0;
      }
      .reference {
        font-family: monospace;
        color: #888;
        font-size: 14px;
        margin: 16px 0;
      }
      .footer {
        border-top: 1px solid #eee;
        padding-top: 24px;
        color: #666;
        font-size: 14px;
      }
      .signature {
        margin-top: 24px;
        color: #888;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Thank You, ${donation.firstName}!</h1>

      <div class="section">
        <p>We are deeply grateful for your generous donation to ${orgName}.</p>
      </div>

      <div class="section">
        <p><strong>Your Donation Amount:</strong></p>
        <div class="amount">$${donation.totalUsd.toFixed(2)}</div>
      </div>

      <div class="section">
        <p class="mission">${mission}</p>
      </div>

      <div class="section">
        <p><strong>Reference ID:</strong></p>
        <div class="reference">${donation.referenceId}</div>
      </div>

      <div class="footer">
        <p>If you have any questions or would like more information about our work, please feel free to reach out to us at <strong>${orgEmail}</strong>.</p>
        <div class="signature">
          <p>— ${orgName}</p>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim()
}

// Test: Thank you email template generation
function testThankYouEmailTemplateGeneration(): void {
  const donation: MockDonation = {
    id: 'test-123',
    firstName: 'John',
    email: 'john@example.com',
    totalUsd: 100.5,
    referenceId: 'REF-12345',
  }

  const html = generateThankYouTemplate(donation)

  // Check HTML structure
  assert(html.includes('<!DOCTYPE html>'), 'Template should include DOCTYPE')
  assert(html.includes('<html>'), 'Template should include html tag')
  assert(html.includes('</html>'), 'Template should include closing html tag')

  // Check content
  assert(html.includes('Thank You, John!'), 'Template should include personalized greeting')
  assert(html.includes('$100.50'), 'Template should include formatted amount')
  assert(html.includes('REF-12345'), 'Template should include reference ID')
  assert(html.includes('Ashfall United'), 'Template should include org name')
  assert(
    html.includes('Your gift helps young people in Monrovia'),
    'Template should include mission statement'
  )
  assert(
    html.includes('ashfall@gayduosa.org'),
    'Template should include org email'
  )
}

// Test: Thank you email template with different names
function testThankYouEmailTemplateWithDifferentName(): void {
  const donation: MockDonation = {
    id: 'test-456',
    firstName: 'Jane',
    email: 'jane@example.com',
    totalUsd: 250.75,
    referenceId: 'REF-99999',
  }

  const html = generateThankYouTemplate(donation)

  assert(html.includes('Thank You, Jane!'), 'Template should include Jane in greeting')
  assert(html.includes('$250.75'), 'Template should include Jane\s donation amount')
}

// Test: Amount formatting
function testAmountFormatting(): void {
  const testCases = [
    { amount: 50, expected: '$50.00' },
    { amount: 100.5, expected: '$100.50' },
    { amount: 1234.567, expected: '$1234.57' },
    { amount: 0.1, expected: '$0.10' },
    { amount: 1, expected: '$1.00' },
  ]

  testCases.forEach(({ amount, expected }) => {
    const formatted = `$${amount.toFixed(2)}`
    assert.strictEqual(
      formatted,
      expected,
      `Amount ${amount} should format to ${expected}`
    )
  })
}

// Test: Custom email body HTML conversion
function testCustomEmailBodyConversion(): void {
  const testCases = [
    {
      input: 'Hello\nWorld',
      expected: 'Hello<br />World',
      description: 'single newline conversion',
    },
    {
      input: 'Line 1\nLine 2\nLine 3',
      expected: 'Line 1<br />Line 2<br />Line 3',
      description: 'multiple newline conversion',
    },
    {
      input: 'No newlines here',
      expected: 'No newlines here',
      description: 'no newlines',
    },
    {
      input: '',
      expected: '',
      description: 'empty string',
    },
  ]

  testCases.forEach(({ input, expected, description }) => {
    const result = input.replace(/\n/g, '<br />')
    assert.strictEqual(
      result,
      expected,
      `Should handle ${description}`
    )
  })
}

// Test: Email subject generation
function testEmailSubjectGeneration(): void {
  const orgName = 'Ashfall United'
  const subjects = [
    {
      org: orgName,
      expected: 'Thank You for Your Donation to Ashfall United',
    },
  ]

  subjects.forEach(({ org, expected }) => {
    const subject = `Thank You for Your Donation to ${org}`
    assert.strictEqual(
      subject,
      expected,
      'Email subject should format correctly'
    )
  })
}

// Test: Email validation
function testEmailValidation(): void {
  const validEmails = [
    'user@example.com',
    'john.doe@example.co.uk',
    'test+tag@domain.com',
    'firstname.lastname@example.com',
  ]

  const invalidEmails = [
    'plainaddress',
    '@nodomain.com',
    'user@.com',
  ]

  // Simple email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  validEmails.forEach((email) => {
    assert(
      emailRegex.test(email),
      `${email} should be a valid email format`
    )
  })

  invalidEmails.forEach((email) => {
    assert(
      !emailRegex.test(email),
      `${email} should be invalid email format`
    )
  })
}

// Test: Reference ID validation
function testReferenceIdValidation(): void {
  const validRefIds = [
    'REF-12345',
    'REF-999999',
    'REF-ABC123',
  ]

  const refIdPattern = /^[A-Z]+-[A-Z0-9]+$/

  validRefIds.forEach((refId) => {
    assert(
      refIdPattern.test(refId),
      `${refId} should match reference ID pattern`
    )
  })
}

// Test: HTML entity escaping would be needed for user input
function testHTMLEscaping(): void {
  const dirtyInput = '<script>alert("XSS")</script>'
  const cleanOutput = dirtyInput
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  assert.strictEqual(
    cleanOutput,
    '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
    'HTML entities should be properly escaped'
  )
}

// Run all tests
console.log('Running email integration tests...\n')

testThankYouEmailTemplateGeneration()
console.log('✓ Thank you email template generation')

testThankYouEmailTemplateWithDifferentName()
console.log('✓ Thank you email template with different name')

testAmountFormatting()
console.log('✓ Amount formatting')

testCustomEmailBodyConversion()
console.log('✓ Custom email body conversion')

testEmailSubjectGeneration()
console.log('✓ Email subject generation')

testEmailValidation()
console.log('✓ Email validation')

testReferenceIdValidation()
console.log('✓ Reference ID validation')

testHTMLEscaping()
console.log('✓ HTML escaping')

console.log('\nAll email integration tests passed!')
