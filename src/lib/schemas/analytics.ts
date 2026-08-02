import { z } from 'zod'

export const homeAwaySchema = z.enum(['home', 'away', 'neutral'])

export const matchStatusSchema = z.enum(['draft', 'final'])

export const matchInputSchema = z.object({
  team: z.string().min(1),
  season: z.string().min(1).max(32),
  competition: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  opponent: z.string().min(1).max(120),
  opponentLogo: z.string().max(500).optional().or(z.literal('')),
  homeAway: homeAwaySchema,
  goalsFor: z.number().int().min(0).max(99),
  goalsAgainst: z.number().int().min(0).max(99),
  status: matchStatusSchema,
  notes: z.string().max(2000).optional().default(''),
  highlightUrl: z.string().url().max(500).optional().or(z.literal('')),
  report: z.string().max(10000).optional().default(''),
})

export const matchUpdateSchema = matchInputSchema.partial()

export const matchPlayerStatInputSchema = z
  .object({
    playerId: z.string().min(1),
    started: z.boolean(),
    minutes: z.number().int().min(0).max(120),
    goals: z.number().int().min(0).max(20),
    assists: z.number().int().min(0).max(20),
    yellowCards: z.number().int().min(0).max(2),
    redCards: z.number().int().min(0).max(1),
    notes: z.string().max(500).optional().default(''),
    headerGoals: z.number().int().min(0).max(20).optional(),
    leftFootGoals: z.number().int().min(0).max(20).optional(),
    rightFootGoals: z.number().int().min(0).max(20).optional(),
    outsideBoxGoals: z.number().int().min(0).max(20).optional(),
    penaltiesTaken: z.number().int().min(0).max(20).optional(),
    penaltiesScored: z.number().int().min(0).max(20).optional(),
    penaltiesSaved: z.number().int().min(0).max(20).optional(),
    penaltiesFaced: z.number().int().min(0).max(20).optional(),
    shots: z.number().int().min(0).max(30).optional(),
    shotsOnTarget: z.number().int().min(0).max(30).optional(),
    keyPasses: z.number().int().min(0).max(30).optional(),
    tacklesWon: z.number().int().min(0).max(30).optional(),
    interceptions: z.number().int().min(0).max(30).optional(),
    clearances: z.number().int().min(0).max(30).optional(),
    foulsCommitted: z.number().int().min(0).max(20).optional(),
    foulsWon: z.number().int().min(0).max(20).optional(),
    goalMinutes: z.array(z.number().int().min(0).max(120)).optional(),
    assistMinutes: z.array(z.number().int().min(0).max(120)).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.yellowCards === 2 && data.redCards === 0) {
      ctx.addIssue({ code: 'custom', path: ['redCards'], message: 'Two yellow cards must result in a red card' })
    }
    const breakdown = (data.headerGoals ?? 0) + (data.leftFootGoals ?? 0) + (data.rightFootGoals ?? 0)
    if (breakdown > data.goals) {
      ctx.addIssue({ code: 'custom', path: ['headerGoals'], message: 'Goal breakdown cannot exceed total goals' })
    }
    if ((data.outsideBoxGoals ?? 0) > data.goals) {
      ctx.addIssue({ code: 'custom', path: ['outsideBoxGoals'], message: 'Outside-box goals cannot exceed total goals' })
    }
    if ((data.penaltiesScored ?? 0) > (data.penaltiesTaken ?? 0)) {
      ctx.addIssue({ code: 'custom', path: ['penaltiesScored'], message: 'Penalties scored cannot exceed penalties taken' })
    }
    if ((data.penaltiesSaved ?? 0) > (data.penaltiesFaced ?? 0)) {
      ctx.addIssue({ code: 'custom', path: ['penaltiesSaved'], message: 'Penalties saved cannot exceed penalties faced' })
    }
    if ((data.shotsOnTarget ?? 0) > (data.shots ?? 0)) {
      ctx.addIssue({ code: 'custom', path: ['shotsOnTarget'], message: 'Shots on target cannot exceed total shots' })
    }
  })

export const matchPlayerStatsBulkSchema = z.object({
  stats: z.array(matchPlayerStatInputSchema).max(40),
})

export type MatchInput = z.infer<typeof matchInputSchema>
export type MatchUpdateInput = z.infer<typeof matchUpdateSchema>
export type MatchPlayerStatInput = z.infer<typeof matchPlayerStatInputSchema>
