import { NextRequest } from 'next/server'
import sharp from 'sharp'
import { requireAdmin } from '@/lib/admin-auth'
import { ALLOWED_UPLOAD_BUCKETS, MAX_UPLOAD_BYTES } from '@/lib/constants'
import { uploadToSupabaseStorage } from '@/lib/storage-server'

const MAX_IMAGE_DIMENSION = 2400
const WEBP_QUALITY = 84
const JPEG_QUALITY = 86
const PNG_QUALITY = 90

function canOptimizeImage(mimeType: string): boolean {
  if (!mimeType.startsWith('image/')) return false
  if (mimeType === 'image/svg+xml') return false
  if (mimeType === 'image/gif') return false
  return true
}

async function optimizeImageUpload(
  input: Buffer,
  mimeType: string
): Promise<{ bytes: Buffer; outputMimeType: string; ext: string }> {
  if (!canOptimizeImage(mimeType)) {
    return { bytes: input, outputMimeType: mimeType, ext: mimeType.split('/')[1] ?? 'jpg' }
  }

  const pipeline = sharp(input, { failOn: 'none' })
    .rotate()
    .resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })

  if (mimeType === 'image/png') {
    const bytes = await pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9 }).toBuffer()
    return { bytes, outputMimeType: 'image/png', ext: 'png' }
  }

  if (mimeType === 'image/webp') {
    const bytes = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer()
    return { bytes, outputMimeType: 'image/webp', ext: 'webp' }
  }

  const bytes = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer()
  return { bytes, outputMimeType: 'image/jpeg', ext: 'jpg' }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const form = await req.formData()
  const file = form.get('file') as File | null
  const bucket = (form.get('bucket') as string) || 'blog-images'
  const folder = (form.get('folder') as string) || 'uploads'

  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_UPLOAD_BUCKETS.includes(bucket as (typeof ALLOWED_UPLOAD_BUCKETS)[number])) {
    return Response.json({ error: 'Invalid bucket' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: `File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)` }, { status: 413 })
  }

  const rawBytes = Buffer.from(await file.arrayBuffer())

  try {
    const optimized = await optimizeImageUpload(rawBytes, file.type)
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${optimized.ext}`
    const url = await uploadToSupabaseStorage(bucket, path, optimized.bytes, optimized.outputMimeType)
    return Response.json({ url })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
