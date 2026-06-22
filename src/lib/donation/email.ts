import * as nodemailer from 'nodemailer'
import type { Donation } from '@/types/donation'
import { ORG_NAME, ORG_EMAIL } from '@/lib/constants'

/**
 * Create a nodemailer transporter configured for Gmail SMTP
 */
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD, // App-specific password
    },
  })
}

/**
 * Generate HTML email template for thank you email
 */
function generateThankYouTemplate(donation: Donation): string {
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
        <p>We are deeply grateful for your generous donation to ${ORG_NAME}.</p>
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
        <p>If you have any questions or would like more information about our work, please feel free to reach out to us at <strong>${ORG_EMAIL}</strong>.</p>
        <div class="signature">
          <p>— ${ORG_NAME}</p>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim()
}

/**
 * Send a thank-you email to a donor
 * @param donation - The donation object
 * @returns true if sent successfully, false if error
 */
export async function sendThankYouEmail(donation: Donation): Promise<boolean> {
  try {
    const transporter = createTransporter()
    const fromEmail = process.env.GMAIL_FROM_EMAIL

    if (!fromEmail) {
      console.error('GMAIL_FROM_EMAIL environment variable is not set')
      return false
    }

    const htmlContent = generateThankYouTemplate(donation)
    const subject = `Thank You for Your Donation to ${ORG_NAME}`

    await transporter.sendMail({
      from: fromEmail,
      to: donation.email,
      subject,
      html: htmlContent,
    })

    return true
  } catch (error) {
    console.error('Error sending thank-you email:', error)
    return false
  }
}

/**
 * Send a custom email
 * @param email - Recipient email address
 * @param subject - Email subject
 * @param body - Email body (plain text or HTML)
 * @returns true if sent successfully, false if error
 */
export async function sendCustomEmail(
  email: string,
  subject: string,
  body: string
): Promise<boolean> {
  try {
    const transporter = createTransporter()
    const fromEmail = process.env.GMAIL_FROM_EMAIL

    if (!fromEmail) {
      console.error('GMAIL_FROM_EMAIL environment variable is not set')
      return false
    }

    // Convert plain text line breaks to HTML <br />
    const htmlContent = `
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
    </style>
  </head>
  <body>
    <div class="container">
      ${body.replace(/\n/g, '<br />')}
    </div>
  </body>
</html>
    `.trim()

    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject,
      html: htmlContent,
    })

    return true
  } catch (error) {
    console.error('Error sending custom email:', error)
    return false
  }
}
