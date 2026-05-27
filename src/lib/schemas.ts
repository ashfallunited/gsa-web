import { z } from 'zod'
import { VOLUNTEER_AVAILABILITY_OPTIONS } from './inquiry-options'

export const injurySchema = z.object({
  description: z.string().max(200).optional(),
  injuredDate: z.string(),
  expectedReturn: z.string().optional(),
})

export const playerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  number: z.number().int().min(0).max(99).default(0),
  position: z.enum(['goalkeeper', 'defender', 'midfielder', 'forward']).default('midfielder'),
  team: z.string().min(1).default('first-team'),
  image: z.string().default(''),
  order: z.number().int().min(0).max(999).default(99),
  showOnSite: z.boolean().default(true),
  source: z.enum(['official', 'trial']).default('official'),
  height: z.number().int().min(100).max(250).optional(),
  weight: z.number().int().min(30).max(150).optional(),
  preferredFoot: z.enum(['left', 'right', 'both']).optional(),
  injury: injurySchema.nullable().optional(),
})

export const playerUpdateSchema = playerSchema.partial()

export const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(1),
})

export const newsletterSchema = z.object({
  email: z.string().email(),
  source: z.string().optional(),
})

export const inquiryTypeSchema = z.enum(['volunteer', 'partnership'])

const inquiryMultiSelectField = z.preprocess(
  (val) => {
    if (Array.isArray(val)) return val.filter((item) => typeof item === 'string' && item.trim())
    if (typeof val === 'string' && val.trim()) return [val.trim()]
    return []
  },
  z.array(z.string())
)

export const inquirySchema = z
  .object({
    inquiryType: inquiryTypeSchema,
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    organization: z.string().optional(),
    message: z.string().min(1),
    // Volunteer-specific
    availability: z.preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
      z.enum(VOLUNTEER_AVAILABILITY_OPTIONS).optional()
    ),
    skills: inquiryMultiSelectField.optional(),
    experience: z.string().optional(),
    // Partnership-specific
    partnershipType: z.string().optional(),
    proposedCollaboration: z.string().optional(),
    website: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.inquiryType === 'volunteer' && !data.availability) {
      ctx.addIssue({ code: 'custom', message: 'Select an availability option', path: ['availability'] })
    }
    if (data.inquiryType === 'partnership') {
      if (!data.organization?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'Organization is required', path: ['organization'] })
      }
      if (!data.partnershipType?.trim()) {
        ctx.addIssue({ code: 'custom', message: 'Partnership type is required', path: ['partnershipType'] })
      }
    }
  })

export const DONATION_AMOUNTS_USD = [25, 50, 100, 250] as const

export const donationCheckoutSchema = z.object({
  amountCents: z.number().int().min(100, 'Minimum donation is $1').max(1_000_000),
  donorEmail: z.string().email(),
  donorName: z.string().min(1).max(200),
  message: z.string().max(500).optional(),
})

export const shopOrderSchema = z.object({
  customerName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  contactMethods: z.array(z.string()).optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        image: z.string().optional(),
        size: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
})
