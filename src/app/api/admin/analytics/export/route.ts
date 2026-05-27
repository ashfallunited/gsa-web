import { NextRequest } from 'next/server'
import { runAnalyticsReadApi } from '@/lib/admin-api'
import {
  aggregatePlayerSeasonTotals,
  parseMatch,
  parseStat,
} from '@/lib/data/games'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import { computeMatchResult } from '@/lib/analytics/aggregation'
import { normalizeTeamSlug, playerMatchesTeamFilter } from '@/lib/teams'

function csvEscape(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
}

export async function GET(req: NextRequest) {
  return runAnalyticsReadApi(req, async ({ db }) => {
    const type = req.nextUrl.searchParams.get('type') ?? 'season-players'
    const team = req.nextUrl.searchParams.get('team') ?? 'first-team'
    const season = req.nextUrl.searchParams.get('season') ?? undefined
    const matchId = req.nextUrl.searchParams.get('matchId') ?? undefined

    if (type === 'match-report' && matchId) {
      const matchDoc = await db.collection('matches').doc(matchId).get()
      if (!matchDoc.exists) {
        return Response.json({ error: 'Match not found' }, { status: 404 })
      }
      const match = parseMatch(matchDoc.id, matchDoc.data() as Record<string, unknown>)
      const statsSnap = await db.collection('match_player_stats').where('matchId', '==', matchId).get()
      const stats = statsSnap.docs.map((d) => parseStat(d.id, d.data() as Record<string, unknown>))

      const playersSnap = await db.collection('players').get()
      const nameMap = new Map<string, string>()
      for (const doc of playersSnap.docs) {
        nameMap.set(doc.id, String(doc.data().name ?? 'Unknown'))
      }

      const rows: string[][] = [
        ['Match Report'],
        ['Date', match.date],
        ['Opponent', match.opponent],
        ['Competition', match.competition],
        ['Season', match.season],
        ['Score', `${match.goalsFor}-${match.goalsAgainst}`],
        ['Result', computeMatchResult(match)],
        ['Status', match.status],
        [],
        ['Player', 'Started', 'Minutes', 'Goals', 'Assists', 'Yellow', 'Red', 'Notes'],
      ]

      for (const stat of stats) {
        rows.push([
          nameMap.get(stat.playerId) ?? stat.playerId,
          stat.started ? 'Yes' : 'No',
          String(stat.minutes),
          String(stat.goals),
          String(stat.assists),
          String(stat.yellowCards),
          String(stat.redCards),
          stat.notes,
        ])
      }

      const csv = toCsv(rows)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="match-${match.date}-${match.opponent.replace(/\s+/g, '-').toLowerCase()}.csv"`,
        },
      })
    }

    const [matchesSnap, statsSnap, playersSnap] = await Promise.all([
      db.collection('matches').get(),
      db.collection('match_player_stats').get(),
      db.collection('players').get(),
    ])

    let matches = matchesSnap.docs.map((d) => parseMatch(d.id, d.data() as Record<string, unknown>))
    if (team !== 'all') {
      matches = matches.filter((m) => playerMatchesTeamFilter(m.team, team))
    }
    if (season) {
      matches = matches.filter((m) => m.season === season)
    }

    const finalIds = new Set(matches.filter((m) => m.status === 'final').map((m) => m.id))
    const allStats = statsSnap.docs.map((d) => parseStat(d.id, d.data() as Record<string, unknown>))

    const playerMeta = new Map<string, { name: string; number: number; position: string; team: string }>()
    for (const doc of playersSnap.docs) {
      const data = serializeFirestoreData(doc.data() as Record<string, unknown>)
      const playerTeam = normalizeTeamSlug(String(data.team ?? ''))
      if (team !== 'all' && !playerMatchesTeamFilter(playerTeam, team)) continue
      playerMeta.set(doc.id, {
        name: String(data.name ?? 'Unknown'),
        number: Number(data.number ?? 0),
        position: String(data.position ?? ''),
        team: playerTeam,
      })
    }

    const totals = aggregatePlayerSeasonTotals(allStats, playerMeta, finalIds)

    if (type === 'squad-summary') {
      const rows: string[][] = [
        ['Squad Summary', team, season ?? 'All seasons'],
        [],
        ['Player', '#', 'Position', 'Apps', 'Starts', 'Minutes', 'Goals', 'Assists', 'Yellow', 'Red'],
      ]
      for (const t of totals) {
        rows.push([
          t.playerName,
          String(t.playerNumber),
          t.playerPosition,
          String(t.appearances),
          String(t.starts),
          String(t.minutes),
          String(t.goals),
          String(t.assists),
          String(t.yellowCards),
          String(t.redCards),
        ])
      }
      const csv = toCsv(rows)
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="squad-summary-${team}${season ? `-${season}` : ''}.csv"`,
        },
      })
    }

    const rows: string[][] = [
      ['Season Player Stats', team, season ?? 'All seasons'],
      [],
      ['Player', '#', 'Position', 'Apps', 'Starts', 'Minutes', 'Goals', 'Assists', 'Yellow', 'Red'],
    ]
    for (const t of totals) {
      rows.push([
        t.playerName,
        String(t.playerNumber),
        t.playerPosition,
        String(t.appearances),
        String(t.starts),
        String(t.minutes),
        String(t.goals),
        String(t.assists),
        String(t.yellowCards),
        String(t.redCards),
      ])
    }

    const csv = toCsv(rows)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="season-player-stats-${team}${season ? `-${season}` : ''}.csv"`,
      },
    })
  })
}
