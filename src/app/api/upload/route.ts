import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { ALLOWED_UPLOAD_BUCKETS } from '@/lib/constants'
import { uploadToSupabaseStorage } from '@/lib/storage-server'

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

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  try {
    const url = await uploadToSupabaseStorage(bucket, path, bytes, file.type)
    return Response.json({ url })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed'
    return Response.json({ error: message }, { status: 400 })
  }
}
