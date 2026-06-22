# Firestore Schema: Donations

## Collection: donations

### Document Structure

Document fields:
- firstName: string
- lastName: string
- email: string
- phone: string
- country: string (ISO code)
- message: string | null
- ipAddress: string
- amountUsd: number
- paymentMethod: 'card' | 'mobile'
- coverFees: boolean
- feeUsd: number
- totalUsd: number
- referenceId: string
- status: 'pending' | 'processing' | 'completed' | 'failed'
- dollrStatus: string
- createdAt: Timestamp
- updatedAt: Timestamp
- completedAt: Timestamp | null
- emailSent: boolean
- notes: string | null
- retryAttempts: number
- nextRetryAt: Timestamp | null

### Indexes

Composite index needed:
- Fields: status (Ascending), createdAt (Descending)
- Collection: donations

Single-field indexes:
- email
- referenceId
