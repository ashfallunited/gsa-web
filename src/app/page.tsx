import Navbar from '@/components/Navbar'
import HomeHashScroll from '@/components/HomeHashScroll'
import Hero from '@/components/Hero'
import About from '@/components/About'
import ThreePillars from '@/components/ThreePillars'
import ImpactMetrics from '@/components/ImpactMetrics'
import Partners from '@/components/Partners'
import LiberiaSection from '@/components/LiberiaSection'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'
import BlogSection from '@/components/BlogSection'
import { ORG_DESCRIPTION, ORG_EMAIL, ORG_INSTAGRAM, ORG_NAME, SITE_URL } from '@/lib/constants'

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsTeam',
  name: ORG_NAME,
  sport: 'Soccer',
  url: SITE_URL,
  logo: `${SITE_URL}/Logo.png`,
  description: ORG_DESCRIPTION,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Monrovia',
    addressCountry: 'LR',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: ORG_EMAIL,
    contactType: 'General Enquiry',
  },
  sameAs: [ORG_INSTAGRAM],
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      <Navbar />
      <HomeHashScroll />
      <main>
        <Hero />
        <About />
        <ThreePillars />
        <ImpactMetrics />
        <Partners />
        <LiberiaSection />
        <BlogSection />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
