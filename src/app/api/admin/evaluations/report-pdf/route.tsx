export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { runAnalyticsReadApi } from '@/lib/admin-api'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { fetchScheduledDates, parseCoach, parseEvaluation } from '@/lib/evaluations/data'
import { categoryMetaFor, roleForPosition } from '@/lib/evaluations/types'
import type { EvaluationRole, MonthReport, WeekReport, YearReport } from '@/lib/evaluations/types'
import { computeMonthReport, computeWeekReport, computeYearReport } from '@/lib/evaluations/aggregation'
import { isoWeekKeyToMonday, monthRange, sundayOf, yearRange } from '@/lib/evaluations/date-utils'
import { normalizeTeamSlug } from '@/lib/teams'

const NAVY = '#01255f'
const YELLOW = '#fee11b'
const GREY = '#5a6478'
const LIGHT = '#f5f7fc'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: '#ffffff', padding: 0 },
  header: { backgroundColor: NAVY, padding: 28, flexDirection: 'row', alignItems: 'center', gap: 20 },
  headerText: { flex: 1 },
  playerName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.5 },
  playerSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)' },
  avatarInitials: { width: 72, height: 72, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarInitialsText: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: YELLOW },
  jerseyBadge: { backgroundColor: YELLOW, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  jerseyBadgeText: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
  body: { padding: 24 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREY, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: { width: '22%', backgroundColor: LIGHT, padding: 10, borderLeft: `3px solid ${YELLOW}` },
  statLabel: { fontSize: 8, color: GREY, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 2 },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: NAVY, paddingVertical: 6, paddingHorizontal: 8 },
  tableHeaderCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.8, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottom: '1px solid #e5e7eb' },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: LIGHT, borderBottom: '1px solid #e5e7eb' },
  tableCell: { fontSize: 8, color: NAVY },
  tableCellGrey: { fontSize: 8, color: GREY },
  footer: { position: 'absolute', bottom: 16, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: 8 },
  footerText: { fontSize: 8, color: GREY },
})

