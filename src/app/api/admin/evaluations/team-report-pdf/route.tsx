export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { runAnalyticsReadApi } from '@/lib/admin-api'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { parseEvaluation } from '@/lib/evaluations/data'
import { categoryMetaFor, EVAL_MAX_TOTAL } from '@/lib/evaluations/types'
import type { EvaluationRole, TeamLeaderboard } from '@/lib/evaluations/types'
import { computeSquadCategoryAverages, computeTeamLeaderboard, computeTopCategoryDistribution } from '@/lib/evaluations/aggregation'
import { isoWeekKeyToMonday, monthRange, sundayOf, yearRange } from '@/lib/evaluations/date-utils'
import { normalizeTeamSlug, playerMatchesTeamFilter, TEAM_LABELS } from '@/lib/teams'

const NAVY = '#01255f'
const YELLOW = '#fee11b'
const GREY = '#5a6478'
const LIGHT = '#f5f7fc'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: '#ffffff', padding: 0 },
  header: { backgroundColor: NAVY, padding: 28 },
  teamName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.5 },
  teamSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  body: { padding: 24 },
  roleTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 22, marginBottom: 4 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GREY, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: { width: '22%', backgroundColor: LIGHT, padding: 10, borderLeft: `3px solid ${YELLOW}` },
  statLabel: { fontSize: 8, color: GREY, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 2 },
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

function RoleSection({ title, role, board }: { title: string; role: EvaluationRole; board: TeamLeaderboard }) {
  if (board.entries.length === 0) return null
  const meta = categoryMetaFor(role)
  const totalPeak = board.topCategoryDistribution.reduce((sum, c) => sum + c.count, 0)

  return (
    <View>
      <Text style={styles.roleTitle}>{title} ({board.entries.length})</Text>

      <Text style={styles.sectionTitle}>Squad Category Averages</Text>
      <View style={styles.statsGrid}>
        {meta.map(({ key, label }) => (
          <View key={key} style={styles.statBox}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{board.categoryAverages[key] ?? 0}</Text>
          </View>
        ))}
      </View>

      {board.topCategoryDistribution.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Where Players Peak</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '60%' }]}>Category</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Players</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Share</Text>
            </View>
            {board.topCategoryDistribution.map((c, i) => (
              <View key={c.key} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: '60%' }]}>{c.label}</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>{c.count}</Text>
                <Text style={[styles.tableCellGrey, { width: '20%' }]}>{Math.round((c.count / totalPeak) * 100)}%</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Leaderboard</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '8%' }]}>#</Text>
          <Text style={[styles.tableHeaderCell, { width: '52%' }]}>Player</Text>
          <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Average</Text>
          <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Sessions</Text>
        </View>
        {board.entries.map((e, i) => (
          <View key={e.playerId} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.tableCell, { width: '8%' }]}>{i + 1}</Text>
            <Text style={[styles.tableCell, { width: '52%' }]}>#{e.playerNumber} {e.playerName}</Text>
            <Text style={[styles.tableCell, { width: '20%' }]}>{e.averageTotal}/{board.maxTotal}</Text>
            <Text style={[styles.tableCellGrey, { width: '20%' }]}>{e.sessionCount}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function TeamReportDocument({
  teamLabel,
  periodLabel,
  outfield,
  goalkeeper,
}: {
  teamLabel: string
  periodLabel: string
  outfield: TeamLeaderboard
  goalkeeper: TeamLeaderboard
}) {
  return (
    <Document title={`${teamLabel} — Team Evaluation Overview`} author="Ashfall United">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.teamName}>{teamLabel}</Text>
          <Text style={styles.teamSub}>Team Evaluation Overview · {periodLabel}</Text>
        </View>

        <View style={styles.body} wrap>
          <RoleSection title="Outfield" role="outfield" board={outfield} />
          <RoleSection title="Goalkeepers" role="goalkeeper" board={goalkeeper} />
          {outfield.entries.length === 0 && goalkeeper.entries.length === 0 && (
            <Text style={{ fontSize: 10, color: GREY, marginTop: 20 }}>No evaluations recorded for this period.</Text>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Ashfall United — Team Evaluation Overview</Text>
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
    const team = req.nextUrl.searchParams.get('team')
    const period = req.nextUrl.searchParams.get('period')
    const weekParam = req.nextUrl.searchParams.get('week')
    const monthParam = req.nextUrl.searchParams.get('month')
    const yearParam = req.nextUrl.searchParams.get('year')

    if (!team || team === 'all') return Response.json({ error: 'team is required' }, { status: 400 })
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
      db.collection('player_evaluations').where('team', '==', normalizedTeam).where('date', '>=', range.start).where('date', '<=', range.end).get(),
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

    const outfield: TeamLeaderboard = {
      role: 'outfield',
      maxTotal: EVAL_MAX_TOTAL.outfield,
      entries: computeTeamLeaderboard(outfieldEvals, playerMeta),
      categoryAverages: computeSquadCategoryAverages(outfieldEvals, 'outfield'),
      topCategoryDistribution: computeTopCategoryDistribution(outfieldEvals, 'outfield'),
    }
    const goalkeeper: TeamLeaderboard = {
      role: 'goalkeeper',
      maxTotal: EVAL_MAX_TOTAL.goalkeeper,
      entries: computeTeamLeaderboard(goalkeeperEvals, playerMeta),
      categoryAverages: computeSquadCategoryAverages(goalkeeperEvals, 'goalkeeper'),
      topCategoryDistribution: computeTopCategoryDistribution(goalkeeperEvals, 'goalkeeper'),
    }

    const teamLabel = TEAM_LABELS[normalizedTeam as keyof typeof TEAM_LABELS] ?? normalizedTeam
    const periodLabel = period === 'week' ? `Week of ${range.start}` : period === 'month' ? (monthParam as string) : (yearParam as string)

    const buffer = await renderToBuffer(
      <TeamReportDocument teamLabel={teamLabel} periodLabel={periodLabel} outfield={outfield} goalkeeper={goalkeeper} />
    )
    const filename = `${teamLabel.replace(/[^a-zA-Z0-9]/g, '-')}-evaluations-${periodLabel.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  })
}
