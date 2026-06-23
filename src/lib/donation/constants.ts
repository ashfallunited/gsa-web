export const DONATION_PRESETS_USD = [25, 50, 100, 250, 500] as const
export const MIN_DONATION_USD = 1
export const PROCESSING_FEE_RATE = 0.029 // 2.9%

export const DONATION_STATUS = {
  AWAITING_PAYMENT: 'awaiting_payment',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export const PAYMENT_METHODS = {
  CARD: 'card',
  MOBILE: 'mobile',
} as const

export const RETRY_SCHEDULE_MINUTES = [5, 15, 45, 120, 360] // exponential backoff
export const RETRY_EXPIRY_HOURS = 72
export const POLLING_INTERVAL_MINUTES = 2

export const IMPACT_TIERS = [
  { amount: '$25', label: 'Training kit for one youth player' },
  { amount: '$50', label: 'A week of meals for programme participants' },
  { amount: '$100', label: 'Educational materials for an entire cohort' },
  { amount: '$250+', label: 'Supports volunteers and community sessions' },
] as const
