import { createClient } from '@supabase/supabase-js'
import type { Donor } from '@/types/donation'

const DONORS_TABLE = 'donors'

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
 * Saves or updates a donor record in Supabase
 * Returns the donor ID (either new or existing)
 */
export async function saveDonorToSupabase(
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  country: string
): Promise<string> {
  try {
    const supabase = getSupabaseAdminClient()

    // Check if donor exists by email
    const { data: existingDonor, error: queryError } = await supabase
      .from(DONORS_TABLE)
      .select('id')
      .eq('email', email)
      .single()

    if (!queryError && existingDonor) {
      // Donor exists, update if needed
      const { error: updateError } = await supabase
        .from(DONORS_TABLE)
        .update({
          firstName,
          lastName,
          phone,
          country,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDonor.id)

      if (updateError) throw updateError
      return existingDonor.id
    }

    // New donor, create record
    const { data, error } = await supabase
      .from(DONORS_TABLE)
      .insert({
        firstName,
        lastName,
        email,
        phone,
        country,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  } catch (error) {
    console.error('Error saving donor to Supabase:', error)
    throw error
  }
}

/**
 * Retrieves a donor by ID
 */
export async function getDonorFromSupabase(id: string): Promise<Donor | null> {
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from(DONORS_TABLE)
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data as Donor
  } catch (error) {
    console.error('Error getting donor from Supabase:', error)
    throw error
  }
}

/**
 * Retrieves a donor by email
 */
export async function getDonorByEmailFromSupabase(email: string): Promise<Donor | null> {
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from(DONORS_TABLE)
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data as Donor
  } catch (error) {
    console.error('Error getting donor by email from Supabase:', error)
    throw error
  }
}
