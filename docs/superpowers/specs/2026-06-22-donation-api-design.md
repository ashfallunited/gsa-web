# Donation API Design Specification

**Date**: 2026-06-22  
**Status**: Design Phase  
**Scope**: Backend API for processing donations via Hey Dollr (mobile money + cards)

---

## 1. Overview

This specification outlines the API architecture for processing donations in the GSA web application. The system integrates with Hey Dollr for payment processing, stores donor records in Firestore (primary) and Supabase (copy), and supports both mobile money (Liberia) and international card payments.

### Key Principles
- **Backend-driven payment control**: All sensitive operations handled server-side
- **Dual-write pattern**: Firestore for primary dashboard, Supabase for relational backup
- **Resilient retry logic**: Exponential backoff for failed payments
- **Real-time polling**: 2-minute status checks for payment confirmation
- **Server-rendered form**: Donation form uses Next.js Server Components for SSR

---

## 2. Database Schema

### Firestore Collection: `donations`

```typescript
interface Donation {
  id: string // Auto-generated
  
  // Donor Information
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string // ISO country code from dropdown
  message: string | null
  ipAddress: string
  
  // Donation Details
  amountUsd: number
  paymentMethod: 'card' | 'mobile'
  coverFees: boolean
  feeUsd: number
  totalUsd: number
  
  // Payment Tracking
  referenceId: string // Hey Dollr reference
  status: 'pending' | 'processing' | 'completed' | 'failed'
  dollrStatus: string // Raw status from Hey Dollr API
  
  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt: Timestamp | null
  
  // Admin Fields
  emailSent: boolean
  notes: string | null
  retryAttempts: number // Counter for exponential backoff retries
  nextRetryAt: Timestamp | null
}
```

### Supabase Table: `donations`

```sql
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Donor Info
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  country VARCHAR(2),
  message TEXT,
  ip_address INET,
  
  -- Donation Details
  amount_usd DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  cover_fees BOOLEAN DEFAULT false,
  fee_usd DECIMAL(10, 2) DEFAULT 0,
  total_usd DECIMAL(10, 2) NOT NULL,
  
  -- Payment Tracking
  reference_id VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  dollr_status VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  email_sent BOOLEAN DEFAULT false,
  admin_notes TEXT,
  
  CONSTRAINT email_valid CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_created_at ON donations(created_at);
CREATE INDEX idx_donations_email ON donations(email);

-- Audit trail for manual emails sent by admins
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES donations(id),
  email_type VARCHAR(20) NOT NULL, -- 'auto_thank_you' | 'admin_custom'
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  admin_email VARCHAR(255), -- Who sent it (for admin emails)
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent', -- 'sent' | 'failed' | 'bounced'
  error_message TEXT
);

CREATE INDEX idx_email_logs_donation ON email_logs(donation_id);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);
```

---

## 3. API Endpoints

### Public Endpoints

#### POST `/api/donations/create`
**Server Action**: Creates donation record and initiates payment with Hey Dollr

**Request**:
```typescript
{
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  amountUsd: number
  paymentMethod: 'card' | 'mobile'
  coverFees: boolean
  message?: string
}
```

**Response** (Success):
```typescript
{
  success: true
  donationId: string
  status: 'pending' | 'processing'
  paymentUrl?: string // For card payments (checkout session URL)
  instructions?: string // For mobile money
}
```

**Response** (Error):
```typescript
{
  success: false
  error: string // Field-specific or general error
  fields?: Record<string, string> // Validation errors per field
}
```

**Flow**:
1. Validate all inputs
2. Extract IP address from request headers
3. Save to Firestore with `status: 'pending'`
4. Save to Supabase (same record)
5. Call Hey Dollr API:
   - Card: `POST /checkouts/create` → `POST /sessions/checkout`
   - Mobile: `POST /sessions/payout` (for mobile money in Liberia)
6. Return donation ID + payment info
7. On error: Return 400 with validation errors or 500 with service error

---

#### GET `/api/donations/[id]/status`
**Purpose**: Client polls for donation status updates

**Response**:
```typescript
{
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  amountUsd: number
  totalUsd: number
  message?: string // Relevant user-facing message
  createdAt: Timestamp
}
```

**Polling Strategy**: Client polls every 5 seconds on success page, stops after 72 hours or status change.

