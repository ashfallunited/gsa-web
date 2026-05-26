import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ORG_EMAIL, ORG_NAME } from '@/lib/constants'

type LegalSection = {
  readonly id: string
  readonly title: string
  readonly paragraphs: readonly string[]
  readonly listItems?: readonly string[]
}

type LegalPageProps = {
  readonly title: string
  readonly subtitle: string
  readonly lastUpdated: string
  readonly sections: readonly LegalSection[]
}

export default function LegalPage({ title, subtitle, lastUpdated, sections }: LegalPageProps) {
  return (
    <>
      <Navbar />
      <main className="pt-16 lg:pt-[70px]">
        <div className="bg-[#01255f] py-12 sm:py-16">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-10">
            <span className="label-light">Legal</span>
            <h1
              className="text-3xl sm:text-4xl font-black text-white mt-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {title}
            </h1>
            <p className="text-white/60 text-sm sm:text-base mt-3">{subtitle}</p>
            <p className="text-white/40 text-xs mt-4">Last updated: {lastUpdated}</p>
          </div>
        </div>

        <article className="bg-[#f5f7fc] py-12 sm:py-16">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-10 legal-content">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="mb-10 last:mb-0">
                <h2
                  className="text-lg sm:text-xl font-bold text-[#01255f] mb-4"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {section.title}
                </h2>
                <div className="space-y-4 text-[#5a6478] text-sm sm:text-base leading-relaxed">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                  ))}
                  {section.listItems && section.listItems.length > 0 && (
                    <ul className="list-disc pl-5 space-y-2">
                      {section.listItems.map((item) => (
                        <li key={item.slice(0, 48)}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}

            <p className="mt-12 pt-8 border-t border-gray-200 text-sm text-[#5a6478]">
              Questions about this policy? Contact{' '}
              <a href={`mailto:${ORG_EMAIL}`} className="text-[#01255f] font-semibold hover:underline">
                {ORG_EMAIL}
              </a>
              . {ORG_NAME} is based in Monrovia, Liberia.
            </p>

            <p className="mt-6 text-sm">
              <Link href="/" className="text-[#01255f] font-semibold hover:underline">
                ← Back to home
              </Link>
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
