import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import type { DonationStatus, PaymentMethod } from '@/types/donation'

const DONATIONS_COLLECTION = 'donations'

interface ExportQueryParams {
  status?: DonationStatus
  paymentMethod?: PaymentMethod
  dateFrom?: string
  dateTo?: string
}

function parseQueryParams(req: NextRequest): ExportQueryParams {
  const { searchParams } = new URL(req.url)

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
  }
}

function validateDateFormat(dateString: string | null | undefined): boolean {
  if (!dateString) return true
  // ISO 8601 format validation: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/.test(dateString)
}

function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  const stringValue = String(value)
  // Escape quotes and wrap in quotes if contains comma, newline, or quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
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
    let query: any = db.collection(DONATIONS_COLLECTION)

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

    // Fetch all matching records
    const snapshot = await query.orderBy('createdAt', 'desc').get()

    // Build CSV
    const csvHeader =
      'id,first_name,last_name,email,country,amount_usd,payment_method,status,created_at,completed_at\n'

    const csvRows = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      const createdAt = data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : ''
      const completedAt = data.completedAt ? (data.completedAt as Timestamp).toDate().toISOString() : ''

      return [
        escapeCSV(doc.id),
        escapeCSV(data.firstName),
        escapeCSV(data.lastName),
        escapeCSV(data.email),
        escapeCSV(data.country),
        escapeCSV(data.amountUsd),
        escapeCSV(data.paymentMethod),
        escapeCSV(data.status),
        escapeCSV(createdAt),
        escapeCSV(completedAt),
      ].join(',')
    })

    const csv = csvHeader + csvRows.join('\n')

    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0]
    const filename = `donations_${today}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting donations:', error)
    return NextResponse.json({ error: 'Failed to export donations' }, { status: 500 })
  }
}
