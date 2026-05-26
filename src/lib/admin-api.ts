import type { NextRequest } from 'next/server'
import type { Firestore } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'

function toAdminApiErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Server error'
  const isFirebaseConfig = message.includes('Firebase Admin credentials missing')

  return Response.json(
    {
      error: isFirebaseConfig
        ? message
        : 'Something went wrong. Please try again.',
    },
    { status: isFirebaseConfig ? 503 : 500 }
  )
}

/** Runs an admin API handler with auth + JSON error responses (including missing Firebase config). */
export async function runAdminApi(
  req: NextRequest,
  handler: () => Promise<Response>
): Promise<Response> {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    return await handler()
  } catch (error) {
    console.error('Admin API error:', error)
    return toAdminApiErrorResponse(error)
  }
}

/** Same as runAdminApi but provides an initialized Firestore instance. */
export async function runAdminApiWithDb(
  req: NextRequest,
  handler: (db: Firestore) => Promise<Response>
): Promise<Response> {
  return runAdminApi(req, async () => handler(getAdminDb()))
}