function cap(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

type PlayerInfo = { name: string; number: number; position: string; team: string; image?: string; role: EvaluationRole }

function EvaluationReportDocument({
  player,
  periodLabel,
  report,
}: {
  player: PlayerInfo
  periodLabel: string
  report: WeekReport | MonthReport | YearReport
}) {
  const initials = player.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const meta = categoryMetaFor(player.role)

  return (
    <Document title={`${player.name} — Evaluation Report`} author="Ashfall United">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {player.image ? (
            <Image src={player.image} style={styles.avatar} />
          ) : (
            <View style={styles.avatarInitials}>
              <Text style={styles.avatarInitialsText}>{initials}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.playerSub}>
              {cap(player.position)} · {cap(player.team.replace(/-/g, ' '))}
            </Text>
            <View style={styles.jerseyBadge}>
              <Text style={styles.jerseyBadgeText}>#{player.number} · {periodLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Average Total', value: `${report.averageTotal} / ${report.maxTotal}` },
              { label: 'Sessions', value: report.sessionCount },
              { label: 'Squad Rank', value: report.squadRank ? `#${report.squadRank.rank} of ${report.squadRank.outOf}` : '—' },
              { label: 'Attendance', value: report.attendance.sessionsHeld > 0 ? `${report.attendance.attended}/${report.attendance.sessionsHeld}` : '—' },
            ].map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </View>
          {report.attendance.unloggedScheduledDates.length > 0 && (
            <Text style={{ fontSize: 8, color: GREY, marginTop: 6 }}>
              Scheduled but not logged for anyone: {report.attendance.unloggedScheduledDates.join(', ')}
            </Text>
          )}

          <Text style={styles.sectionTitle}>Category Ratings</Text>
          <View style={styles.statsGrid}>
            {meta.map(({ key, label }) => (
              <View key={key} style={styles.statBox}>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={styles.statValue}>{(report.categoryAverages as Record<string, number>)[key] ?? 0}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Training vs Match</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Training</Text>
              <Text style={styles.statValue}>
                {report.typeSplit.training.sessionCount > 0 ? report.typeSplit.training.averageTotal : '—'}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Match</Text>
              <Text style={styles.statValue}>
                {report.typeSplit.match.sessionCount > 0 ? report.typeSplit.match.averageTotal : '—'}
              </Text>
            </View>
          </View>

          {report.sessions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Sessions ({report.sessions.length})</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Date</Text>
                  <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Type</Text>
                  <Text style={[styles.tableHeaderCell, { width: '37%' }]}>Coach</Text>
                  <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Total</Text>
                </View>
                {report.sessions.map((s, i) => (
                  <View key={s.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Text style={[styles.tableCell, { width: '18%' }]}>{s.date}</Text>
                    <Text style={[styles.tableCellGrey, { width: '15%' }]}>{cap(s.type)}</Text>
                    <Text style={[styles.tableCell, { width: '37%' }]}>{s.coachName}</Text>
                    <Text style={[styles.tableCell, { width: '15%' }]}>{s.total}/{s.maxTotal}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {report.comments.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Coach Comments</Text>
              {report.comments.map((c) => (
                <View key={c.evaluationId} style={{ marginBottom: 8, borderLeft: `2px solid ${YELLOW}`, paddingLeft: 8 }}>
                  <Text style={{ fontSize: 8, color: GREY, marginBottom: 2 }}>{c.date} · {c.coachName}</Text>
                  <Text style={{ fontSize: 9, color: NAVY }}>{c.comment}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Ashfall United — Player Evaluation Report</Text>
          <Text style={styles.footerText}>{new Date().toLocaleDateString('en-GB')}</Text>
        </View>
      </Page>
    </Document>
  )
}

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

    if (!playerId) return Response.json({ error: 'playerId is required' }, { status: 400 })
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
    if (!playerDoc.exists) return Response.json({ error: 'Player not found' }, { status: 404 })
    const rawPlayer = serializeFirestoreData(playerDoc.data() as Record<string, unknown>)
    const team = normalizeTeamSlug(String(rawPlayer.team ?? ''))
    const role = roleForPosition(String(rawPlayer.position ?? ''))
    const player: PlayerInfo = {
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

    const [evalSnap, coachSnap, scheduledDates] = await Promise.all([
      db.collection('player_evaluations').where('team', '==', team).where('date', '>=', range.start).where('date', '<=', range.end).get(),
      db.collection('coaches').get(),
      fetchScheduledDates(db, team, range),
    ])

    const coachMap = new Map(coachSnap.docs.map((d) => {
      const c = parseCoach(d.id, d.data() as Record<string, unknown>)
      return [c.id, c.name]
    }))
    const coachNameOf = (id: string) => coachMap.get(id) ?? 'Unknown Coach'

    const teamEvals = evalSnap.docs.map((d) => parseEvaluation(d.id, d.data() as Record<string, unknown>))
    const teamSessionDates = [...new Set(teamEvals.map((e) => e.date))].sort()
    const teamRoleEvals = teamEvals.filter((e) => e.role === role)
    const playerEvals = teamRoleEvals.filter((e) => e.playerId === playerId)

    const periodLabel =
      period === 'week' ? `Week of ${range.start}` : period === 'month' ? (monthParam as string) : (yearParam as string)

    const report =
      period === 'week'
        ? computeWeekReport(playerId, role, weekParam as string, playerEvals, coachNameOf, teamRoleEvals, teamSessionDates, scheduledDates)
        : period === 'month'
          ? computeMonthReport(playerId, role, monthParam as string, playerEvals, coachNameOf, teamRoleEvals, teamSessionDates, scheduledDates)
          : computeYearReport(playerId, role, yearParam as string, playerEvals, coachNameOf, teamRoleEvals, teamSessionDates, scheduledDates)

    const buffer = await renderToBuffer(<EvaluationReportDocument player={player} periodLabel={periodLabel} report={report} />)
    const safeName = player.name.replace(/[^a-zA-Z0-9]/g, '-')
    const filename = `${safeName}-evaluation-${periodLabel.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  })
}
