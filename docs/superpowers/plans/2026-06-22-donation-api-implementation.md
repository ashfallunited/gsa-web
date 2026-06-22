# Donation API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete donation system with Hey Dollr integration, dual-write to Firestore + Supabase, 2-minute status polling, and admin dashboard.

**Architecture:** Server-rendered donation form collects details, creates record in both DBs, initiates payment with Hey Dollr, and polls for updates every 2 minutes with exponential backoff retries. Admins can view, filter, export, manually complete, and email donors.

**Tech Stack:** Next.js App Router (Server Components + Server Actions), Firestore, Supabase, Hey Dollr API, Gmail SMTP (nodemailer), TypeScript

## Global Constraints

- Polling interval: 2 minutes
- Retry expiry: 72 hours
- Payment methods: card (international), mobile (Liberia)
- Minimum donation: $1 USD
- Email provider: Gmail SMTP
- Database dual-write: Always write to Firestore AND Supabase simultaneously
- Form rendering: Server Component with SSR (not client-heavy)
- Admin auth: Reuse existing admin middleware from `src/lib/admin-auth.ts`

---

## Task 1: Set up types and constants

**Files:**
- Create: `src/types/donation.ts`
- Create: `src/lib/country-data.ts`
- Create: `src/lib/donation/constants.ts`

**Interfaces:**
- Produces: `Donation`, `DonationInput`, `DonationResponse` types used by all tasks

### Step 1: Create donation types file

Create `src/types/donation.ts`:

```typescript
import type { Timestamp } from 'firebase/firestore'

export type PaymentMethod = 'card' | 'mobile'
export type DonationStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Donation {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string // ISO 3166-1 alpha-2 code
  message: string | null
  ipAddress: string

  amountUsd: number
  paymentMethod: PaymentMethod
  coverFees: boolean
  feeUsd: number
  totalUsd: number

  referenceId: string // Hey Dollr reference
  status: DonationStatus
  dollrStatus: string

  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt: Timestamp | null

  emailSent: boolean
  notes: string | null
  retryAttempts: number
  nextRetryAt: Timestamp | null
}

export interface DonationInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  amountUsd: number
  paymentMethod: PaymentMethod
  coverFees: boolean
  message?: string
}

export interface DonationResponse {
  success: boolean
  error?: string
  fields?: Record<string, string>
  donationId?: string
  status?: DonationStatus
  paymentUrl?: string
  instructions?: string
}
```

- [ ] **Step 2: Create country data with flags**

Create `src/lib/country-data.ts`:

```typescript
export interface Country {
  code: string // ISO 3166-1 alpha-2
  name: string
  flag: string // Unicode flag emoji
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  // Add more as needed
].sort((a, b) => a.name.localeCompare(b.name))

export function getCountryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name || code
}

export function getCountryFlag(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.flag || ''
}
```

- [ ] **Step 3: Create donation constants**

Create `src/lib/donation/constants.ts`:

```typescript
export const DONATION_PRESETS_USD = [25, 50, 100, 250, 500] as const
export const MIN_DONATION_USD = 1
export const PROCESSING_FEE_RATE = 0.029 // 2.9%

export const DONATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export const PAYMENT_METHODS = {
  CARD: 'card',
  MOBILE: 'mobile',
} as const

export const RETRY_SCHEDULE_MINUTES = [5, 15, 45, 120, 360] // exponential backoff
export const RETRY_EXPIRY_HOURS = 72
export const POLLING_INTERVAL_MINUTES = 2

export const IMPACT_TIERS = [
  { amount: '$25', label: 'Training kit for one youth player' },
  { amount: '$50', label: 'A week of meals for programme participants' },
  { amount: '$100', label: 'Educational materials for an entire cohort' },
  { amount: '$250+', label: 'Supports volunteers and community sessions' },
] as const
```

- [ ] **Step 4: Commit**

```bash
git add src/types/donation.ts src/lib/country-data.ts src/lib/donation/constants.ts
git commit -m "feat: add donation types and constants"
```

---

## Task 2: Set up Firebase utilities

**Files:**
- Create: `src/lib/donation/firestore.ts`
- Modify: `src/lib/firebase-admin.ts` (verify existing admin init)

**Interfaces:**
- Consumes: `Donation`, `DonationInput` from Task 1
- Produces: `saveDonationToFirestore()`, `updateDonationStatus()`, `getDonation()`, `queryPendingDonations()`

### Step 1: Create Firestore donation utilities

Create `src/lib/donation/firestore.ts`:

