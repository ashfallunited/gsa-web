import { Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'
import type { Donation, DonationInput, DonationStatus, Donor } from '@/types/donation'
import { DONATION_STATUS, PROCESSING_FEE_RATE, RETRY_EXPIRY_HOURS } from './constants'

const DONATIONS_COLLECTION = 'donations'

/**
 * Saves a new donation record to Firestore
 * @param donorId - The ID of the donor in the donors collection
 * @param amountUsd - Donation amount in USD
 * @param paymentMethod - Payment method (card or mobile)
 * @param coverFees - Whether the donor is covering fees
 * @param ipAddress - IP address of the donor
 * @param referenceId - Dollr order/reference ID
 * @param message - Optional donation message
 * @param currency - Currency chosen by donor (USD or LRD)
 * @param amountPaid - Actual amount paid in chosen currency
 * @param currencyPaid - Currency they actually paid in
 * @returns The document ID of the saved donation
 */
export async function saveDonationToFirestore(
  donorId: string,
  amountUsd: number,
  paymentMethod: 'card' | 'mobile',
  coverFees: boolean,
  ipAddress: string,
  referenceId: string,
  message?: string,
  currency: 'USD' | 'LRD' = 'USD',
  amountPaid: number = 0,
  currencyPaid: 'USD' | 'LRD' = 'USD'
): Promise<string> {
  try {
    // Calculate fees
    const feeUsd = coverFees
      ? Math.round(amountUsd * PROCESSING_FEE_RATE * 100) / 100
      : 0
    const totalUsd = amountUsd + feeUsd

    const db = getAdminDb()
    const now = Timestamp.now()

    const donationData = {
      donorId,
      amountUsd,
      currency,
      amountPaid: amountPaid || amountUsd,
      currencyPaid: currencyPaid || currency,
      paymentMethod,
      coverFees,
      feeUsd,
      totalUsd,
      message: message || null,

      referenceId,
      status: DONATION_STATUS.AWAITING_PAYMENT,
      dollrStatus: '',

      ipAddress,
      transactionDate: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,

      emailSent: false,
      notes: null,
      retryAttempts: 0,
      nextRetryAt: null,
    }

    const docRef = await db.collection(DONATIONS_COLLECTION).add(donationData)
    return docRef.id
  } catch (error) {
    console.error('Error saving donation to Firestore:', error)
    throw error
  }
}

/**
 * Retrieves a single donation by ID
 * @param id - The document ID of the donation
 * @returns The Donation object or null if not found
 */
export async function getDonation(id: string): Promise<Donation | null> {
  try {
    const db = getAdminDb()
    const docSnap = await db.collection(DONATIONS_COLLECTION).doc(id).get()

    if (!docSnap.exists) {
      return null
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Donation
  } catch (error) {
    console.error('Error getting donation from Firestore:', error)
    throw error
  }
}

/**
 * Retrieves a single donor by ID
 * @param id - The document ID of the donor
 * @returns The Donor object or null if not found
 */
export async function getDonor(id: string): Promise<Donor | null> {
  try {
    const db = getAdminDb()
    const docSnap = await db.collection('donors').doc(id).get()

    if (!docSnap.exists) {
      return null
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Donor
  } catch (error) {
    console.error('Error getting donor from Firestore:', error)
    throw error
  }
}

/**
 * Updates the status of a donation
 * @param id - The document ID of the donation
 * @param status - The new DonationStatus
 * @param dollrStatus - The status from Dollr API
 * @param notes - Optional notes about the status update
 */
export async function updateDonationStatus(
  id: string,
  status: DonationStatus,
  dollrStatus: string,
  notes?: string
): Promise<void> {
  try {
    const db = getAdminDb()
    const now = Timestamp.now()

    const updateData: Record<string, unknown> = {
      status,
      dollrStatus,
      updatedAt: now,
    }

    if (notes) {
      updateData.notes = notes
    }

    // Set completedAt timestamp if status is completed
    if (status === DONATION_STATUS.COMPLETED) {
      updateData.completedAt = now
    }

    await db.collection(DONATIONS_COLLECTION).doc(id).update(updateData)
  } catch (error) {
    console.error('Error updating donation status in Firestore:', error)
    throw error
  }
}

/**
 * Queries all pending or processing donations
 * @returns Array of Donation objects with pending/processing status
 */
export async function queryPendingDonations(): Promise<Donation[]> {
  try {
    const db = getAdminDb()

    const querySnapshot = await db
      .collection(DONATIONS_COLLECTION)
      .where('status', 'in', [DONATION_STATUS.AWAITING_PAYMENT, DONATION_STATUS.PROCESSING])
      .get()

    const donations: Donation[] = []

    querySnapshot.forEach((docSnap) => {
      donations.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as Donation)
    })

    return donations
  } catch (error) {
    console.error('Error querying pending donations from Firestore:', error)
    throw error
  }
}

/**
 * Marks an email as sent for a donation
 * @param id - The document ID of the donation
 */
export async function markEmailSent(id: string): Promise<void> {
  try {
    const db = getAdminDb()
    const now = Timestamp.now()

    await db.collection(DONATIONS_COLLECTION).doc(id).update({
      emailSent: true,
      updatedAt: now,
    })
  } catch (error) {
    console.error('Error marking email as sent in Firestore:', error)
    throw error
  }
}

/**
 * Increments the retry attempts counter and sets the next retry time
 * @param id - The document ID of the donation
 * @param nextRetryAt - The timestamp for the next retry attempt
 */
export async function incrementRetryAttempts(
  id: string,
  nextRetryAt: Date
): Promise<void> {
  try {
    const db = getAdminDb()
    const now = Timestamp.now()

    // Get current retry attempts
    const docSnap = await db.collection(DONATIONS_COLLECTION).doc(id).get()
    if (!docSnap.exists) {
      throw new Error(`Donation with id ${id} not found`)
    }

    const currentRetryAttempts = docSnap.data()?.retryAttempts || 0
    const nextRetryTimestamp = Timestamp.fromDate(nextRetryAt)

    await db.collection(DONATIONS_COLLECTION).doc(id).update({
      retryAttempts: currentRetryAttempts + 1,
      nextRetryAt: nextRetryTimestamp,
      updatedAt: now,
    })
  } catch (error) {
    console.error('Error incrementing retry attempts in Firestore:', error)
    throw error
  }
}
