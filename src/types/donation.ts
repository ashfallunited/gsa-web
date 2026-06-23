import type { Timestamp } from 'firebase-admin/firestore'

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

  referenceId: string // Dollr reference
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
  // Payment details
  cardNumber?: string
  cardExpiry?: string
  cardCVV?: string
  mobilePhone?: string
  detectedProvider?: string
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