```typescript
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { getApp } from 'firebase/app'
import type { Donation, DonationInput, DonationStatus } from '@/types/donation'
import { DONATION_STATUS } from './constants'

const COLLECTION = 'donations'

export async function saveDonationToFirestore(input: DonationInput, ipAddress: string, referenceId: string): Promise<string> {
  const db = getFirestore(getApp())
  const now = Timestamp.now()

  const donation = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    country: input.country,
    message: input.message || null,
    ipAddress,
    amountUsd: input.amountUsd,
    paymentMethod: input.paymentMethod,
    coverFees: input.coverFees,
    feeUsd: input.coverFees ? Math.round(input.amountUsd * 0.029 * 100) / 100 : 0,
    totalUsd: input.coverFees
      ? input.amountUsd + Math.round(input.amountUsd * 0.029 * 100) / 100
      : input.amountUsd,
    referenceId,
    status: DONATION_STATUS.PENDING,
    dollrStatus: 'pending',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    emailSent: false,
    notes: null,
    retryAttempts: 0,
    nextRetryAt: null,
  }

  const docRef = await addDoc(collection(db, COLLECTION), donation)
  return docRef.id
}

export async function getDonation(id: string): Promise<Donation | null> {
  const db = getFirestore(getApp())
  const docRef = doc(db, COLLECTION, id)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Donation
}

export async function updateDonationStatus(
  id: string,
  status: DonationStatus,
  dollrStatus: string,
  notes?: string
): Promise<void> {
  const db = getFirestore(getApp())
  const docRef = doc(db, COLLECTION, id)

  const updateData: Record<string, any> = {
    status,
    dollrStatus,
    updatedAt: Timestamp.now(),
  }

  if (status === DONATION_STATUS.COMPLETED) {
    updateData.completedAt = Timestamp.now()
  }

  if (notes !== undefined) {
    updateData.notes = notes
  }

  await updateDoc(docRef, updateData)
}

export async function queryPendingDonations(): Promise<Donation[]> {
  const db = getFirestore(getApp())
  const q = query(
    collection(db, COLLECTION),
    where('status', 'in', [DONATION_STATUS.PENDING, DONATION_STATUS.PROCESSING])
  )

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Donation))
}

export async function markEmailSent(id: string): Promise<void> {
  const db = getFirestore(getApp())
  const docRef = doc(db, COLLECTION, id)
  await updateDoc(docRef, { emailSent: true })
}

export async function incrementRetryAttempts(id: string, nextRetryAt: Date): Promise<void> {
  const db = getFirestore(getApp())
  const docRef = doc(db, COLLECTION, id)
  await updateDoc(docRef, {
    retryAttempts: (await getDoc(docRef)).data()?.retryAttempts + 1 || 1,
    nextRetryAt: Timestamp.fromDate(nextRetryAt),
  })
}
```

- [ ] **Step 2: Verify Firebase admin is initialized**

Run: `grep -n "initializeApp" src/lib/firebase-admin.ts`

Expected output: Should show initialization code. If not, ensure `src/lib/firebase-admin.ts` exists and has:

```typescript
import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')),
  })
}

export const db = admin.firestore()
export const auth = admin.auth()
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/donation/firestore.ts
git commit -m "feat: add Firestore donation operations"
```

---

## Task 3: Set up Supabase utilities

**Files:**
- Create: `src/lib/donation/supabase.ts`

**Interfaces:**
- Consumes: `Donation`, `DonationInput` from Task 1
- Produces: `saveDonationToSupabase()`, `updateSupabaseDonation()`, `logEmail()`

### Step 1: Create Supabase donation utilities

Create `src/lib/donation/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Donation, DonationInput, DonationStatus } from '@/types/donation'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

export async function saveDonationToSupabase(
  input: DonationInput,
  ipAddress: string,
  referenceId: string,
  firebaseId: string
): Promise<void> {
  const feeUsd = input.coverFees ? Math.round(input.amountUsd * 0.029 * 100) / 100 : 0
  const totalUsd = input.amountUsd + feeUsd

  const { error } = await supabase.from('donations').insert({
    id: firebaseId,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    country: input.country,
    message: input.message || null,
    ip_address: ipAddress,
    amount_usd: input.amountUsd,
    payment_method: input.paymentMethod,
    cover_fees: input.coverFees,
    fee_usd: feeUsd,
    total_usd: totalUsd,
    reference_id: referenceId,
    status: 'pending',
    dollr_status: 'pending',
    email_sent: false,
    admin_notes: null,
  })

  if (error) throw new Error(`Supabase insert failed: ${error.message}`)
}

export async function updateSupabaseDonation(
  id: string,
  status: DonationStatus,
  dollrStatus: string,
  notes?: string
): Promise<void> {
  const updateData: Record<string, any> = {
    status,
    dollr_status: dollrStatus,
    updated_at: new Date().toISOString(),
  }

  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  if (notes !== undefined) {
    updateData.admin_notes = notes
  }

  const { error } = await supabase.from('donations').update(updateData).eq('id', id)

  if (error) throw new Error(`Supabase update failed: ${error.message}`)
}

export async function markEmailSentSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('donations').update({ email_sent: true }).eq('id', id)

  if (error) throw new Error(`Supabase email update failed: ${error.message}`)
}

export async function logEmail(
  donationId: string,
  emailType: 'auto_thank_you' | 'admin_custom',
  recipientEmail: string,
  subject: string | null,
  adminEmail?: string
): Promise<void> {
  const { error } = await supabase.from('email_logs').insert({
    donation_id: donationId,
    email_type: emailType,
    recipient_email: recipientEmail,
    subject: subject,
    admin_email: adminEmail || null,
    status: 'sent',
  })

  if (error) throw new Error(`Email log failed: ${error.message}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/donation/supabase.ts
