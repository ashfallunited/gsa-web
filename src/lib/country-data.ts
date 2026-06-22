export interface Country {
  code: string // ISO 3166-1 alpha-2
  name: string
  flag: string // Unicode flag emoji
}

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  // Add more as needed
].sort((a, b) => a.name.localeCompare(b.name))

export function getCountryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name || code
}

export function getCountryFlag(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.flag || ''
}