---

### Admin Endpoints

#### GET `/api/admin/donations`
**Purpose**: Retrieve paginated donation list with filters

**Query Parameters**:
```
status?: 'pending' | 'processing' | 'completed' | 'failed'
paymentMethod?: 'card' | 'mobile'
dateFrom?: ISO string (2026-06-22)
dateTo?: ISO string
limit?: number (default 50, max 500)
offset?: number (default 0)
```

**Response**:
```typescript
{
  data: Donation[]
  total: number
  limit: number
  offset: number
}
```

---

#### GET `/api/admin/donations/export`
**Purpose**: Export donations as CSV

**Query Parameters**: Same as `/admin/donations`

**Response**: CSV file with headers:
```
id, first_name, last_name, email, country, amount_usd, payment_method, status, created_at, completed_at
```

---

#### POST `/api/admin/donations/[id]/complete`
**Purpose**: Manually mark donation as completed (for offline payments)

**Request**:
```typescript
{
  notes?: string
}
```

**Response**:
```typescript
{
  success: true
  donation: Donation
  emailSent: boolean
}
```

**Side Effects**:
- Updates Firestore + Supabase `status: 'completed'`, `completedAt: now()`
- Triggers auto thank-you email
- Updates `email_sent: true`

---

#### POST `/api/admin/donations/[id]/send-email`
**Purpose**: Send custom email to donor

**Request**:
```typescript
{
  subject: string
  body: string
}
```

**Response**:
```typescript
{
  success: true
  sentAt: Timestamp
}
```

---

#### GET `/api/admin/donations/analytics`
**Purpose**: Return donation analytics and metrics

**Response**:
```typescript
{
  totalRaised: number
  donorCount: number
  averageDonation: number
  completionRate: string // "89%"
  
  byPaymentMethod: {
    card: { count: number, total: number }
    mobile: { count: number, total: number }
  }
  
  byStatus: {
    completed: number
    pending: number
    processing: number
    failed: number
  }
  
  chartData: {
    dailyTotals: Array<{ date: string, amount: number }>
    topCountries: Array<{ country: string, count: number }>
  }
}
```

---

## 4. Payment Flow

### Payment Initiation (Server Action)

1. **Validation**: Check all required fields, validate email, ensure amount ≥ $1
2. **Firestore Write**: Save donation with `status: 'pending'`
3. **Supabase Write**: Mirror record to relational DB
4. **Hey Dollr Integration**:
   - Card: Create checkout session, return payment URL
   - Mobile: Create mobile money session, return payment instructions
5. **Response**: Return donation ID + payment info to client

### Payment Processing (Hey Dollr)

- User completes payment on Hey Dollr (card) or mobile money network (Liberia)
- Hey Dollr updates transaction status (pending → completed/failed)

### Status Polling (Background Job)

**Schedule**: Every 2 minutes  
**Process**:
1. Query Firestore for all donations with `status: 'pending'` or `'processing'`
2. For each donation:
   - Call `GET /status/collection/{reference_id}` on Hey Dollr
   - Compare previous status with current status
   - If changed:
     - Update Firestore + Supabase
     - If `completed`: Trigger auto thank-you email
     - If `failed`: Add to retry queue

### Retry Logic

**Exponential Backoff Schedule** (after initial poll fails):
- Retry 1: After 5 minutes
- Retry 2: After 15 minutes
- Retry 3: After 45 minutes
- Retry 4: After 2 hours
- Retry 5: After 6 hours
- Final: Mark as `failed`, notify admin

**Retry Storage**: Use Firestore `retryAttempts` counter field (add to schema)

### User Success Page

- Shows donation summary + "Awaiting payment confirmation" message
- Client polls `/api/donations/[id]/status` every 5 seconds
- Updates UI in real-time as status changes
- Polling stops after 72 hours or when status is `completed` or `failed`

---

## 5. Error Handling

| Scenario | Handler |
|----------|---------|
| Invalid form data | Return 400 with field errors |
| Hey Dollr API down | Save donation as `pending`, retry polling later |
| Payment timeout (no response after 30 mins) | Mark as `failed`, user prompted to retry or contact support |
| Duplicate submission (same email + amount within 1 min) | Detect via Firestore query, return existing donation ID |
| Mobile money success but polling missed it | 48-hour lookback in polling job; manual admin recovery |
| User navigates away during payment | Success page keeps polling until completion or 72-hour expiry |
| Email delivery failure | Log error, allow admin to retry via `/send-email` |