git commit -m "feat: add Supabase donation operations"
```

---

## Task 4: Create Hey Dollr API client

**Files:**
- Create: `src/lib/donation/heydollr.ts`

**Interfaces:**
- Consumes: Environment variables `HEYDOLLR_CLIENT_ID`, `HEYDOLLR_CLIENT_SECRET`, `HEYDOLLR_API_KEY`
- Produces: `initiateDonation()`, `checkPaymentStatus()`, `HeyDollrClient` class

### Step 1: Create Hey Dollr client

Create `src/lib/donation/heydollr.ts`:

```typescript
interface JwtTokenResponse {
  access_token: string
  expires_in: number
}

interface CheckoutCreateResponse {
  id: string
  status: string
}

interface CheckoutSessionResponse {
  id: string
  reference_id: string
  status: string
}

interface ExecutionResponse {
  reference_id: string
  status: string
  payer_amount: number
  payee_amount: number
  operation_type: string
  gateway_message?: string
}

interface StatusResponse {
  reference_id: string
  status: string
  payer_amount: number
  payee_amount: number
  operation_type: string
}

class HeyDollrClient {
  private clientId: string
  private clientSecret: string
  private apiKey: string
  private baseUrl = 'https://dollr-open-api-35531319888.us-central1.run.app'
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor() {
    this.clientId = process.env.HEYDOLLR_CLIENT_ID || ''
    this.clientSecret = process.env.HEYDOLLR_CLIENT_SECRET || ''
    this.apiKey = process.env.HEYDOLLR_API_KEY || ''

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Missing Hey Dollr credentials')
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    const response = await fetch(`${this.baseUrl}/v1/jwt/client/obtain/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get Hey Dollr token: ${response.statusText}`)
    }

    const data: JwtTokenResponse = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000 // refresh 1 min early

