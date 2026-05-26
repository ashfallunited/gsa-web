import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_UPLOAD_BUCKETS,
  MAX_UPLOAD_BYTES,
} from '@/lib/constants'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export function parseSupabaseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
    if (!match?.[1] || !match[2]) return null
    return {
      bucket: match[1],
      path: decodeURIComponent(match[2]),
    }
  } catch {
    return null
  }
}

export async function uploadToSupabaseStorage(
  bucket: string,
  path: string,
  bytes: Buffer,
  contentType: string
): Promise<string> {
  if (!ALLOWED_UPLOAD_BUCKETS.includes(bucket as (typeof ALLOWED_UPLOAD_BUCKETS)[number])) {
    throw new Error('Invalid storage bucket')
  }
  if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new Error('Invalid file type')
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error('File too large (max 8MB)')
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: false,
    cacheControl: '31536000',
  })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteFromSupabaseStorage(url: string): Promise<void> {
  const parsed = parseSupabaseStorageUrl(url)
  if (!parsed) return

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path])
  if (error) {
    // Object may already be removed
    console.error('Supabase storage delete:', error.message)
  }
}
