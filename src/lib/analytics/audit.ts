import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { AdminRole } from '@/lib/analytics/types'

export async function writeAuditLog(
  db: Firestore,
  entry: {
    action: string
    entityType: 'match' | 'match_player_stat' | 'match_duplicate'
    entityId: string
    summary: string
    actor: string
    actorRole: AdminRole
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  await db.collection('analytics_audit_logs').add({
    ...entry,
    createdAt: FieldValue.serverTimestamp(),
  })
}
