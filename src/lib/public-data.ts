/**
 * Wrap public data loaders so Firestore/query failures are logged in development
 * instead of failing silently when pages use `.catch(() => [])`.
 */
export async function loadPublicData<T>(
  label: string,
  loader: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${label}] failed to load public data:`, error)
    }
    return fallback
  }
}
