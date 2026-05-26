/** Sort list items by optional numeric `order` (matches admin default of 99). */
export function sortByOrder<T extends { order?: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
}

export function sortByCreatedAtDesc(
  items: readonly { createdAt?: { seconds: number } | null }[]
): typeof items {
  return [...items].sort(
    (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
  )
}
