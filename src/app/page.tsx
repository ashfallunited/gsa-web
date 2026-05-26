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
export default function Home() {
  return (
    <>
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
