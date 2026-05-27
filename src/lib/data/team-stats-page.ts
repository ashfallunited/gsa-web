import type { Player as GridPlayer } from '@/components/PlayerGrid'
import type { Player as TeamPlayer } from '@/lib/data/team'

function normalizePlayer(p: TeamPlayer): GridPlayer {
  const position = p.position
  const validPosition =
    position === 'goalkeeper' || position === 'defender' || position === 'midfielder' || position === 'forward'
      ? position
      : 'midfielder'
  return {
    id: p.id,
    name: p.name,
    number: p.number ?? 0,
    position: validPosition,
    team: p.team ?? '',
    image: p.image ?? '',
  }
}

export function mergePlayerStats(
  players: TeamPlayer[],
  statsMap:
    | Map<string, { goals: number; assists: number; appearances: number; minutes: number }>
    | Record<string, { goals: number; assists: number; appearances: number; minutes: number }>
): GridPlayer[] {
  return players.map((p) => {
    const base = normalizePlayer(p)
    const stats =
      statsMap instanceof Map ? statsMap.get(p.id) : statsMap[p.id]
    if (!stats) return base
    return { ...base, stats }
  })
}
