import { buildPageMetadata, SEO_KEYWORDS } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Get Involved',
  description:
    'Volunteer or partner with Asfall United. Submit an inquiry to support youth football, education, and community programmes in Monrovia, Liberia.',
  path: '/get-involved',
  keywords: SEO_KEYWORDS.involved,
})

export default function GetInvolvedLayout({ children }: { children: React.ReactNode }) {
  return children
}
