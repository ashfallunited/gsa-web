import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/admin-auth'
import { getAdminDb } from '@/lib/firebase-admin'
import type { Donation, DonationStatus, PaymentMethod } from '@/types/donation'

const DONATIONS_COLLECTION = 'donations'

interface DailyTotal {
  date: string
  amount: number
}

interface TopCountry {
  country: string
  count: number
}

interface ByPaymentMethod {
  card: { count: number; total: number }
  mobile: { count: number; total: number }
}

interface ByStatus {
  completed: number
  awaiting_payment: number
  processing: number
  failed: number
}

interface ChartData {
  dailyTotals: DailyTotal[]
  topCountries: TopCountry[]
}

interface AnalyticsResponse {
  totalRaised: number
  donorCount: number
  averageDonation: number
  completionRate: string
  byPaymentMethod: ByPaymentMethod
  byStatus: ByStatus
  chartData: ChartData
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify admin auth
  const denied = await requireAdmin(req)
  if (denied) return denied as NextResponse

  try {
    const db = getAdminDb()

    // Get all donations
    const snapshot = await db.collection(DONATIONS_COLLECTION).get()

    if (snapshot.empty) {
      return NextResponse.json({
        totalRaised: 0,
        donorCount: 0,
        averageDonation: 0,
        completionRate: '0%',
        byPaymentMethod: {
          card: { count: 0, total: 0 },
          mobile: { count: 0, total: 0 },
        },
        byStatus: {
          completed: 0,
          awaiting_payment: 0,
          processing: 0,
          failed: 0,
        },
        chartData: {
          dailyTotals: [],
          topCountries: [],
        },
      } as AnalyticsResponse)
    }

    const donations: Donation[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      donations.push({
        id: doc.id,
        donorId: data.donorId || `${data.email}-${data.referenceId}`,
        amountUsd: data.amountUsd,
        currency: data.currency || 'USD',
        feeUsd: data.feeUsd,
        totalUsd: data.totalUsd,
        paymentMethod: data.paymentMethod,
        coverFees: data.coverFees,
        message: data.message || null,
        referenceId: data.referenceId,
        status: data.status,
        dollrStatus: data.dollrStatus,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        completedAt: data.completedAt,
        emailSent: data.emailSent,
        notes: data.notes || null,
        retryAttempts: data.retryAttempts,
        nextRetryAt: data.nextRetryAt,
      } as Donation)
    })

    // Calculate metrics
    const completedDonations = donations.filter((d) => d.status === 'completed')
    const totalRaised = completedDonations.reduce((sum, d) => sum + d.totalUsd, 0)

    // Unique donor count (based on completed donations for now)
    const donorCount = completedDonations.length

    // Average donation
    const averageDonation = donorCount > 0 ? totalRaised / donorCount : 0

    // Completion rate
    const totalDonations = donations.length
    const completedCount = completedDonations.length
    const completionRate = totalDonations > 0 ? `${Math.round((completedCount / totalDonations) * 100)}%` : '0%'

    // By payment method
    const byPaymentMethod: ByPaymentMethod = {
      card: { count: 0, total: 0 },
      mobile: { count: 0, total: 0 },
    }

    completedDonations.forEach((d) => {
      const method = d.paymentMethod as PaymentMethod
      byPaymentMethod[method].count += 1
      byPaymentMethod[method].total += d.totalUsd
    })

    // By status
    const byStatus: ByStatus = {
      completed: 0,
      awaiting_payment: 0,
      processing: 0,
      failed: 0,
    }

    donations.forEach((d) => {
      const status = d.status as DonationStatus
      byStatus[status] += 1
    })

    // Daily totals (completed donations only)
    const dailyMap = new Map<string, number>()
    completedDonations.forEach((d) => {
      const date = (d.createdAt as Timestamp).toDate()
      const dateStr = date.toISOString().split('T')[0]
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + d.totalUsd)
    })

    const dailyTotals: DailyTotal[] = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top countries (completed donations only)
    // TODO: Fetch donor data to get country information
    const topCountries: TopCountry[] = []

    return NextResponse.json({
      totalRaised: Math.round(totalRaised * 100) / 100,
      donorCount,
      averageDonation: Math.round(averageDonation * 100) / 100,
      completionRate,
      byPaymentMethod,
      byStatus,
      chartData: {
        dailyTotals,
        topCountries,
      },
    } as unknown as AnalyticsResponse)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
