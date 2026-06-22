import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { serializeFirestoreData } from '@/lib/serialize-firestore'
import type { Donation, DonationStatus, PaymentMethod } from '@/types/donation'

const DONATIONS_COLLECTION = 'donations'

interface ListQueryParams {
  status?: DonationStatus
  paymentMethod?: PaymentMethod
  dateFrom?: string
  dateTo?: string
  limit: number
  offset: number
}

function parseQueryParams(req: NextRequest): ListQueryParams {
  const { searchParams } = new URL(req.url)

  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

  const statusParam = searchParams.get('status')
  const paymentMethodParam = searchParams.get('paymentMethod')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const status = statusParam ? (statusParam as DonationStatus) : undefined
  const paymentMethod = paymentMethodParam ? (paymentMethodParam as PaymentMethod) : undefined

  return {
    status,
    paymentMethod,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit,
    offset,
  }
}

function validateDateFormat(dateString: string | null | undefined): boolean {
  if (!dateString) return true
  // ISO 8601 format validation: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/.test(dateString)
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify admin auth
  const denied = await requireAdmin(req)
  if (denied) return denied as NextResponse

  try {
    const params = parseQueryParams(req)

    // Validate date formats
    if (!validateDateFormat(params.dateFrom) || !validateDateFormat(params.dateTo)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)' },
        { status: 400 }
      )
    }

    // Validate status and paymentMethod values
    const validStatuses = ['pending', 'processing', 'completed', 'failed']
    const validPaymentMethods = ['card', 'mobile']

    if (params.status && !validStatuses.includes(params.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: pending, processing, completed, failed' },
        { status: 400 }
      )
    }

    if (params.paymentMethod && !validPaymentMethods.includes(params.paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid paymentMethod. Must be one of: card, mobile' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    let query = db.collection(DONATIONS_COLLECTION)

    // Apply filters
    if (params.status) {
      query = query.where('status', '==', params.status)
    }

    if (params.paymentMethod) {
      query = query.where('paymentMethod', '==', params.paymentMethod)
    }

    if (params.dateFrom) {
      const dateFromObj = new Date(params.dateFrom)
      query = query.where('createdAt', '>=', Timestamp.fromDate(dateFromObj))
    }

    if (params.dateTo) {
      const dateToObj = new Date(params.dateTo)
      // Set to end of day if only date provided
      if (!params.dateTo.includes('T')) {
        dateToObj.setHours(23, 59, 59, 999)
      }
      query = query.where('createdAt', '<=', Timestamp.fromDate(dateToObj))
    }

    // Get total count with filters
    const countSnapshot = await query.count().get()
    const total = countSnapshot.data().count

    // Apply pagination and ordering
    const snapshot = await query.orderBy('createdAt', 'desc').offset(params.offset).limit(params.limit).get()

    const donations: unknown[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      donations.push({
        id: doc.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        country: data.country,
        amountUsd: data.amountUsd,
        paymentMethod: data.paymentMethod,
        status: data.status,
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : null,
        completedAt: data.completedAt ? (data.completedAt as Timestamp).toDate().toISOString() : null,
      })
    })

    return NextResponse.json({
      data: donations,
      total,
      limit: params.limit,
      offset: params.offset,
    })
  } catch (error) {
    console.error('Error fetching donations:', error)
    return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 })
  }
}
