import { z } from 'zod'
import { OUTFIELD_CATEGORY_META, GOALKEEPER_CATEGORY_META } from '@/lib/evaluations/types'

export const coachSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  active: z.boolean().default(true),
})

export const coachUpdateSchema = coachSchema.partial()

export const evaluationTypeSchema = z.enum(['training', 'match'])

const rating = z.number().int().min(1).max(5)

const outfieldCategoriesShape = Object.fromEntries(
  OUTFIELD_CATEGORY_META.map(({ key }) => [key, rating])
) as Record<(typeof OUTFIELD_CATEGORY_META)[number]['key'], typeof rating>
export const outfieldCategoriesSchema = z.object(outfieldCategoriesShape).strict()

const goalkeeperCategoriesShape = Object.fromEntries(
  GOALKEEPER_CATEGORY_META.map(({ key }) => [key, rating])
) as Record<(typeof GOALKEEPER_CATEGORY_META)[number]['key'], typeof rating>
export const goalkeeperCategoriesSchema = z.object(goalkeeperCategoriesShape).strict()

const evaluationBase = {
  playerId: z.string().min(1),
  coachId: z.string().min(1),
  type: evaluationTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  season: z.string().min(1).max(32),
  comment: z.string().max(1000).optional().default(''),
}

export const evaluationInputSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('outfield'), ...evaluationBase, categories: outfieldCategoriesSchema }),
  z.object({ role: z.literal('goalkeeper'), ...evaluationBase, categories: goalkeeperCategoriesSchema }),
])

export type EvaluationInput = z.infer<typeof evaluationInputSchema>
export type CoachInput = z.infer<typeof coachSchema>
