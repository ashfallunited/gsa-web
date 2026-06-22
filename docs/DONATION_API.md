# Donation API Documentation

## Overview

The Donation API provides a complete donation processing system for Asfall United. It handles:

- **Donation Creation**: Accept donations with card and mobile payment methods
- **Payment Processing**: Integration with Hey Dollr payment gateway
- **Status Tracking**: Real-time polling for payment status updates
- **Automatic Retries**: Exponential backoff retry logic for failed payments
- **Admin Dashboard**: Manage donations, send emails, export data, view analytics
- **Email Notifications**: Automated thank-you emails and custom admin emails
- **Dual Database**: Firestore (primary) + Supabase (secondary) for redundancy

Supported payment methods:
- **Card**: Credit/debit cards (Visa, Mastercard, etc.)
- **Mobile**: Mobile money networks (dependent on Hey Dollr availability)

---

## Setup

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Firebase (Firestore)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# Supabase (PostgreSQL database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Hey Dollr Payment Gateway
HEYDOLLR_CLIENT_ID=your_heydollr_client_id
HEYDOLLR_CLIENT_SECRET=your_heydollr_client_secret
HEYDOLLR_API_KEY=your_heydollr_api_key

# Gmail (Email notifications)
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your_app_specific_password
GMAIL_FROM_EMAIL=noreply@yourorg.org

# Admin credentials
ADMIN_USERNAME=admin_username
ADMIN_PASSWORD=admin_password
ADMIN_SESSION_SECRET=randomly_generated_secret

# Deployment
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
CRON_SECRET=random_secret_for_cron_verification
```

### Database Setup

#### Firestore (Primary Database)

Firestore is automatically set up via the Firebase console. The `donations` collection will be created on first write with the following structure:

```typescript
{
  id: string                    // Document ID (auto-generated)
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string               // ISO 3166-1 alpha-2 code
  message: string | null
  ipAddress: string
  
  amountUsd: number
  paymentMethod: 'card' | 'mobile'
  coverFees: boolean
  feeUsd: number
  totalUsd: number
  
  referenceId: string           // Hey Dollr reference ID
  status: 'pending' | 'processing' | 'completed' | 'failed'
  dollrStatus: string           // Status from Hey Dollr API
  
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt: Timestamp | null
  
  emailSent: boolean
  notes: string | null
  retryAttempts: number
  nextRetryAt: Timestamp | null
}
```

#### Supabase (Secondary Database)

Create the following tables in Supabase:

**donations table:**
```sql
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR NOT NULL,
  country VARCHAR(2) NOT NULL,
  message TEXT,
  ip_address VARCHAR,
  
  amount_usd DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR NOT NULL,
  cover_fees BOOLEAN NOT NULL,
  fee_usd DECIMAL(10,2),
  total_usd DECIMAL(10,2) NOT NULL,
  
  reference_id VARCHAR UNIQUE,
  status VARCHAR NOT NULL,
  dollr_status VARCHAR,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  email_sent BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  retry_attempts INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP
);

CREATE INDEX donations_status_idx ON donations(status);
CREATE INDEX donations_created_at_idx ON donations(created_at);
CREATE INDEX donations_email_idx ON donations(email);
```

**email_logs table:**
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID REFERENCES donations(id),
  email_type VARCHAR NOT NULL,
  recipient_email VARCHAR NOT NULL,
  subject VARCHAR,
  admin_email VARCHAR,
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR
);

CREATE INDEX email_logs_donation_idx ON email_logs(donation_id);
CREATE INDEX email_logs_sent_at_idx ON email_logs(sent_at);
```

### Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-donations",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

This runs the donation sync cron job every 2 minutes.

---

## Public Endpoints

### POST /api/donations/create

Creates a new donation record and initiates payment with Hey Dollr.

**Request:**
```bash
curl -X POST https://yourdomain.com/api/donations/create \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "country": "US",
    "amountUsd": 50,
    "paymentMethod": "card",
    "coverFees": false,
    "message": "Amazing work! Keep it up."
  }'
```

**Request Body:**
```typescript
{
  firstName: string           // Required, 1-100 chars
  lastName: string            // Required, 1-100 chars
  email: string               // Required, valid email format
  phone: string               // Required, international format
  country: string             // Required, ISO 3166-1 alpha-2 code
  amountUsd: number           // Required, minimum $1
  paymentMethod: 'card' | 'mobile'  // Required
  coverFees: boolean          // Required, covers 2.9% processing fee
  message?: string            // Optional, donor message
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "donationId": "doc_1718889234567_abc123def456",
  "status": "pending",
  "paymentUrl": null
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "fields": {
    "email": "Email format is invalid",
    "amountUsd": "Minimum donation is $1"
  }
}
```

