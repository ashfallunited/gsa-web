/**
 * Phone number formatting utilities for Liberia mobile money payments
 */

/**
 * Formats a Liberian phone number to E.164 format for Dollr API
 * Converts: 0775500512 → 231775500512
 *           0880884760 → 2318808884760
 *           +231775500512 → 231775500512
 */
export function formatPhoneForDollr(phone: string): string {
  if (!phone) return ''

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')

  // If starts with 231, already in correct format
  if (cleaned.startsWith('231')) {
    return cleaned
  }

  // If starts with 0, replace with 231
  if (cleaned.startsWith('0')) {
    return '231' + cleaned.slice(1)
  }

  // If just digits without 0 or 231, assume it needs 231 prefix
  if (cleaned.length >= 8) {
    return '231' + cleaned
  }

  return cleaned
}

/**
 * Formats phone number for display (human-readable)
 * Converts: 231775500512 → +231 77 550 0512
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return ''

  const cleaned = formatPhoneForDollr(phone)

  if (cleaned.length === 12 && cleaned.startsWith('231')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  }

  return phone
}

/**
 * Validates if a phone number is a valid Liberian mobile number
 */
export function isValidLiberianPhone(phone: string): boolean {
  const cleaned = formatPhoneForDollr(phone)
  // Must be 12 digits starting with 231
  return cleaned.length === 12 && cleaned.startsWith('231')
}

/**
 * Extracts the country code from a formatted phone number
 * e.g., 231775500512 → LR, 254700000000 → KE
 */
export function extractCountryCodeFromPhone(phone: string): string {
  if (!phone) return ''

  const cleaned = phone.replace(/\D/g, '')

  // Common country code mappings (country code prefix → ISO country code)
  const countryCodeMap: Record<string, string> = {
    '231': 'LR', // Liberia
    '254': 'KE', // Kenya
    '256': 'UG', // Uganda
    '255': 'TZ', // Tanzania
    '233': 'GH', // Ghana
    '234': 'NG', // Nigeria
    '212': 'MA', // Morocco
    '27': 'ZA', // South Africa
    '1': 'US', // USA
    '44': 'GB', // UK
    '91': 'IN', // India
    '86': 'CN', // China
  }

  // Check 3-digit codes first (most common in Africa)
  for (const [code, country] of Object.entries(countryCodeMap)) {
    if (code.length === 3 && cleaned.startsWith(code)) {
      return country
    }
  }

  // Check 2-digit codes
  for (const [code, country] of Object.entries(countryCodeMap)) {
    if (code.length === 2 && cleaned.startsWith(code)) {
      return country
    }
  }

  // Check 1-digit codes (like USA)
  for (const [code, country] of Object.entries(countryCodeMap)) {
    if (code.length === 1 && cleaned.startsWith(code)) {
      return country
    }
  }

  return ''
}
