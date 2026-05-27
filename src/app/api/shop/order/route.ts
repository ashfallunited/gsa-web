import { NextRequest } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase-admin'
import { shopOrderSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = shopOrderSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data
  const hasMissingSize = data.items.some((item) => item.size === '')
  if (hasMissingSize) {
    return Response.json(
      { error: 'Please select a size for all apparel items before checkout.' },
      { status: 400 }
    )
  }

  const total = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const ref = await getAdminDb().collection('orders').add({
    customerName: data.customerName,
    email: data.email,
    phone: data.phone ?? '',
    whatsapp: data.whatsapp ?? '',
    address: data.address ?? '',
    notes: data.notes ?? '',
    contactMethods: data.contactMethods ?? [],
    items: data.items,
    total,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  })

  return Response.json({ orderId: ref.id }, { status: 201 })
}
