import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import DonateForm from '@/components/DonateForm'
import { DONATE_OG_IMAGE, ORG_NAME } from '@/lib/constants'
import { buildPageMetadata, SEO_KEYWORDS } from '@/lib/seo'

const DONATE_DESCRIPTION =
  'Support Asfall United. Your donation helps young people access football, education, and community programmes that create lasting opportunity.'

export const metadata: Metadata = buildPageMetadata({
  title: 'Donate',
  openGraphTitle: `Donate — Make an impact with ${ORG_NAME}`,
  description: DONATE_DESCRIPTION,
  path: '/donate',
  keywords: SEO_KEYWORDS.donate,
  image: {
    url: DONATE_OG_IMAGE,
    alt: `Donate to ${ORG_NAME} — support youth football and development in Monrovia, Liberia`,
  },
})

export default function DonatePage() {
  return (
    <>
      <Navbar />
      <main className="pt-16 lg:pt-[70px]">
        <div className="bg-[#01255f] py-10 sm:py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
            <span className="label-light">Support Asfall United</span>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-4 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Donate
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-2xl">
              Choose an amount, tell us who you are, and complete your gift. Online card processing is coming soon —
              bank transfer and mobile money are available today.
            </p>
          </div>
        </div>

        <div className="bg-[#f5f7fc] py-10 sm:py-14 lg:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 w-full min-w-0">
            <DonateForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