---

## 6. Email System

### Auto Thank-You Email

**Trigger**: When donation `status` changes to `completed`  
**Provider**: Gmail SMTP (nodemailer)  
**Template**: Simple HTML email with:
- Donor's first name
- Donation amount + currency
- Impact tier description
- Reference ID
- Call-to-action (share donation)

**Tracking**: Update `email_sent: true` in both DBs  
**Retry**: If initial send fails, retry up to 3 times

### Manual Custom Email

**Endpoint**: `POST /api/admin/donations/[id]/send-email`  
**Input**: Subject + body text (from admin dashboard form)  
**Logging**: Record send event with admin email + timestamp in Supabase `email_logs` table (audit trail)

---

## 7. Frontend: Donation Form

### Architecture

**Server Component** (`src/app/donate/page.tsx`):
- Renders form with SSR
- Collects: First name, Last name, Email, Phone, **Country (new dropdown)**, Amount, Payment method, Message, Cover fees checkbox
- On submit: Call Server Action `/api/donations/create`
- On success: Redirect to donation success page with ID in URL
- On error: Display field-level errors

**Client Component** (Success page):
- Shows donation summary
- Polls `/api/donations/[id]/status` every 5 seconds
- Updates UI based on status
- Shows appropriate messaging per status

### Country Dropdown

Add to donation form:
- ISO country dropdown with flag icons
- Pre-populate based on browser geo (optional)
- Required field
- Store as `country: string` (ISO 3166-1 alpha-2 code)

---

## 8. Admin Dashboard Features

### Donations List View
- Table: Donor name, Email, Amount, Payment method, Status, Date, Country
- Filters: Status, Payment method, Date range
- Pagination: 50 per page
- Actions: View details, Manually complete, Send email, Delete (soft-delete)

### Export Donations
- CSV download with all fields
- Respects applied filters
- Filename: `donations_YYYY-MM-DD.csv`

### Analytics Dashboard
- Cards: Total raised, Donor count, Average donation, Completion rate
- Charts: Daily totals (bar chart), Top countries (pie/bar)
- Breakdown: By payment method, by status

### Manual Email
- Select donor from list
- Compose subject + body
- Send button
- Confirmation toast + audit log

---

## 9. Infrastructure & Deployment

### Environment Variables

```
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

HEYDOLLR_API_KEY=...
HEYDOLLR_CLIENT_ID=...
HEYDOLLR_CLIENT_SECRET=...

GMAIL_USER=...
GMAIL_PASSWORD=... (or app-specific password)
GMAIL_FROM_EMAIL=...

POLLING_INTERVAL_MINUTES=2
RETRY_EXPIRY_HOURS=72
```

### Background Job (Polling)

**Implementation**: Vercel Cron Job or Cloud Scheduler  
**Endpoint**: `POST /api/cron/donations/sync-status`  
**Schedule**: Every 2 minutes  
**Auth**: Verify `Authorization: Bearer CRON_SECRET` header

---

## 10. Testing Strategy

- Unit: Payment amount calculations, status transitions, retry logic
- Integration: Firestore + Supabase dual-write, Hey Dollr API mocking
- E2E: Full donation flow (form → payment → success)
- Admin: Filter/export functionality

---

## 11. Scope & Future Considerations

### In Scope (MVP)
- One-time donations (card + mobile money)
- Dual-write to Firestore + Supabase
- 2-minute polling with retry logic
- Admin list/filter/export/complete/email
- Auto thank-you emails

### Out of Scope (Future)
- Recurring/monthly donations (form has placeholder)
- Donation tiers/campaigns
- Donor dashboard (view own donations)
- Payment method tokenization (save card for future)
- Webhook integration with Hey Dollr (polling only for MVP)

---

## Approval Checklist

- [ ] Database schema approved
- [ ] API endpoints approved
- [ ] Payment flow approved
- [ ] Error handling strategy approved
- [ ] Email system approved
- [ ] Admin features approved
- [ ] Ready to proceed with implementation plan