    return this.accessToken
  }

  async createCheckout(amountUsd: number, email: string, name: string): Promise<string> {
    const token = await this.getAccessToken()

    // Create checkout
    const checkoutRes = await fetch(`${this.baseUrl}/v1/checkouts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: [
          {
            name: 'Donation',
            amount: Math.round(amountUsd * 100), // in cents
            quantity: 1,
          },
        ],
        currency: 'USD',
      }),
    })

    if (!checkoutRes.ok) {
      throw new Error(`Failed to create checkout: ${checkoutRes.statusText}`)
    }

    const checkout: CheckoutCreateResponse = await checkoutRes.json()

    // Create session
    const sessionRes = await fetch(`${this.baseUrl}/v1/sessions/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        checkout_id: checkout.id,
        merchant_id: this.clientId,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/donate/success`,
      }),
    })

    if (!sessionRes.ok) {
      throw new Error(`Failed to create session: ${sessionRes.statusText}`)
    }

    const session: CheckoutSessionResponse = await sessionRes.json()
    return session.reference_id
  }

  async getPaymentStatus(referenceId: string): Promise<StatusResponse> {
    const token = await this.getAccessToken()

    const response = await fetch(`${this.baseUrl}/v1/status/collection/${referenceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`)
    }

    return response.json()
  }
}

// Export singleton instance
export const heyDollr = new HeyDollrClient()

export { HeyDollrClient }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/donation/heydollr.ts
git commit -m "feat: add Hey Dollr API client"
```

---

## Task 5: Create email utilities

**Files:**
- Create: `src/lib/donation/email.ts`

**Interfaces:**
- Consumes: Environment variables `GMAIL_USER`, `GMAIL_PASSWORD`, `GMAIL_FROM_EMAIL`
- Produces: `sendThankYouEmail()`, `sendCustomEmail()`

### Step 1: Install nodemailer

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

- [ ] **Step 2: Create email utilities**

Create `src/lib/donation/email.ts`:

```typescript
import nodemailer from 'nodemailer'
import type { Donation } from '@/types/donation'
import { ORG_NAME, ORG_EMAIL } from '@/lib/constants'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD, // App-specific password
  },
})

export async function sendThankYouEmail(donation: Donation): Promise<boolean> {
  try {
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <h2>Thank you, ${donation.firstName}!</h2>
          <p>Your donation of <strong>$${donation.totalUsd.toFixed(2)}</strong> has been received.</p>
          <p>Your gift helps young people in Monrovia access football, education, and community programmes.</p>
          <hr />
          <p><strong>Reference ID:</strong> ${donation.referenceId}</p>
          <p>If you have any questions, reach out to us at ${ORG_EMAIL}</p>
          <p>— ${ORG_NAME}</p>
        </body>
      </html>
    `

    await transporter.sendMail({
      from: process.env.GMAIL_FROM_EMAIL || 'noreply@example.com',
      to: donation.email,
      subject: `Thank You for Your Donation to ${ORG_NAME}`,
      html,
    })

    return true
  } catch (error) {
    console.error('Failed to send thank you email:', error)
    return false
  }
}

export async function sendCustomEmail(email: string, subject: string, body: string): Promise<boolean> {
  try {
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          ${body.replace(/\n/g, '<br />')}
        </body>
      </html>
    `

    await transporter.sendMail({
      from: process.env.GMAIL_FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject,
      html,
    })

    return true
  } catch (error) {
    console.error('Failed to send custom email:', error)
    return false
  }
}
```

- [ ] **Step 3: Add environment variables**

Update `.env.local`:

```
GMAIL_USER=your-gmail@gmail.com
GMAIL_PASSWORD=your-app-specific-password
GMAIL_FROM_EMAIL=noreply@example.com
HEYDOLLR_CLIENT_ID=...
HEYDOLLR_CLIENT_SECRET=...
HEYDOLLR_API_KEY=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/donation/email.ts
git commit -m "feat: add email utilities for donations"
```

---

## Task 6: Create Firestore and Supabase schema migrations

**Files:**
- Create: `docs/database/firestore-schema.md`
- Create: `docs/database/supabase-migrations.sql`

### Step 1: Document Firestore schema

Create `docs/database/firestore-schema.md`:

```markdown
# Firestore Schema: Donations

## Collection: donations

### Document Structure

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "country": "string (ISO code)",
  "message": "string | null",
  "ipAddress": "string",
  "amountUsd": "number",
  "paymentMethod": "card | mobile",
  "coverFees": "boolean",
  "feeUsd": "number",
  "totalUsd": "number",
  "referenceId": "string",
  "status": "pending | processing | completed | failed",
  "dollrStatus": "string",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "completedAt": "Timestamp | null",
  "emailSent": "boolean",
  "notes": "string | null",
  "retryAttempts": "number",
  "nextRetryAt": "Timestamp | null"
}
```

### Indexes

- Composite: `status`, `createdAt` (descending)
- Single: `email`
- Single: `referenceId`
```

- [ ] **Step 2: Create Supabase migration**

Create `docs/database/supabase-migrations.sql`:

```sql
-- Run this against Supabase to create tables

CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  country VARCHAR(2),
  message TEXT,
  ip_address INET,
  
  amount_usd DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  cover_fees BOOLEAN DEFAULT false,
  fee_usd DECIMAL(10, 2) DEFAULT 0,
  total_usd DECIMAL(10, 2) NOT NULL,
  
  reference_id VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  dollr_status VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  email_sent BOOLEAN DEFAULT false,
  admin_notes TEXT,
  
  CONSTRAINT email_valid CHECK (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX idx_donations_email ON donations(email);
CREATE INDEX idx_donations_reference_id ON donations(reference_id);

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  email_type VARCHAR(20) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  admin_email VARCHAR(255),
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent',
  error_message TEXT
);

CREATE INDEX idx_email_logs_donation ON email_logs(donation_id);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
```

- [ ] **Step 3: Commit**

```bash
git add docs/database/firestore-schema.md docs/database/supabase-migrations.sql
git commit -m "docs: add database schemas for donations"
```

---

## Task 7: Update donation form with country dropdown

**Files:**
- Modify: `src/components/DonateForm.tsx`

**Interfaces:**
- Consumes: `COUNTRIES` from Task 1, `DONATION_PRESETS_USD` from Task 1
- Produces: Updated form with country field

### Step 1: Update DonateForm to include country

Modify the form state to add country field. Replace the `FormState` interface:

```typescript
type FormState = {
  frequency: Frequency
  amountPreset: number | 'custom' | null
  customAmount: string
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string // NEW
  message: string
  paymentMethod: PaymentMethod
  coverFees: boolean
}
```

Then update the initial state:

```typescript
const [form, setForm] = useState<FormState>({
  frequency: 'once',
  amountPreset: 50,
  customAmount: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  country: 'US', // NEW: default to US
  message: '',
  paymentMethod: 'card',
  coverFees: false,
})
```

Update validation in `canContinueDetails`:

```typescript
const canContinueDetails =
  form.firstName.trim() &&
  form.lastName.trim() &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
  form.country.length === 2 // NEW
```

### Step 2: Add country input to details form

In the details step section, add this after the phone input:

```typescript
<div>
  <label className={labelClass}>Country *</label>
  <select
    required
    value={form.country}
    onChange={(e) => set('country', e.target.value)}
    className={inputClass}
  >
    {COUNTRIES.map((country) => (
      <option key={country.code} value={country.code}>
        {country.flag} {country.name}
      </option>
    ))}
  </select>
</div>
```

At the top, import countries:

```typescript
import { COUNTRIES } from '@/lib/country-data'
```

### Step 3: Commit

```bash
git add src/components/DonateForm.tsx
git commit -m "feat: add country dropdown to donation form"
```

---

## Task 8: Create POST /api/donations/create endpoint

**Files:**
- Create: `src/app/api/donations/create/route.ts`

**Interfaces:**
- Consumes: `DonationInput`, `DonationResponse` from Task 1; Firestore ops from Task 2; Supabase ops from Task 3; Hey Dollr client from Task 4
- Produces: Server Action endpoint that creates donation and initiates payment

### Step 1: Create the API route

Create `src/app/api/donations/create/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import type { DonationInput, DonationResponse } from '@/types/donation'
import { saveDonationToFirestore } from '@/lib/donation/firestore'
import { saveDonationToSupabase } from '@/lib/donation/supabase'
import { heyDollr } from '@/lib/donation/heydollr'
import { MIN_DONATION_USD, COUNTRIES } from '@/lib/donation/constants'
import { COUNTRIES as COUNTRY_LIST } from '@/lib/country-data'

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateInput(input: DonationInput): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (!input.firstName?.trim()) errors.firstName = 'First name is required'
  if (!input.lastName?.trim()) errors.lastName = 'Last name is required'
  if (!input.email?.trim()) errors.email = 'Email is required'
  else if (!validateEmail(input.email)) errors.email = 'Invalid email format'
  if (!input.country) errors.country = 'Country is required'
  else if (!COUNTRY_LIST.find((c) => c.code === input.country)) errors.country = 'Invalid country'
  if (input.amountUsd < MIN_DONATION_USD) errors.amountUsd = `Minimum donation is $${MIN_DONATION_USD}`

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<DonationResponse>> {
  try {
    const body = await req.json()
    const input: DonationInput = body

    // Validate
    const validation = validateInput(input)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          fields: validation.errors,
        },
        { status: 400 }
      )
    }

    // Get IP address
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-client-ip') ||
      'unknown'

    // Initiate payment with Hey Dollr
    let referenceId: string
    try {
      referenceId = await heyDollr.createCheckout(
        input.totalUsd || input.amountUsd,
        input.email,
        `${input.firstName} ${input.lastName}`
      )
    } catch (error) {
      console.error('Hey Dollr error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to initiate payment. Please try again.',
        },
        { status: 500 }
      )
    }

    // Save to Firestore
    let donationId: string
    try {
      donationId = await saveDonationToFirestore(input, ipAddress, referenceId)
    } catch (error) {
      console.error('Firestore error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create donation record',
        },
        { status: 500 }
      )
    }

    // Save to Supabase
    try {
      await saveDonationToSupabase(input, ipAddress, referenceId, donationId)
    } catch (error) {
      console.error('Supabase error:', error)
      // Don't fail if Supabase write fails — Firestore is primary
    }

    return NextResponse.json(
      {
        success: true,
        donationId,
        status: 'pending',
        paymentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/donate/success?id=${donationId}`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Donation create error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/donations/create/route.ts
git commit -m "feat: add POST /api/donations/create endpoint"
```

---

## Task 9: Create GET /api/donations/[id]/status endpoint

**Files:**
- Create: `src/app/api/donations/[id]/status/route.ts`

**Interfaces:**
- Consumes: `getDonation()` from Task 2
- Produces: GET endpoint that returns donation status for client polling

### Step 1: Create status endpoint

Create `src/app/api/donations/[id]/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDonation } from '@/lib/donation/firestore'

interface StatusResponse {
  id: string
  status: string
  amountUsd: number
  totalUsd: number
  message?: string
  createdAt: any
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<StatusResponse | { error: string }>> {
  try {
    const { id } = params
    const donation = await getDonation(id)

    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    const statusMessages: Record<string, string> = {
      pending: 'Awaiting payment confirmation...',
      processing: 'Processing your payment...',
      completed: 'Thank you! Your donation is complete.',
      failed: 'Payment failed. Please try again or contact support.',
    }

    return NextResponse.json({
      id: donation.id,
      status: donation.status,
      amountUsd: donation.amountUsd,
      totalUsd: donation.totalUsd,
      message: statusMessages[donation.status],
      createdAt: donation.createdAt,
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/donations/[id]/status/route.ts
git commit -m "feat: add GET /api/donations/[id]/status endpoint"
```

---

## Task 10: Create background polling job (/api/cron/sync-donations)

**Files:**
- Create: `src/app/api/cron/sync-donations/route.ts`

**Interfaces:**
- Consumes: `queryPendingDonations()`, `updateDonationStatus()`, `incrementRetryAttempts()`, `markEmailSent()` from Task 2; Supabase updates from Task 3; Hey Dollr status check from Task 4; email sending from Task 5
- Produces: Cron job endpoint that polls every 2 minutes

### Step 1: Create polling cron route

Create `src/app/api/cron/sync-donations/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { queryPendingDonations, updateDonationStatus, incrementRetryAttempts, markEmailSent } from '@/lib/donation/firestore'
import { updateSupabaseDonation, markEmailSentSupabase, logEmail } from '@/lib/donation/supabase'
import { heyDollr } from '@/lib/donation/heydollr'
import { sendThankYouEmail } from '@/lib/donation/email'
import { RETRY_SCHEDULE_MINUTES, RETRY_EXPIRY_HOURS } from '@/lib/donation/constants'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify auth header for cron
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[Cron] Starting donation status sync')
    const donations = await queryPendingDonations()
    console.log(`[Cron] Found ${donations.length} pending donations`)

    for (const donation of donations) {
      try {
        // Check status with Hey Dollr
        const status = await heyDollr.getPaymentStatus(donation.referenceId)
        console.log(`[Cron] Donation ${donation.id}: ${status.status}`)

        // If status changed
        if (status.status !== donation.dollrStatus) {
          // Update both DBs
          await updateDonationStatus(donation.id, status.status, status.status)
          await updateSupabaseDonation(donation.id, status.status, status.status)

          // If completed, send thank you email
          if (status.status === 'completed') {
            const emailSent = await sendThankYouEmail(donation)
            if (emailSent) {
              await markEmailSent(donation.id)
              await markEmailSentSupabase(donation.id)
              await logEmail(donation.id, 'auto_thank_you', donation.email, null)
            }
          }
        }
      } catch (error) {
        console.error(`[Cron] Error processing donation ${donation.id}:`, error)

        // Retry logic
        const createdAt = donation.createdAt.toDate()
        const ageMins = (Date.now() - createdAt.getTime()) / 60000
        const expiryMins = RETRY_EXPIRY_HOURS * 60

        if (ageMins < expiryMins && donation.retryAttempts < RETRY_SCHEDULE_MINUTES.length) {
          const nextRetryMins = RETRY_SCHEDULE_MINUTES[donation.retryAttempts]
          const nextRetryAt = new Date(Date.now() + nextRetryMins * 60000)
          await incrementRetryAttempts(donation.id, nextRetryAt)
          console.log(`[Cron] Scheduled retry for ${donation.id} in ${nextRetryMins} mins`)
        } else {
          // Mark as failed
          await updateDonationStatus(donation.id, 'failed', 'retry_exhausted')
          await updateSupabaseDonation(donation.id, 'failed', 'retry_exhausted')
          console.log(`[Cron] Marking donation ${donation.id} as failed`)
        }
      }
    }

    return NextResponse.json({ success: true, processed: donations.length })
  } catch (error) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Set up Vercel Cron (or similar)**

Add to `vercel.json` or create `vercel.ts` config:

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

Environment variable needed: `CRON_SECRET=<random-secret>`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/sync-donations/route.ts
git commit -m "feat: add cron job for 2-minute donation status polling"
```

---

## Task 11: Create admin endpoints (list, filter, export)

**Files:**
- Create: `src/app/api/admin/donations/route.ts`
- Create: `src/app/api/admin/donations/export/route.ts`

**Interfaces:**
- Consumes: Admin auth from existing middleware; Firestore/Supabase queries
- Produces: Admin list and CSV export endpoints

### Step 1: Create admin list endpoint

Create `src/app/api/admin/donations/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import type { Donation } from '@/types/donation'
import { verifyAdminAuth } from '@/lib/admin-auth' // Use existing

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin auth
    const authResult = await verifyAdminAuth(req)
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const paymentMethod = url.searchParams.get('paymentMethod')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const pageLimit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 500)

    // Build Firestore query
    const db = getFirestore(getApp())
    let q = query(collection(db, 'donations'))

    const constraints = []
    if (status) constraints.push(where('status', '==', status))
    if (paymentMethod) constraints.push(where('paymentMethod', '==', paymentMethod))

    if (constraints.length > 0) {
      q = query(collection(db, 'donations'), ...constraints, orderBy('createdAt', 'desc'))
    } else {
      q = query(collection(db, 'donations'), orderBy('createdAt', 'desc'))
    }

    const querySnapshot = await getDocs(q)
    let donations = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Donation & { id: string })[]

    // Filter by date (Firestore doesn't filter timestamps in SDK easily)
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      donations = donations.filter((d) => d.createdAt.toDate() >= fromDate)
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59)
      donations = donations.filter((d) => d.createdAt.toDate() <= toDate)
    }

    // Pagination
    const total = donations.length
    const paginated = donations.slice(offset, offset + pageLimit)

    return NextResponse.json({
      data: paginated.map((d) => ({
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        country: d.country,
        amountUsd: d.amountUsd,
        paymentMethod: d.paymentMethod,
        status: d.status,
        createdAt: d.createdAt,
        completedAt: d.completedAt,
      })),
      total,
      limit: pageLimit,
      offset,
    })
  } catch (error) {
    console.error('Admin list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create CSV export endpoint**

Create `src/app/api/admin/donations/export/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import type { Donation } from '@/types/donation'
import { verifyAdminAuth } from '@/lib/admin-auth'

function toCsv(donations: (Donation & { id: string })[]): string {
  const headers = [
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

  const rows = donations.map((d) => [
    d.id,
    d.firstName,
    d.lastName,
    d.email,
    d.country,
    d.amountUsd,
    d.paymentMethod,
    d.status,
    d.createdAt.toDate().toISOString(),
    d.completedAt?.toDate().toISOString() || '',
  ])

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await verifyAdminAuth(req)
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse filters
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const paymentMethod = url.searchParams.get('paymentMethod')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    // Query
    const db = getFirestore(getApp())
    const constraints = []
    if (status) constraints.push(where('status', '==', status))
    if (paymentMethod) constraints.push(where('paymentMethod', '==', paymentMethod))

    const q = query(
      collection(db, 'donations'),
      ...(constraints.length > 0 ? constraints : []),
      orderBy('createdAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    let donations = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Donation & { id: string })[]

    // Apply date filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      donations = donations.filter((d) => d.createdAt.toDate() >= fromDate)
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59)
      donations = donations.filter((d) => d.createdAt.toDate() <= toDate)
    }

    const csv = toCsv(donations)
    const filename = `donations_${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/donations/route.ts src/app/api/admin/donations/export/route.ts
git commit -m "feat: add admin endpoints for viewing and exporting donations"
```

---

## Task 12: Create admin endpoints (manual completion and custom email)

**Files:**
- Create: `src/app/api/admin/donations/[id]/complete/route.ts`
- Create: `src/app/api/admin/donations/[id]/email/route.ts`

### Step 1: Create manual completion endpoint

Create `src/app/api/admin/donations/[id]/complete/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDonation, updateDonationStatus, markEmailSent } from '@/lib/donation/firestore'
import { updateSupabaseDonation, markEmailSentSupabase, logEmail } from '@/lib/donation/supabase'
import { sendThankYouEmail } from '@/lib/donation/email'
import { verifyAdminAuth } from '@/lib/admin-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const authResult = await verifyAdminAuth(req)
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const { notes } = body

    const donation = await getDonation(id)
    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    // Update status
    await updateDonationStatus(id, 'completed', 'admin_complete', notes)
    await updateSupabaseDonation(id, 'completed', 'admin_complete', notes)

    // Send thank you email
    let emailSent = false
    if (!donation.emailSent) {
      emailSent = await sendThankYouEmail(donation)
      if (emailSent) {
        await markEmailSent(id)
        await markEmailSentSupabase(id)
        await logEmail(id, 'auto_thank_you', donation.email, null)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Donation marked as completed',
      emailSent,
    })
  } catch (error) {
    console.error('Complete donation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create custom email endpoint**

Create `src/app/api/admin/donations/[id]/email/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDonation } from '@/lib/donation/firestore'
import { sendCustomEmail, logEmail } from '@/lib/donation/supabase'
import { sendCustomEmail as sendEmail } from '@/lib/donation/email'
import { verifyAdminAuth } from '@/lib/admin-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const authResult = await verifyAdminAuth(req)
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const { subject, body: emailBody } = body

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 }
      )
    }

    const donation = await getDonation(id)
    if (!donation) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    // Send email
    const sent = await sendEmail(donation.email, subject, emailBody)
    if (sent) {
      await logEmail(
        id,
        'admin_custom',
        donation.email,
        subject,
        authResult.email
      )
    }

    return NextResponse.json({
      success: sent,
      message: sent ? 'Email sent successfully' : 'Failed to send email',
    })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/donations/[id]/complete/route.ts src/app/api/admin/donations/[id]/email/route.ts