**Error Response (500 Server Error):**
```json
{
  "success": false,
  "error": "Failed to initiate payment. Please try again."
}
```

**Validation Rules:**
- First name: required, non-empty string
- Last name: required, non-empty string
- Email: required, valid email format (RFC 5322)
- Phone: required, non-empty string
- Country: required, must be valid ISO 3166-1 alpha-2 code
- Amount: required, minimum $1, must be a number
- Payment method: required, must be 'card' or 'mobile'
- Cover fees: required, must be boolean
- Message: optional, up to 500 characters

**Fee Calculation:**
- If `coverFees` is true: fee = amount × 2.9%
- If `coverFees` is false: fee = $0
- Total charged: amount + fee

---

### GET /api/donations/[id]/status

Retrieves the current status of a donation. Used for client-side polling.

**Request:**
```bash
curl https://yourdomain.com/api/donations/doc_1718889234567_abc123def456/status
```

**Success Response (200 OK):**
```json
{
  "id": "doc_1718889234567_abc123def456",
  "status": "completed",
  "amountUsd": 50,
  "totalUsd": 50,
  "message": "Thank you! Your donation is complete.",
  "createdAt": "2026-06-22T10:15:30.123Z"
}
```

**Status Values:**
- `pending`: Awaiting payment confirmation from Hey Dollr
- `processing`: Payment is being processed
- `completed`: Payment succeeded and thank-you email sent
- `failed`: Payment failed, will retry or needs manual intervention

**Error Response (404 Not Found):**
```json
{
  "error": "Donation not found"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid donation ID"
}
```

---

## Admin Endpoints

All admin endpoints require authentication via `requireAdmin()` middleware. Admin credentials are checked against `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

### GET /api/admin/donations

Lists all donations with filtering and pagination.

**Request:**
```bash
curl -X GET 'https://yourdomain.com/api/admin/donations?status=completed&limit=50&offset=0' \
  -H "Authorization: Bearer admin_token"
```

**Query Parameters:**
- `status`: Filter by status (pending, processing, completed, failed) - optional
- `paymentMethod`: Filter by method (card, mobile) - optional
- `dateFrom`: ISO 8601 date (YYYY-MM-DD) - optional
- `dateTo`: ISO 8601 date (YYYY-MM-DD) - optional
- `limit`: Results per page (1-500, default 50)
- `offset`: Pagination offset (default 0)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc_1718889234567_abc123def456",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "amountUsd": 50,
      "totalUsd": 50,
      "status": "completed",
      "paymentMethod": "card",
      "createdAt": "2026-06-22T10:15:30.123Z",
      "emailSent": true
    }
  ],
  "total": 142,
  "limit": 50,
  "offset": 0
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Admin authentication required"
}
```

---

### GET /api/admin/donations/export

Exports all donations as CSV for reporting and accounting.

**Request:**
```bash
curl -X GET 'https://yourdomain.com/api/admin/donations/export?status=completed' \
  -H "Authorization: Bearer admin_token"
```

**Query Parameters:**
- `status`: Filter by status - optional
- `dateFrom`: Filter by date range - optional
- `dateTo`: Filter by date range - optional

**Success Response (200 OK - CSV):**
```
First Name,Last Name,Email,Phone,Country,Amount USD,Fee USD,Total USD,Payment Method,Status,Created At,Completed At,Email Sent
John,Doe,john@example.com,+1234567890,US,50.00,0.00,50.00,card,completed,2026-06-22T10:15:30Z,2026-06-22T10:16:00Z,true
Jane,Smith,jane@example.com,+1987654321,UK,100.00,2.90,102.90,mobile,completed,2026-06-22T10:20:00Z,2026-06-22T10:21:00Z,true
```

**Headers:**
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="donations_export_2026-06-22.csv"`

---

### POST /api/admin/donations/[id]/complete

Manually mark a donation as complete (for offline payments or verified transfers).

**Request:**
```bash
curl -X POST https://yourdomain.com/api/admin/donations/doc_1718889234567_abc123def456/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token" \
  -d '{
    "notes": "Payment verified via bank transfer on 2026-06-22"
  }'
