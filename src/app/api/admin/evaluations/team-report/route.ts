import { NextRequest } from 'next/server'
import { runAnalyticsReadApi } from '@/lib/admin-api'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { parseEvaluation } from '@/lib/evaluations/data'
import { EVAL_MAX_TOTAL } from '@/lib/evaluations/types'
import { computeSquadCategoryAverages, computeTeamLeaderboard, computeTopCategoryDistribution } from '@/lib/evaluations/aggregation'
import { isoWeekKeyToMonday, monthRange, sundayOf, yearRange } from '@/lib/evaluations/date-utils'
import { normalizeTeamSlug, playerMatchesTeamFilter } from '@/lib/teams'

const WEEK_KEY_RE = /^\d{4}-W\d{2}$/
const MONTH_KEY_RE = /^\d{4}-\d{2}$/
const YEAR_KEY_RE = /^\d{4}$/

export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const team = req.nextUrl.searchParams.get('team')
    const period = req.nextUrl.searchParams.get('period')
    const weekParam = req.nextUrl.searchParams.get('week')
    const monthParam = req.nextUrl.searchParams.get('month')
    const yearParam = req.nextUrl.searchParams.get('year')

    if (!team || team === 'all') {
      return Response.json({ error: 'team is required' }, { status: 400 })
    }
    if (period !== 'week' && period !== 'month' && period !== 'year') {
      return Response.json({ error: 'period must be "week", "month", or "year"' }, { status: 400 })
    }
    if (period === 'week' && !(weekParam && WEEK_KEY_RE.test(weekParam))) {
      return Response.json({ error: 'week must be formatted YYYY-Www' }, { status: 400 })
    }
    if (period === 'month' && !(monthParam && MONTH_KEY_RE.test(monthParam))) {
      return Response.json({ error: 'month must be formatted YYYY-MM' }, { status: 400 })
    }
    if (period === 'year' && !(yearParam && YEAR_KEY_RE.test(yearParam))) {
      return Response.json({ error: 'year must be formatted YYYY' }, { status: 400 })
    }

    const normalizedTeam = normalizeTeamSlug(team)
    const range =
      period === 'week'
        ? { start: isoWeekKeyToMonday(weekParam as string), end: sundayOf(isoWeekKeyToMonday(weekParam as string)) }
        : period === 'month'
          ? monthRange(monthParam as string)
          : yearRange(yearParam as string)

    const [evalSnap, playersSnap] = await Promise.all([
      db
        .collection('player_evaluations')
        .where('team', '==', normalizedTeam)
        .where('date', '>=', range.start)
        .where('date', '<=', range.end)
        .get(),
      db.collection('players').get(),
    ])

    const playerMeta = new Map<string, { name: string; number: number; image?: string }>()
    for (const doc of playersSnap.docs) {
      const data = serializeFirestoreData(doc.data() as Record<string, unknown>)
      const playerTeam = normalizeTeamSlug(String(data.team ?? ''))
      if (!playerMatchesTeamFilter(playerTeam, normalizedTeam)) continue
      playerMeta.set(doc.id, {
        name: String(data.name ?? 'Unknown'),
        number: Number(data.number ?? 0),
        image: data.image ? String(data.image) : undefined,
      })
    }

    const teamEvals = evalSnap.docs.map((d) => parseEvaluation(d.id, d.data() as Record<string, unknown>))

    const outfieldEvals = teamEvals.filter((e) => e.role === 'outfield')
    const goalkeeperEvals = teamEvals.filter((e) => e.role === 'goalkeeper')

    return Response.json({
      period,
      outfield: {
        role: 'outfield',
        maxTotal: EVAL_MAX_TOTAL.outfield,
        entries: computeTeamLeaderboard(outfieldEvals, playerMeta),
        categoryAverages: computeSquadCategoryAverages(outfieldEvals, 'outfield'),
        topCategoryDistribution: computeTopCategoryDistribution(outfieldEvals, 'outfield'),
      },
      goalkeeper: {
        role: 'goalkeeper',
        maxTotal: EVAL_MAX_TOTAL.goalkeeper,
        entries: computeTeamLeaderboard(goalkeeperEvals, playerMeta),
        categoryAverages: computeSquadCategoryAverages(goalkeeperEvals, 'goalkeeper'),
        topCategoryDistribution: computeTopCategoryDistribution(goalkeeperEvals, 'goalkeeper'),
      },
    })
  })
}