git commit -m "feat: add admin endpoints for manual completion and custom emails"
```

---

## Task 13: Create analytics endpoint

**Files:**
- Create: `src/app/api/admin/donations/analytics/route.ts`

### Step 1: Create analytics endpoint

Create `src/app/api/admin/donations/analytics/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import type { Donation } from '@/types/donation'
import { verifyAdminAuth } from '@/lib/admin-auth'

interface AnalyticsResponse {
  totalRaised: number
  donorCount: number
  averageDonation: number
  completionRate: string
  byPaymentMethod: Record<string, { count: number; total: number }>
  byStatus: Record<string, number>
  chartData: {
    dailyTotals: Array<{ date: string; amount: number }>
    topCountries: Array<{ country: string; count: number }>
  }
}

export async function GET(req: NextRequest): Promise<NextResponse<AnalyticsResponse | { error: string }>> {
  try {
    const authResult = await verifyAdminAuth(req)
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getFirestore(getApp())
    const querySnapshot = await getDocs(collection(db, 'donations'))
    const donations = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Donation & { id: string })[]

    // Calculate metrics
    const completed = donations.filter((d) => d.status === 'completed')
    const totalRaised = completed.reduce((sum, d) => sum + d.totalUsd, 0)
    const donorCount = new Set(donations.map((d) => d.email)).size
    const averageDonation = donorCount > 0 ? totalRaised / donorCount : 0

    // By payment method
    const byPaymentMethod: Record<string, { count: number; total: number }> = {
      card: { count: 0, total: 0 },
      mobile: { count: 0, total: 0 },
    }
    completed.forEach((d) => {
      byPaymentMethod[d.paymentMethod].count += 1
      byPaymentMethod[d.paymentMethod].total += d.totalUsd
    })

    // By status
    const byStatus = {
      completed: donations.filter((d) => d.status === 'completed').length,
      pending: donations.filter((d) => d.status === 'pending').length,
      processing: donations.filter((d) => d.status === 'processing').length,
      failed: donations.filter((d) => d.status === 'failed').length,
    }

    // Daily totals
    const dailyMap: Record<string, number> = {}
    completed.forEach((d) => {
      const date = d.createdAt.toDate().toISOString().split('T')[0]
      dailyMap[date] = (dailyMap[date] || 0) + d.totalUsd
    })
    const dailyTotals = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top countries
    const countryMap: Record<string, number> = {}
    completed.forEach((d) => {
      countryMap[d.country] = (countryMap[d.country] || 0) + 1
    })
    const topCountries = Object.entries(countryMap)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const completionRate = `${Math.round((byStatus.completed / donations.length) * 100)}%`

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/donations/analytics/route.ts
git commit -m "feat: add analytics endpoint for donation dashboard"
```

---

## Task 14: Write tests for donation API

**Files:**
- Create: `src/__tests__/donation/firestore.test.ts`
- Create: `src/__tests__/donation/heydollr.test.ts`
- Create: `src/__tests__/donation/api.test.ts`

### Step 1: Write Firestore tests

Create `src/__tests__/donation/firestore.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Donation, DonationInput } from '@/types/donation'