```

**Request Body:**
```json
{
  "notes": "Optional admin notes about this completion"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Donation marked as complete",
  "donation": {
    "id": "doc_1718889234567_abc123def456",
    "status": "completed",
    "completedAt": "2026-06-22T10:15:30.123Z",
    "notes": "Payment verified via bank transfer on 2026-06-22"
  }
}
```

---

### POST /api/admin/donations/[id]/email

Send a custom email to a donor.

**Request:**
```bash
curl -X POST https://yourdomain.com/api/admin/donations/doc_1718889234567_abc123def456/email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token" \
  -d '{
    "subject": "Update on Your Donation",
    "body": "Thank you for your generous gift. Here's what we accomplished this month..."
  }'
```

**Request Body:**
```json
{
  "subject": "Email subject line",
  "body": "Email body (plain text or HTML)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Email sent to john@example.com"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Donation not found"
}
```

---

### GET /api/admin/donations/analytics

Retrieve donation analytics and metrics.

**Request:**
```bash
curl -X GET 'https://yourdomain.com/api/admin/donations/analytics?period=month' \
  -H "Authorization: Bearer admin_token"
```

**Query Parameters:**
- `period`: day, week, month, year, all (default: month)

**Success Response (200 OK):**
```json
{
  "success": true,
  "analytics": {
    "period": "month",
    "totalDonations": 156,
    "totalAmount": 12450.50,
    "averageDonation": 79.81,
    "completedDonations": 142,
    "pendingDonations": 12,
    "failedDonations": 2,
    "emailsSent": 142,
    "byPaymentMethod": {
      "card": 98,
      "mobile": 44
    },
    "byStatus": {
      "pending": 12,
      "processing": 2,
      "completed": 142,
      "failed": 2
    },
    "topCountries": [
      { "country": "US", "count": 45, "amount": 3500.00 },
      { "country": "UK", "count": 32, "amount": 2800.00 },
      { "country": "NG", "count": 28, "amount": 1900.00 }
    ]
  }
}
```

---

## Cron Job

### /api/cron/sync-donations

The cron job runs every 2 minutes (configurable in `vercel.json`) and:

1. **Queries pending donations** from Firestore
2. **Checks Hey Dollr API** for payment status updates
3. **Updates donation status** when payments complete
4. **Sends thank-you emails** when donations are completed
5. **Schedules retries** for failed payments
6. **Syncs to Supabase** for redundancy

**Polling Interval:** Every 2 minutes

**Retry Schedule (Exponential Backoff):**
```
Attempt 1: Wait 5 minutes
Attempt 2: Wait 15 minutes
Attempt 3: Wait 45 minutes
Attempt 4: Wait 2 hours
Attempt 5: Wait 6 hours
After attempt 5: Give up (72 hour expiry)
```

**Request (Automatic via Vercel):**
```bash
curl -X POST https://yourdomain.com/api/cron/sync-donations \
  -H "Authorization: Bearer CRON_SECRET"
