import { Suspense } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

async function verifyPaymentStatus({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const sourceId = params.source_id
  const sourceType = params.source_type

  // For HOSTED mode (card), verify the payment was completed
  if (sourceId && sourceType === 'ORDER') {
    try {
      const token = process.env.DOLLR_ACCESS_TOKEN
      if (!token) {
        return { verified: false, error: 'Payment verification unavailable' }
      }

      const response = await fetch(
        `https://api.heydollr.app/v1/status/source?source_type=ORDER&source_id=${sourceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) {
        return { verified: false, error: 'Payment verification failed' }
      }

      const data = await response.json()
      return { verified: data.status === 'PAID', status: data.status }
    } catch (error) {
      console.error('Payment verification error:', error)
      return { verified: false, error: 'Payment verification error' }
    }
  }

  return { verified: true } // Mobile money payments are verified server-side via cron
}

export default async function DonationSuccessPage(props: { searchParams: Promise<Record<string, string>> }) {
  const verification = await verifyPaymentStatus(props)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#01255f]/5 to-white flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600" strokeWidth={3} />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-[#01255f] mb-2">Thank You!</h1>
          {verification.verified ? (
            <>
              <p className="text-gray-600 leading-relaxed">
                Your donation has been received successfully. We've sent a confirmation email with payment details.
              </p>
              <p className="text-sm text-gray-500 mt-2">Your generosity means everything to us.</p>
            </>
          ) : (
            <>
              <p className="text-gray-600 leading-relaxed">
                Your donation is being processed. We'll send you a confirmation email shortly.
              </p>
              <p className="text-sm text-amber-600 mt-2">{verification.error || 'Status: ' + verification.status}</p>
            </>
          )}
        </div>

        <div className="pt-4 space-y-3">
          <Link
            href="/"
            className="block w-full bg-[#01255f] hover:bg-[#011840] text-white font-bold py-3 rounded transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/donate"
            className="block w-full border-2 border-[#01255f] text-[#01255f] hover:bg-[#01255f]/5 font-bold py-3 rounded transition-colors"
          >
            Make Another Donation
          </Link>
        </div>
      </div>
    </div>
  )
}
