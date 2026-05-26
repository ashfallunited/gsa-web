import StructuredData from '@/components/StructuredData'
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from '@/lib/seo'

export default function GlobalJsonLd() {
  return (
    <StructuredData
      id="global-jsonld"
      data={[buildWebSiteJsonLd(), buildOrganizationJsonLd()]}
    />
  )
}
