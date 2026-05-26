import type { WhereFilterOp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'

type WhereClause = readonly [field: string, op: WhereFilterOp, value: unknown]

/** Document count for admin dashboards (compatible with firebase-admin v10). */
export async function getCollectionCount(
  collection: string,
  where?: WhereClause
): Promise<number> {
  const db = getAdminDb()
  let query = db.collection(collection) as FirebaseFirestore.Query
  if (where) {
    query = query.where(where[0], where[1], where[2])
  }
  const snapshot = await query.get()
  return snapshot.size
}
