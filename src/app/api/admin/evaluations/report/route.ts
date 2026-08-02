import { NextRequest } from 'next/server'
import { runAnalyticsReadApi } from '@/lib/admin-api'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { parseCoach, parseEvaluation } from '@/lib/evaluations/data'
import { roleForPosition } from '@/lib/evaluations/types'
import { computeMonthReport, computeWeekReport, computeYearReport } from '@/lib/evaluations/aggregation'
import { isoWeekKeyToMonday, monthRange, sundayOf, yearRange } from '@/lib/evaluations/date-utils'
import { normalizeTeamSlug } from '@/lib/teams'

const WEEK_KEY_RE = /^\d{4}-W\d{2}$/
const MONTH_KEY_RE = /^\d{4}-\d{2}$/
const YEAR_KEY_RE = /^\d{4}$/

export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const playerId = req.nextUrl.searchParams.get('playerId')
    const period = req.nextUrl.searchParams.get('period')
    const weekParam = req.nextUrl.searchParams.get('week')
    const monthParam = req.nextUrl.searchParams.get('month')
    const yearParam = req.nextUrl.searchParams.get('year')

    if (!playerId) {
      return Response.json({ error: 'playerId is required' }, { status: 400 })
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

    const playerDoc = await db.collection('players').doc(playerId).get()
    if (!playerDoc.exists) {
      return Response.json({ error: 'Player not found' }, { status: 404 })
    }
    const rawPlayer = serializeFirestoreData(playerDoc.data() as Record<string, unknown>)
    const team = normalizeTeamSlug(String(rawPlayer.team ?? ''))
    const role = roleForPosition(String(rawPlayer.position ?? ''))
    const player = {
      id: playerId,
      name: String(rawPlayer.name ?? 'Unknown'),
      number: Number(rawPlayer.number ?? 0),
      position: String(rawPlayer.position ?? ''),
      image: rawPlayer.image ? String(rawPlayer.image) : undefined,
      team,
      role,
    }

    const range =
      period === 'week'
        ? { start: isoWeekKeyToMonday(weekParam as string), end: sundayOf(isoWeekKeyToMonday(weekParam as string)) }
        : period === 'month'
          ? monthRange(monthParam as string)
          : yearRange(yearParam as string)

    const [evalSnap, coachSnap] = await Promise.all([
      db
        .collection('player_evaluations')
        .where('team', '==', team)
        .where('date', '>=', range.start)
        .where('date', '<=', range.end)
        .get(),
      db.collection('coaches').get(),
    ])

    const coachMap = new Map(
      coachSnap.docs.map((d) => {
        const c = parseCoach(d.id, d.data() as Record<string, unknown>)
        return [c.id, c.name]
      })
    )
    const coachNameOf = (id: string) => coachMap.get(id) ?? 'Unknown Coach'

    const teamEvals = evalSnap.docs.map((d) => parseEvaluation(d.id, d.data() as Record<string, unknown>))
    // Session calendar for attendance: any date the team had an evaluation, regardless of role.
    const teamSessionDates = [...new Set(teamEvals.map((e) => e.date))].sort()

    const teamRoleEvals = teamEvals.filter((e) => e.role === role)
    const playerEvals = teamRoleEvals.filter((e) => e.playerId === playerId)

    const report =
      period === 'week'
        ? computeWeekReport(playerId, role, weekParam as string, playerEvals, coachNameOf, teamRoleEvals, teamSessionDates)
        : period === 'month'
          ? computeMonthReport(playerId, role, monthParam as string, playerEvals, coachNameOf, teamRoleEvals, teamSessionDates)
          : computeYearReport(playerId, role, yearParam as string, playerEvals, coachNameOf, teamRoleEvals, teamSessionDates)

    return Response.json({
      player,
      period,
      hasData: playerEvals.length > 0,
      report,
    })
  })
}
