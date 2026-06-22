import { createClient } from '@supabase/supabase-js'
import type { DonationInput, DonationStatus } from '@/types/donation'
import { PROCESSING_FEE_RATE, DONATION_STATUS } from './constants'

/**
 * Initialize Supabase admin client for database operations
 * Uses service role key for full database access
 */
function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase configuration missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required'
    )
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Saves a donation record to Supabase
 * @param input - DonationInput with donor and donation details
 * @param ipAddress - IP address of the donor
 * @param referenceId - Dollr reference ID
 * @param firebaseId - Firebase document ID (used as Supabase ID for dual-write consistency)
 * @throws Error if insert fails
 */
export async function saveDonationToSupabase(
  input: DonationInput,
  ipAddress: string,
  referenceId: string,
  firebaseId: string
): Promise<void> {
  try {
    // Calculate fees using same logic as Firestore
    const feeUsd = input.coverFees
      ? Math.round(input.amountUsd * PROCESSING_FEE_RATE * 100) / 100
      : 0
    const totalUsd = input.amountUsd + feeUsd

    const supabase = getSupabaseAdminClient()
    const now = new Date().toISOString()

    const donationData = {
      id: firebaseId, // Use Firebase ID for consistency across databases
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
      status: DONATION_STATUS.PENDING,
      dollr_status: '',

      created_at: now,
      updated_at: now,
      completed_at: null,

      email_sent: false,
      admin_notes: null,
      retry_attempts: 0,
      next_retry_at: null,
    }

    const { error } = await supabase.from('donations').insert([donationData])

    if (error) {
      console.error('Error saving donation to Supabase:', error)
      throw error
    }
  } catch (error) {
    console.error('Error saving donation to Supabase:', error)
    throw error
  }
}

/**
 * Updates the status of a donation in Supabase
 * @param id - The UUID of the donation
 * @param status - The new DonationStatus
 * @param dollrStatus - The status from Dollr API
 * @param notes - Optional admin notes about the status update
 * @throws Error if update fails
 */
export async function updateSupabaseDonation(
  id: string,
  status: DonationStatus,
  dollrStatus: string,
  notes?: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    const now = new Date().toISOString()

    const updateData: Record<string, unknown> = {
      status,
      dollr_status: dollrStatus,
      updated_at: now,
    }

    // Set completedAt timestamp if status is completed
    if (status === DONATION_STATUS.COMPLETED) {
      updateData.completed_at = now
    }

    // Update admin notes if provided
    if (notes) {
      updateData.admin_notes = notes
    }

    const { error } = await supabase.from('donations').update(updateData).eq('id', id)

    if (error) {
      console.error('Error updating donation in Supabase:', error)
      throw error
    }
  } catch (error) {
    console.error('Error updating donation in Supabase:', error)
    throw error
  }
}

/**
 * Marks an email as sent for a donation in Supabase
 * @param donationId - The UUID of the donation
 * @throws Error if update fails
 */
export async function markEmailSentSupabase(donationId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('donations')
      .update({
        email_sent: true,
        updated_at: now,
      })
      .eq('id', donationId)

    if (error) {
      console.error('Error marking email as sent in Supabase:', error)
      throw error
    }
  } catch (error) {
    console.error('Error marking email as sent in Supabase:', error)
    throw error
  }
}

/**
 * Logs an email to the audit trail in Supabase
 * @param donationId - The UUID of the donation
 * @param emailType - Type of email sent ('auto_thank_you' | 'admin_custom')
 * @param recipientEmail - Email address of the recipient
 * @param subject - Subject line of the email
 * @param adminEmail - Optional email address of admin who sent it (for custom emails)
 * @throws Error if insert fails
 */
export async function logEmail(
  donationId: string,
  emailType: 'auto_thank_you' | 'admin_custom',
  recipientEmail: string,
  subject: string,
  adminEmail?: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient()
    const now = new Date().toISOString()

    const emailLogData = {
      donation_id: donationId,
      email_type: emailType,
      recipient_email: recipientEmail,
      subject,
      admin_email: adminEmail || null,
      sent_at: now,
      status: 'sent',
    }

    const { error } = await supabase.from('email_logs').insert([emailLogData])

    if (error) {
      console.error('Error logging email in Supabase:', error)
      throw error
    }
  } catch (error) {
    console.error('Error logging email in Supabase:', error)
    throw error
  }
}
