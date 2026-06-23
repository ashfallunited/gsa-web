/**
 * Maps Dollr provider codes to user-friendly names and logos
 */

export interface ProviderInfo {
  code: string
  name: string
  logo: string
}

const PROVIDER_MAP: Record<string, ProviderInfo> = {
  MTN_MOMO_LBR: {
    code: 'MTN_MOMO_LBR',
    name: 'MTN MoMo',
    logo: '/momo.png',
  },
  ORANGE_MONEY_LBR: {
    code: 'ORANGE_MONEY_LBR',
    name: 'Orange Money',
    logo: '/orangemoney.png',
  },
}

/**
 * Get user-friendly provider info from provider code
 */
export function getProviderInfo(providerCode: string | undefined): ProviderInfo | null {
  if (!providerCode) return null
  return PROVIDER_MAP[providerCode] || null
}

/**
 * Get display name for provider code
 */
export function getProviderDisplayName(providerCode: string | undefined): string {
  const info = getProviderInfo(providerCode)
  return info?.name || providerCode || 'Unknown Provider'
}

/**
 * Get logo path for provider code
 */
export function getProviderLogo(providerCode: string | undefined): string | null {
  const info = getProviderInfo(providerCode)
  return info?.logo || null
}
