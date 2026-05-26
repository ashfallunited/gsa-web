export const VOLUNTEER_AVAILABILITY_OPTIONS = [
  'Weekday mornings',
  'Weekday afternoons',
  'Weekday evenings',
  'Weekends',
  'School holidays only',
  '1–2 hours per week',
  '3–5 hours per week',
  '6+ hours per week',
  'Flexible — as needed',
] as const

export const VOLUNTEER_SKILLS_OPTIONS = [
  'Football coaching',
  'Youth mentoring',
  'Tutoring / education',
  'Media & communications',
  'Photography / video',
  'Event support',
  'Fundraising',
  'Admin & operations',
  'Healthcare / first aid',
  'Translation / interpretation',
  'Other',
] as const

export const SELECT_ALL_HINT = 'Select all that apply.'

export function formatInquiryMultiValue(value: string | string[] | undefined): string | null {
  if (!value) return null
  if (Array.isArray(value)) {
    const items = value.filter((item) => item.trim().length > 0)
    return items.length > 0 ? items.join(', ') : null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