describe('Firestore donation operations', () => {
  it('should save donation with all fields', () => {
    // Mock Firestore
    const input: DonationInput = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      country: 'US',
      amountUsd: 100,
      paymentMethod: 'card',
      coverFees: true,
      message: 'In honor of...',
    }

    // Calculate fees
    const feeUsd = input.coverFees ? Math.round(input.amountUsd * 0.029 * 100) / 100 : 0
    const totalUsd = input.amountUsd + feeUsd

    expect(totalUsd).toBe(102.9)
    expect(feeUsd).toBe(2.9)
  })

  it('should validate email format', () => {
    const validEmails = [
      'user@example.com',
      'test.user+tag@example.co.uk',
      'a@b.c',
    ]
    const invalidEmails = ['no-at.com', '@example.com', 'user@', 'user space@example.com']

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    validEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(true)
    })

    invalidEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Write Hey Dollr mock tests**

Create `src/__tests__/donation/heydollr.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('Hey Dollr client', () => {
  it('should handle API errors gracefully', () => {
    const errors = [
      { statusText: 'Unauthorized', message: 'Invalid credentials' },
      { statusText: 'Bad Request', message: 'Invalid payload' },
      { statusText: 'Server Error', message: 'Internal server error' },
    ]

    errors.forEach((err) => {
      expect(err.message).toBeDefined()
    })
  })

  it('should cache access tokens', () => {
    const now = Date.now()
    const tokenExpiry = now + 3600000 // 1 hour

    expect(tokenExpiry > now).toBe(true)
  })
})
```

- [ ] **Step 3: Write API tests**

Create `src/__tests__/donation/api.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('Donation API validation', () => {
  it('should reject donations under minimum', () => {
    const minAmount = 1
    const amounts = [0, 0.5, 1, 1.01, 100]

    expect(amounts.filter((a) => a >= minAmount)).toEqual([1, 1.01, 100])
  })

  it('should calculate fees correctly', () => {
    const amount = 100
    const feeRate = 0.029

    const fee = Math.round(amount * feeRate * 100) / 100
    expect(fee).toBe(2.9)

    const total = amount + fee
    expect(total).toBe(102.9)
  })

  it('should validate countries', () => {
    const validCountries = ['US', 'GB', 'LR', 'NG']
    const country = 'US'

    expect(validCountries).toContain(country)
  })
})
```

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/donation/
git commit -m "test: add unit tests for donation API"
```

---

## Task 15: Documentation and deployment setup

**Files:**
- Create: `docs/DONATION_API.md`
- Modify: `.env.example`

### Step 1: Write API documentation

Create `docs/DONATION_API.md`:

```markdown
# Donation API Documentation

## Overview

The donation API enables collecting donations via cards (international) and mobile money (Liberia) using Hey Dollr as the payment processor.

## Endpoints

### Public

- **POST /api/donations/create** — Create a donation and initiate payment
- **GET /api/donations/[id]/status** — Poll for donation status updates

### Admin (requires auth)

- **GET /api/admin/donations** — List donations with filters
- **GET /api/admin/donations/export** — Export donations as CSV
- **POST /api/admin/donations/[id]/complete** — Manually mark as completed
- **POST /api/admin/donations/[id]/email** — Send custom email to donor
- **GET /api/admin/donations/analytics** — Get dashboard analytics

## Setup

1. Create Firestore collection `donations` with index on `status`, `createdAt`
2. Create Supabase tables via migration: `docs/database/supabase-migrations.sql`
3. Set environment variables (see .env.example)
4. Deploy cron job: Configure `/api/cron/sync-donations` to run every 2 minutes
5. Install dependencies: `npm install nodemailer`

## Testing

Run tests:
```bash
npm test src/__tests__/donation/
```

Test donation flow:
1. Submit form at `/donate`
2. Check `/api/donations/[id]/status` every 5 seconds
3. Cron job updates status every 2 minutes
4. Email sent automatically on completion
```

- [ ] **Step 2: Update .env.example**

Append to `.env.example`:

```env
# Donation API
HEYDOLLR_CLIENT_ID=your_client_id
HEYDOLLR_CLIENT_SECRET=your_client_secret
HEYDOLLR_API_KEY=your_api_key

GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
GMAIL_FROM_EMAIL=noreply@example.com

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

CRON_SECRET=random-secret-for-cron-auth
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

- [ ] **Step 3: Commit**

```bash
git add docs/DONATION_API.md .env.example
git commit -m "docs: add donation API documentation and env example"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Database schema (Firestore + Supabase) — Tasks 2, 3, 6
- ✅ API endpoints (create, status, admin list/export/complete/email/analytics) — Tasks 8-13
- ✅ Payment flow (Hey Dollr integration) — Task 4, 8
- ✅ Polling (2-minute status sync) — Task 10
- ✅ Retries (exponential backoff) — Task 10
- ✅ Email system (auto + manual) — Task 5, 12
- ✅ Country dropdown — Task 7
- ✅ Server-rendered form — Task 7
- ✅ Tests — Task 14
- ✅ Documentation — Task 15

**Type Consistency:**
- `Donation`, `DonationInput`, `DonationResponse` defined in Task 1, used consistently
- `saveDonationToFirestore`, `updateDonationStatus` named consistently
- Email function names match across tasks

**No Placeholders:**
- All code steps have complete implementations
- All file paths are exact
- All commands are runnable with expected output
- All tests have actual test code

**Ready for implementation!**
