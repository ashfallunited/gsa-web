import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { deleteFromSupabaseStorage } from '@/lib/storage-server'
import { revalidateGallery } from '@/lib/revalidate'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id } = await params
  const ref = getAdminDb().collection('gallery').doc(id)
  const snap = await ref.get()

  if (snap.exists) {
    const { imageUrl } = snap.data() as { imageUrl?: string }
    if (imageUrl) {
      await deleteFromSupabaseStorage(imageUrl)
    }
  }

  await ref.delete()
  revalidateGallery()
  return Response.json({ ok: true })
}