```

**Environment Variable:**
- `CRON_SECRET`: Random token to verify cron requests

**Response:**
```json
{
  "success": true,
  "processedDonations": 3,
  "completedDonations": 2,
  "emailsSent": 2,
  "retryScheduled": 1,
  "errors": 0
}
```

---

## Testing

### Run All Integration Tests

```bash
npm test -- src/__tests__/donation/integration.test.ts
```

This runs 22 comprehensive test cases covering:
- Full donation flow
- Fee calculations
- Retry logic
- Concurrent requests
- Admin operations
- Error handling
- Edge cases

### Test Scenarios

The integration test suite covers:

1. **Full donation flow**: Create → Payment → Status polling → Completion → Email
2. **Fee coverage**: Calculation and charging of 2.9% processing fee
3. **Retry logic**: Failed payments with exponential backoff
4. **Concurrent donations**: Multiple donations processed simultaneously
5. **Admin operations**: List, filter, complete, export
6. **Email notifications**: Thank-you and custom emails
7. **Error handling**: Validation, not found, gateway failures
8. **Supabase failover**: Primary DB success with secondary DB failure
9. **Analytics**: Aggregation by status, payment method, country

### Example: Run Specific Test

```bash
npm test -- src/__tests__/donation/integration.test.ts -t "Full donation flow"
```

---

## Troubleshooting

### "Failed to initiate payment"

**Cause:** Hey Dollr API is unreachable or credentials are incorrect.

**Fix:**
1. Verify `HEYDOLLR_CLIENT_ID`, `HEYDOLLR_CLIENT_SECRET`, and `HEYDOLLR_API_KEY` are set
2. Check Hey Dollr API status
3. Ensure your IP is whitelisted in Hey Dollr settings
4. Check server logs: `vercel logs`

### "Failed to create donation record"

**Cause:** Firestore write failed.

**Fix:**
1. Verify Firebase credentials in `FIREBASE_SERVICE_ACCOUNT_KEY`
2. Check Firestore quotas and billing
3. Ensure `donations` collection exists
4. Check Firestore rules allow writes

### "Donation not found"

**Cause:** Donation ID doesn't exist or was misspelled.

**Fix:**
1. Verify donation ID is correct
2. Check it was created successfully (should return 201)
3. Ensure you're querying the correct environment (prod vs staging)

### "Email failed to send"

**Cause:** Gmail credentials are incorrect or email quota exceeded.

**Fix:**
1. Use app-specific password, not regular Gmail password
2. Enable "Less secure app access" (if not using app-specific passwords)
3. Check Gmail quota: https://myaccount.google.com/device-activity
4. Verify `GMAIL_USER`, `GMAIL_PASSWORD`, `GMAIL_FROM_EMAIL` are set
5. Test with: `vercel env pull` then `npm run test:email`

### "Cron job not running"

**Cause:** `vercel.json` not configured or environment variables missing.

**Fix:**
1. Add `crons` section to `vercel.json`
2. Verify `CRON_SECRET` is set in Vercel environment
3. Check Vercel deployment logs
4. Manually trigger: `curl -H "Authorization: Bearer CRON_SECRET" https://yourdomain.com/api/cron/sync-donations`

### "Supabase connection failed (non-fatal)"

**Cause:** Supabase write succeeded in Firestore but failed in Supabase.

**Fix:**
1. This is non-fatal - Firestore is primary database
2. Manually sync: Check Firestore donations and insert into Supabase
3. Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
4. Check Supabase status and quota

### "Invalid date format"

**Cause:** Date parameter not in ISO 8601 format.

**Fix:**
1. Use format: `YYYY-MM-DD` (e.g., `2026-06-22`)
2. Or: `YYYY-MM-DDTHH:mm:ssZ` (e.g., `2026-06-22T10:15:30Z`)

### "Admin authentication required"

**Cause:** Admin middleware rejected the request.

**Fix:**
1. Verify admin session is valid
2. Check `ADMIN_USERNAME` and `ADMIN_PASSWORD`
3. Check `ADMIN_SESSION_SECRET` is consistent across instances
4. Clear browser cookies and login again

---

## Security Considerations

### Data Protection
- All database fields are encrypted in Firestore
- Sensitive payment data is never logged
- IP addresses are logged for fraud detection
- Email addresses are kept private

### API Security
- Admin endpoints require authentication
- Cron endpoint requires `CRON_SECRET` verification
- CORS headers restrict external API calls
- Rate limiting prevents brute force attacks

### Payment Security
- All payment data is handled by Hey Dollr (PCI compliant)
- Webhook validation prevents spoofing
- Reference IDs are unique per donation
- Retry logic validates all previous attempts

### Email Security
- Emails use Gmail SMTP with app-specific passwords
- No payment details included in emails
- Unsubscribe links provided
- HTML templates prevent injection attacks

---

## Scaling & Performance

### Database Indexing
- Firestore: Automatic indexing on `status`, `email`, `createdAt`
- Supabase: Indexes on `status`, `email`, `created_at`
- Both support efficient queries on large datasets

### Cron Job Optimization
- Processes only pending/processing donations
- Batch status checks with concurrent requests
- Moves completed donations out of active query
- Exponential backoff prevents API overload

### Rate Limiting
- Hey Dollr: 100 requests/minute per API key
- Gmail: 1,000 recipients/24 hours
- Firestore: 10,000 writes/second per database
- Supabase: Standard PostgreSQL limits

### Monitoring
- Check Vercel logs: `vercel logs`
- Monitor Firestore usage: Firebase Console
- Monitor Supabase usage: Supabase Dashboard
- Track email delivery: Gmail Activity Log

---

## Version History

- **v1.0** (Jun 22, 2026): Initial release
  - Support for card and mobile payments
  - Dual database (Firestore + Supabase)
  - Admin dashboard
  - Email notifications
  - Automated retry logic
