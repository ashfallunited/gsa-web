import LegalPage from '@/components/LegalPage'
import { ORG_NAME } from '@/lib/constants'
import { buildPageMetadata } from '@/lib/seo'

const LAST_UPDATED = '26 May 2026'

export const metadata = buildPageMetadata({
  title: 'Terms of Use',
  description: `Terms and conditions for using the ${ORG_NAME} website, donations, and club shop.`,
  path: '/terms',
})

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of terms',
    paragraphs: [
      `These Terms of Use ("Terms") govern your access to and use of the website operated by ${ORG_NAME} at ashfallunited.com. By accessing or using the site, you agree to these Terms. If you do not agree, do not use the site.`,
    ],
  },
  {
    id: 'about',
    title: '2. About our organisation',
    paragraphs: [
      `${ORG_NAME} is a football club and youth development organisation based in Monrovia, Liberia. Content on this site describes our programmes, team, partners, and ways to support our work. Information is provided for general purposes and may change without notice.`,
    ],
  },
  {
    id: 'use-of-site',
    title: '3. Permitted use',
    paragraphs: ['You may use this website for lawful, personal, and non-commercial purposes, including to:'],
    listItems: [
      'Learn about our programmes and contact us.',
      'Donate, volunteer, explore partnerships, shop for merchandise, or subscribe to updates where offered.',
      'Share links to our pages in a way that accurately represents our organisation.',
    ],
  },
  {
    id: 'prohibited',
    title: '4. Prohibited conduct',
    paragraphs: ['You must not:'],
    listItems: [
      'Use the site in any way that violates applicable law or harms others.',
      'Attempt to gain unauthorised access to our systems, admin areas, or user data.',
      'Upload malware, scrape the site excessively, or interfere with its operation.',
      'Misrepresent your identity or affiliation with Asfall United.',
      'Copy, reproduce, or exploit site content for commercial purposes without our written permission.',
    ],
  },
  {
    id: 'donations-shop',
    title: '5. Donations and shop',
    paragraphs: [
      'Donations support our charitable programmes. Unless otherwise stated, donations are final once confirmed according to the instructions shown at checkout. Merchandise orders are subject to availability; we will communicate about fulfilment, pricing, and payment separately where applicable.',
      'We strive to display accurate product and programme information but do not warrant that all descriptions are error-free.',
    ],
  },
  {
    id: 'intellectual-property',
    title: '6. Intellectual property',
    paragraphs: [
      'Text, logos, images, videos, and other materials on this site are owned by Asfall United or used with permission. You may not use our branding or content without prior written consent, except for fair sharing of links or social posts that credit the organisation.',
    ],
  },
  {
    id: 'third-party',
    title: '7. Third-party links',
    paragraphs: [
      'Our site may link to external websites (for example social networks or partner sites). We are not responsible for their content or privacy practices. Review their terms and policies before using them.',
    ],
  },
  {
    id: 'disclaimer',
    title: '8. Disclaimer',
    paragraphs: [
      'The site and its content are provided "as is" without warranties of any kind, express or implied. We do not guarantee uninterrupted or error-free access. Programme outcomes described on the site reflect our mission and reports but are not guarantees of future results.',
    ],
  },
  {
    id: 'liability',
    title: '9. Limitation of liability',
    paragraphs: [
      'To the fullest extent permitted by law, Asfall United and its directors, staff, and volunteers shall not be liable for any indirect, incidental, or consequential damages arising from your use of the site. Our total liability for any claim related to the site shall not exceed the amount you paid us through the site in the twelve months before the claim, or zero if no payment was made.',
    ],
  },
  {
    id: 'indemnity',
    title: '10. Indemnity',
    paragraphs: [
      'You agree to indemnify and hold harmless Asfall United from claims arising out of your misuse of the site or violation of these Terms.',
    ],
  },
  {
    id: 'governing-law',
    title: '11. Governing law',
    paragraphs: [
      'These Terms are governed by the laws of the Republic of Liberia, without regard to conflict-of-law principles. Disputes shall be subject to the courts of Liberia where permitted by law.',
    ],
  },
  {
    id: 'changes',
    title: '12. Changes',
    paragraphs: [
      'We may revise these Terms at any time. The "Last updated" date will reflect changes. Your continued use of the site constitutes acceptance of the revised Terms.',
    ],
  },
] as const

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      subtitle={`Rules for using the ${ORG_NAME} website, donations, and club shop.`}
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  )
}
