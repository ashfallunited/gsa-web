const POSITION_RANK: Record<string, number> = {
  goalkeeper: 0,
  defender: 1,
  midfielder: 2,
  forward: 3,
}

export type SortablePlayer = {
  position?: string
  order?: number
  number?: number
  name?: string
}

/** Goalkeepers → defenders → midfielders → forwards; then display order, jersey number, name. */
export function sortPlayersByPosition<T extends SortablePlayer>(players: readonly T[]): T[] {
  return [...players].sort((a, b) => {
    const rankA = POSITION_RANK[a.position ?? ''] ?? 99
    const rankB = POSITION_RANK[b.position ?? ''] ?? 99
    if (rankA !== rankB) return rankA - rankB

    const orderA = a.order ?? 99
    const orderB = b.order ?? 99
    if (orderA !== orderB) return orderA - orderB

    const numberA = a.number ?? 999
    const numberB = b.number ?? 999
    if (numberA !== numberB) return numberA - numberB

    return (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' })
  })
}
