import type { Timestamp } from 'firebase-admin/firestore'

type FirestoreValue = string | number | boolean | null | undefined | FirestoreValue[] | { [key: string]: FirestoreValue }

function isTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as Timestamp).toDate === 'function'
  )
}

/** Convert Firestore document data for JSON API / RSC props. */
export function serializeFirestoreData<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (isTimestamp(value)) {
      out[key] = { seconds: Math.floor(value.toDate().getTime() / 1000), nanoseconds: 0 }
    } else if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        typeof item === 'object' && item !== null && !isTimestamp(item)
          ? serializeFirestoreData(item as Record<string, unknown>)
          : isTimestamp(item)
            ? { seconds: Math.floor(item.toDate().getTime() / 1000), nanoseconds: 0 }
            : item
      )
    } else if (typeof value === 'object' && value !== null) {
      out[key] = serializeFirestoreData(value as Record<string, unknown>)
    } else {
      out[key] = value
    }
  }
  return out as T
}

export function docWithId<T extends Record<string, unknown>>(
  id: string,
  data: T
): T & { id: string } {
  return { id, ...serializeFirestoreData(data) }
}
