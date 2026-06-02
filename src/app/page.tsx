export const revalidate = 300

import Navbar from '@/components/Navbar'
import HomeHashScroll from '@/components/HomeHashScroll'
import Hero from '@/components/Hero'
import About from '@/components/About'
import ThreePillars from '@/components/ThreePillars'
import Partners from '@/components/Partners'
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
        <BlogSection />
        <Partners />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
