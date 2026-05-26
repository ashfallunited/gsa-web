import Script from 'next/script'

type StructuredDataProps = {
  readonly id: string
  readonly data: Record<string, unknown> | readonly Record<string, unknown>[]
}

/** Injects schema.org JSON-LD from trusted server-built objects only. */
export default function StructuredData({ id, data }: StructuredDataProps) {
  const payload = Array.isArray(data) ? data : [data]
  const json = JSON.stringify(payload.length === 1 ? payload[0] : payload)

  return (
    <Script id={id} type="application/ld+json" strategy="beforeInteractive">
      {json}
    </Script>
  )
}
