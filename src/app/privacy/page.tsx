import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { ORG_NAME } from '@/lib/constants'

const LAST_UPDATED = '26 May 2026'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${ORG_NAME} collects, uses, and protects your personal information.`,
}

const sections = [
  {
    id: 'introduction',
    title: '1. Introduction',
    paragraphs: [
      `${ORG_NAME} ("we", "us", "our") respects your privacy. This Privacy Policy explains what information we collect when you use our website at ashfallunited.com, how we use it, and the choices you have.`,
      'By using our site, contacting us, donating, shopping, subscribing to our newsletter, or submitting a form, you agree to this policy. If you do not agree, please do not use the site.',
    ],
  },
  {
    id: 'information-we-collect',
    title: '2. Information we collect',
    paragraphs: ['We may collect the following types of information:'],
    listItems: [
      'Contact details you provide (name, email, phone number, message content) when you use our contact, volunteer, partnership, or inquiry forms.',
      'Donation-related information you choose to submit (such as name, email, phone, amount, and payment reference details) when you use our donate flow.',
      'Newsletter email addresses when you subscribe.',
      'Shop order details (name, contact information, items ordered) when you place an order through our club shop.',
      'Technical data such as IP address, browser type, device information, and pages visited, collected automatically through standard web server and analytics tools.',
      'Cookies and similar technologies used for site functionality and performance (see section 6).',
    ],
  },
  {
    id: 'how-we-use',
    title: '3. How we use your information',
    paragraphs: ['We use personal information to:'],
    listItems: [
      'Respond to enquiries and process volunteer or partnership requests.',
      'Process donations and shop orders and communicate about them.',
      'Send newsletters and programme updates where you have opted in.',
      'Operate, secure, and improve our website and services.',
      'Comply with legal obligations and protect our rights.',
    ],
  },
  {
    id: 'sharing',
    title: '4. Sharing your information',
    paragraphs: [
      'We do not sell your personal information. We may share data with trusted service providers who help us run the website (for example hosting, email delivery, payment processing, or database services), only as needed to perform their work and under appropriate safeguards.',
      'We may disclose information if required by law, court order, or to protect the safety of our users, staff, or the public.',
    ],
  },
  {
    id: 'retention',
    title: '5. Data retention',
    paragraphs: [
      'We keep personal information only for as long as necessary for the purposes described in this policy, unless a longer retention period is required by law. Enquiry and donation records may be retained for administrative, accounting, or legal purposes.',
    ],
  },
  {
    id: 'cookies',
    title: '6. Cookies',
    paragraphs: [
      'Our website may use essential cookies required for security and basic functionality. We may also use analytics or performance tools that collect aggregated usage data. You can control cookies through your browser settings; disabling cookies may affect some site features.',
    ],
  },
  {
    id: 'security',
    title: '7. Security',
    paragraphs: [
      'We take reasonable technical and organisational measures to protect your information. No method of transmission over the internet is completely secure; we cannot guarantee absolute security.',
    ],
  },
  {
    id: 'your-rights',
    title: '8. Your rights',
    paragraphs: [
      'Depending on where you live, you may have rights to access, correct, delete, or restrict use of your personal information, or to object to certain processing. To exercise these rights, contact us using the email below. We will respond within a reasonable time.',
    ],
  },
  {
    id: 'children',
    title: '9. Children',
    paragraphs: [
      'Our programmes serve young people, but this website is not directed at children under 13 to collect personal information without parental involvement. If you believe a child has provided us personal data without appropriate consent, please contact us so we can remove it.',
    ],
  },
  {
    id: 'changes',
    title: '10. Changes to this policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. The "Last updated" date at the top will change when we do. Continued use of the site after changes means you accept the updated policy.',
    ],
  },
] as const

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle={`How ${ORG_NAME} handles your personal information on our website and programmes.`}
      lastUpdated={LAST_UPDATED}
      sections={sections}
    />
  )
}
