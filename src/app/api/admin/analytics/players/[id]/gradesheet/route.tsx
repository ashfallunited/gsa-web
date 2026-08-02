export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { runAnalyticsReadApi } from '@/lib/admin-api'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { normalizeTeamSlug, playerMatchesTeamFilter } from '@/lib/teams'
import { computeMatchResult } from '@/lib/analytics/aggregation'

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
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  profileItem: { width: '30%', padding: 8, backgroundColor: LIGHT },
  profileLabel: { fontSize: 8, color: GREY, textTransform: 'uppercase', letterSpacing: 1 },
  profileValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 2 },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: NAVY, paddingVertical: 6, paddingHorizontal: 8 },
  tableHeaderCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.8, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottom: '1px solid #e5e7eb' },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: LIGHT, borderBottom: '1px solid #e5e7eb' },
  tableCell: { fontSize: 8, color: NAVY },
  tableCellGrey: { fontSize: 8, color: GREY },
  resultW: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#166534', backgroundColor: '#dcfce7', paddingHorizontal: 4, paddingVertical: 1 },
  resultL: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#991b1b', backgroundColor: '#fee2e2', paddingHorizontal: 4, paddingVertical: 1 },
  resultD: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#374151', backgroundColor: '#f3f4f6', paddingHorizontal: 4, paddingVertical: 1 },
  footer: { position: 'absolute', bottom: 16, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', borderTop: `1px solid #e5e7eb`, paddingTop: 8 },
  footerText: { fontSize: 8, color: GREY },
})

type MatchLogEntry = {
  matchDate: string
  opponent: string
  competition: string
  season: string
  result: 'W' | 'D' | 'L'
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  started: boolean
}

type PlayerInfo = {
  name: string
  number: number
  position: string
  team: string
  image?: string
  height?: number
  weight?: number
  preferredFoot?: string
}

type SeasonTotals = {
  appearances: number
  starts: number
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  headerGoals: number
  leftFootGoals: number
  rightFootGoals: number
  outsideBoxGoals: number
  penaltiesTaken: number
  penaltiesScored: number
  penaltiesSaved: number
  penaltiesFaced: number
  shots: number
  shotsOnTarget: number
  keyPasses: number
  tacklesWon: number
  interceptions: number
  clearances: number
  foulsCommitted: number
  foulsWon: number
}

