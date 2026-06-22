import {
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
} from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'
import type { Donation, DonationInput, DonationStatus } from '@/types/donation'
import { DONATION_STATUS, PROCESSING_FEE_RATE, RETRY_EXPIRY_HOURS } from './constants'

const DONATIONS_COLLECTION = 'donations'

/**
 * Saves a new donation record to Firestore
 * @param input - DonationInput with donor and donation details
 * @param ipAddress - IP address of the donor
 * @param referenceId - Hey Dollr reference ID
 * @returns The document ID of the saved donation
 */
export async function saveDonationToFirestore(
  input: DonationInput,
  ipAddress: string,
  referenceId: string
): Promise<string> {
  try {
    // Calculate fees
    const feeUsd = input.coverFees
      ? Math.round(input.amountUsd * PROCESSING_FEE_RATE * 100) / 100
      : 0
    const totalUsd = input.amountUsd + feeUsd

    const db = getAdminDb()
    const now = Timestamp.now()

    const donationData = {
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
      feeUsd,
      totalUsd,

      referenceId,
      status: DONATION_STATUS.PENDING,
      dollrStatus: '',

      createdAt: now,
      updatedAt: now,
      completedAt: null,

      emailSent: false,
      notes: null,
      retryAttempts: 0,
      nextRetryAt: null,
    }

    const docRef = await addDoc(collection(db, DONATIONS_COLLECTION), donationData)
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
    const docRef = doc(db, DONATIONS_COLLECTION, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
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
 * Updates the status of a donation
 * @param id - The document ID of the donation
 * @param status - The new DonationStatus
 * @param dollrStatus - The status from Hey Dollr API
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
    const docRef = doc(db, DONATIONS_COLLECTION, id)
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

    await updateDoc(docRef, updateData)
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

    const q = query(
      collection(db, DONATIONS_COLLECTION),
      where('status', 'in', [DONATION_STATUS.PENDING, DONATION_STATUS.PROCESSING])
    )

    const querySnapshot = await getDocs(q)
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
    const docRef = doc(db, DONATIONS_COLLECTION, id)
    const now = Timestamp.now()

    await updateDoc(docRef, {
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
    const docRef = doc(db, DONATIONS_COLLECTION, id)
    const now = Timestamp.now()

    // Get current retry attempts
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      throw new Error(`Donation with id ${id} not found`)
    }

    const currentRetryAttempts = docSnap.data().retryAttempts || 0
    const nextRetryTimestamp = Timestamp.fromDate(nextRetryAt)

    await updateDoc(docRef, {
      retryAttempts: currentRetryAttempts + 1,
      nextRetryAt: nextRetryTimestamp,
      updatedAt: now,
    })
  } catch (error) {
    console.error('Error incrementing retry attempts in Firestore:', error)
    throw error
  }
}
