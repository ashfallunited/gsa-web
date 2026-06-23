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
 * @param donationId - Firebase donation ID for consistency
 * @param donorId - The ID of the donor
 * @param amountUsd - Donation amount in USD
 * @param paymentMethod - Payment method (card or mobile)
 * @param coverFees - Whether the donor is covering fees
 * @param ipAddress - IP address of the donor
 * @param referenceId - Dollr order/reference ID
 * @param message - Optional donation message
 * @param currency - Currency chosen by donor (USD or LRD)
 * @param amountPaid - Actual amount paid in chosen currency
 * @param currencyPaid - Currency they actually paid in
 * @throws Error if insert fails
 */
export async function saveDonationToSupabase(
  donationId: string,
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
): Promise<void> {
  try {
    // Calculate fees using same logic as Firestore
    const feeUsd = coverFees
      ? Math.round(amountUsd * PROCESSING_FEE_RATE * 100) / 100
      : 0
    const totalUsd = amountUsd + feeUsd

    const supabase = getSupabaseAdminClient()
    const now = new Date().toISOString()

    const donationData = {
      id: donationId,
      donor_id: donorId,
      amount_usd: amountUsd,
      currency,
      amount_paid: amountPaid || amountUsd,
      currency_paid: currencyPaid || currency,
      payment_method: paymentMethod,
      cover_fees: coverFees,
      fee_usd: feeUsd,
      total_usd: totalUsd,
      message: message || null,

      reference_id: referenceId,
      status: DONATION_STATUS.AWAITING_PAYMENT,
      dollr_status: '',

      ip_address: ipAddress,
      transaction_date: null,
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