function cap(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function GradesheetDocument({
  player,
  totals,
  log,
  seasonLabel,
}: {
  player: PlayerInfo
  totals: SeasonTotals
  log: MatchLogEntry[]
  seasonLabel: string
}) {
  const initials = player.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <Document title={`${player.name} — Player Gradesheet`} author="Ashfall United">
      <Page size="A4" style={styles.page}>
        {/* Header */}
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
              <Text style={styles.jerseyBadgeText}>#{player.number} · {seasonLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Profile attributes */}
          {(player.height || player.weight || player.preferredFoot) && (
            <>
              <Text style={styles.sectionTitle}>Profile</Text>
              <View style={styles.profileGrid}>
                {player.height ? (
                  <View style={styles.profileItem}>
                    <Text style={styles.profileLabel}>Height</Text>
                    <Text style={styles.profileValue}>{player.height} cm</Text>
                  </View>
                ) : null}
                {player.weight ? (
                  <View style={styles.profileItem}>
                    <Text style={styles.profileLabel}>Weight</Text>
                    <Text style={styles.profileValue}>{player.weight} kg</Text>
                  </View>
                ) : null}
                {player.preferredFoot ? (
                  <View style={styles.profileItem}>
                    <Text style={styles.profileLabel}>Preferred Foot</Text>
                    <Text style={styles.profileValue}>{cap(player.preferredFoot)}</Text>
                  </View>
                ) : null}
              </View>
            </>
          )}

          {/* Season totals */}
          <Text style={styles.sectionTitle}>Season Stats</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Apps', value: totals.appearances },
              { label: 'Starts', value: totals.starts },
              { label: 'Minutes', value: totals.minutes },
              { label: 'Goals', value: totals.goals },
              { label: 'Assists', value: totals.assists },
              { label: 'Yellow', value: totals.yellowCards },
              { label: 'Red', value: totals.redCards },
            ].map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </View>

          {/* Goal breakdown */}
          <Text style={styles.sectionTitle}>Goal Breakdown</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Header', value: totals.headerGoals },
              { label: 'Left Foot', value: totals.leftFootGoals },
              { label: 'Right Foot', value: totals.rightFootGoals },
              { label: 'Out of Box', value: totals.outsideBoxGoals },
            ].map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </View>

          {/* Match stats */}
          <Text style={styles.sectionTitle}>Match Stats</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Shots', value: totals.shots },
              { label: 'On Target', value: totals.shotsOnTarget },
              { label: 'Key Passes', value: totals.keyPasses },
              { label: 'Tackles Won', value: totals.tacklesWon },
              { label: 'Interceptions', value: totals.interceptions },
              { label: 'Clearances', value: totals.clearances },
              { label: 'Fouls Committed', value: totals.foulsCommitted },
              { label: 'Fouls Won', value: totals.foulsWon },
            ].map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </View>

          {/* Penalty stats */}
          <Text style={styles.sectionTitle}>Penalty Stats</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Taken', value: totals.penaltiesTaken },
              {
                label: 'Scored',
                value: totals.penaltiesScored,
                sub: totals.penaltiesTaken > 0
                  ? `${Math.round((totals.penaltiesScored / totals.penaltiesTaken) * 100)}%`
                  : undefined,
              },
              { label: 'Faced', value: totals.penaltiesFaced },
              {
                label: 'Saved',
                value: totals.penaltiesSaved,
                sub: totals.penaltiesFaced > 0
                  ? `${Math.round((totals.penaltiesSaved / totals.penaltiesFaced) * 100)}%`
                  : undefined,
              },
            ].map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
                {s.sub ? <Text style={{ fontSize: 8, color: GREY, marginTop: 1 }}>{s.sub}</Text> : null}
              </View>
            ))}
          </View>

          {/* Match log */}
          {log.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Match Log ({log.length} matches)</Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Date</Text>
                  <Text style={[styles.tableHeaderCell, { width: '24%' }]}>Opponent</Text>
                  <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Competition</Text>
                  <Text style={[styles.tableHeaderCell, { width: '8%' }]}>Res</Text>
                  <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Min</Text>
                  <Text style={[styles.tableHeaderCell, { width: '8%' }]}>G</Text>
                  <Text style={[styles.tableHeaderCell, { width: '8%' }]}>A</Text>
                  <Text style={[styles.tableHeaderCell, { width: '8%' }]}>Y/R</Text>
                </View>
                {log.map((entry, i) => {
                  const rowStyle = i % 2 === 0 ? styles.tableRow : styles.tableRowAlt
                  const resultStyle =
                    entry.result === 'W'
                      ? styles.resultW
                      : entry.result === 'L'
                      ? styles.resultL
                      : styles.resultD
                  return (
                    <View key={`${entry.matchDate}-${i}`} style={rowStyle}>
                      <Text style={[styles.tableCell, { width: '18%' }]}>{entry.matchDate}</Text>
                      <Text style={[styles.tableCell, { width: '24%' }]}>{entry.opponent}</Text>
                      <Text style={[styles.tableCellGrey, { width: '20%' }]}>{entry.competition}</Text>
                      <Text style={[resultStyle, { width: '8%' }]}>{entry.result}</Text>
                      <Text style={[styles.tableCell, { width: '10%' }]}>{entry.minutes}&apos;</Text>
                      <Text style={[styles.tableCell, { width: '8%' }]}>{entry.goals}</Text>
                      <Text style={[styles.tableCell, { width: '8%' }]}>{entry.assists}</Text>
                      <Text style={[styles.tableCellGrey, { width: '8%' }]}>{entry.yellowCards}/{entry.redCards}</Text>
                    </View>
                  )
                })}
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Ashfall United — Player Report</Text>
          <Text style={styles.footerText}>{new Date().toLocaleDateString('en-GB')}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playerId } = await params

  return runAnalyticsReadApi(req, async ({ db }) => {
    const season = req.nextUrl.searchParams.get('season') ?? undefined
    const team = req.nextUrl.searchParams.get('team') ?? 'all'

    const [playerDoc, matchesSnap, statsSnap] = await Promise.all([
      db.collection('players').doc(playerId).get(),
      db.collection('matches').get(),
      db.collection('match_player_stats').where('playerId', '==', playerId).get(),
    ])

    if (!playerDoc.exists) {
      return Response.json({ error: 'Player not found' }, { status: 404 })
    }

    const rawPlayer = serializeFirestoreData(playerDoc.data() as Record<string, unknown>)
    const player: PlayerInfo = {
      name: String(rawPlayer.name ?? 'Unknown'),
      number: Number(rawPlayer.number ?? 0),
      position: String(rawPlayer.position ?? ''),
      team: normalizeTeamSlug(String(rawPlayer.team ?? '')),
      image: rawPlayer.image ? String(rawPlayer.image) : undefined,
      height: rawPlayer.height ? Number(rawPlayer.height) : undefined,
      weight: rawPlayer.weight ? Number(rawPlayer.weight) : undefined,
      preferredFoot: rawPlayer.preferredFoot ? String(rawPlayer.preferredFoot) : undefined,
    }

    let matches = matchesSnap.docs.map((d) => {
      const data = serializeFirestoreData(d.data() as Record<string, unknown>)
      return {
        id: d.id,
        team: normalizeTeamSlug(String(data.team ?? '')),
        season: String(data.season ?? ''),
        competition: String(data.competition ?? ''),
        date: String(data.date ?? ''),
        opponent: String(data.opponent ?? ''),
        goalsFor: Number(data.goalsFor ?? 0),
        goalsAgainst: Number(data.goalsAgainst ?? 0),
        status: String(data.status ?? 'draft'),
      }
    })

    if (team !== 'all') {
      matches = matches.filter((m) => playerMatchesTeamFilter(m.team, team))
    }
    if (season) {
      matches = matches.filter((m) => m.season === season)
    }

    const finalMatchIds = new Set(matches.filter((m) => m.status === 'final').map((m) => m.id))
    const matchMap = new Map(matches.map((m) => [m.id, m]))

    const totals: SeasonTotals = {
      appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0,
      headerGoals: 0, leftFootGoals: 0, rightFootGoals: 0, outsideBoxGoals: 0,
      penaltiesTaken: 0, penaltiesScored: 0, penaltiesSaved: 0, penaltiesFaced: 0,
      shots: 0, shotsOnTarget: 0, keyPasses: 0, tacklesWon: 0, interceptions: 0, clearances: 0,
      foulsCommitted: 0, foulsWon: 0,
    }
    const log: MatchLogEntry[] = []

    for (const doc of statsSnap.docs) {
      const s = serializeFirestoreData(doc.data() as Record<string, unknown>)
      const matchId = String(s.matchId ?? '')
      if (!finalMatchIds.has(matchId)) continue
      const match = matchMap.get(matchId)
      if (!match) continue

      const minutes = Number(s.minutes ?? 0)
      const goals = Number(s.goals ?? 0)
      const assists = Number(s.assists ?? 0)
      const yellowCards = Number(s.yellowCards ?? 0)
      const redCards = Number(s.redCards ?? 0)
      const started = Boolean(s.started)

      if (minutes > 0 || started) totals.appearances += 1
      if (started) totals.starts += 1
      totals.minutes += minutes
      totals.goals += goals
      totals.assists += assists
      totals.yellowCards += yellowCards
      totals.redCards += redCards
      totals.headerGoals += s.headerGoals != null ? Number(s.headerGoals) : 0
      totals.leftFootGoals += s.leftFootGoals != null ? Number(s.leftFootGoals) : 0
      totals.rightFootGoals += s.rightFootGoals != null ? Number(s.rightFootGoals) : 0
      totals.outsideBoxGoals += s.outsideBoxGoals != null ? Number(s.outsideBoxGoals) : 0
      totals.penaltiesTaken += s.penaltiesTaken != null ? Number(s.penaltiesTaken) : 0
      totals.penaltiesScored += s.penaltiesScored != null ? Number(s.penaltiesScored) : 0
      totals.penaltiesSaved += s.penaltiesSaved != null ? Number(s.penaltiesSaved) : 0
      totals.penaltiesFaced += s.penaltiesFaced != null ? Number(s.penaltiesFaced) : 0
      totals.shots += s.shots != null ? Number(s.shots) : 0
      totals.shotsOnTarget += s.shotsOnTarget != null ? Number(s.shotsOnTarget) : 0
      totals.keyPasses += s.keyPasses != null ? Number(s.keyPasses) : 0
      totals.tacklesWon += s.tacklesWon != null ? Number(s.tacklesWon) : 0
      totals.interceptions += s.interceptions != null ? Number(s.interceptions) : 0
      totals.clearances += s.clearances != null ? Number(s.clearances) : 0
      totals.foulsCommitted += s.foulsCommitted != null ? Number(s.foulsCommitted) : 0
      totals.foulsWon += s.foulsWon != null ? Number(s.foulsWon) : 0

      log.push({
        matchDate: match.date,
        opponent: match.opponent,
        competition: match.competition,
        season: match.season,
        result: computeMatchResult({ goalsFor: match.goalsFor, goalsAgainst: match.goalsAgainst }),
        minutes,
        goals,
        assists,
        yellowCards,
        redCards,
        started,
      })
    }

    log.sort((a, b) => b.matchDate.localeCompare(a.matchDate))

    const seasonLabel = season ?? 'All Time'

    const buffer = await renderToBuffer(
      <GradesheetDocument
        player={player}
        totals={totals}
        log={log}
        seasonLabel={seasonLabel}
      />
    )

    const safeName = player.name.replace(/[^a-zA-Z0-9]/g, '-')
    const safeSeaon = seasonLabel.replace(/[^a-zA-Z0-9]/g, '-')
    const filename = `${safeName}-gradesheet-${safeSeaon}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  })
}
