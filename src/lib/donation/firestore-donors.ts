import { Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'
import type { Donor } from '@/types/donation'

const DONORS_COLLECTION = 'donors'

/**
 * Saves or updates a donor record
 * Returns the donor ID (either new or existing)
 */
export async function saveDonorToFirestore(
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  country: string
): Promise<string> {
  try {
    const db = getAdminDb()
    const now = Timestamp.now()

    // Check if donor exists by email (emails are unique)
    const donorQuery = await db
      .collection(DONORS_COLLECTION)
      .where('email', '==', email)
      .limit(1)
      .get()

    if (!donorQuery.empty) {
      // Donor exists, update if needed
      const existingDonor = donorQuery.docs[0]
      await existingDonor.ref.update({
        firstName,
        lastName,
        phone,
        country,
        updatedAt: now,
      })
      return existingDonor.id
    }

    // New donor, create record
    const donorData = {
      firstName,
      lastName,
      email,
      phone,
      country,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await db.collection(DONORS_COLLECTION).add(donorData)
    return docRef.id
  } catch (error) {
    console.error('Error saving donor to Firestore:', error)
    throw error
  }
}

/**
 * Retrieves a single donor by ID
 */
export async function getDonorFromFirestore(id: string): Promise<Donor | null> {
  try {
    const db = getAdminDb()
    const docSnap = await db.collection(DONORS_COLLECTION).doc(id).get()

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
 * Retrieves a donor by email
 */
export async function getDonorByEmailFromFirestore(email: string): Promise<Donor | null> {
  try {
    const db = getAdminDb()
    const query = await db
      .collection(DONORS_COLLECTION)
      .where('email', '==', email)
      .limit(1)
      .get()

    if (query.empty) {
      return null
    }

    const doc = query.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
    } as Donor
  } catch (error) {
    console.error('Error getting donor by email from Firestore:', error)
    throw error
  }
}
