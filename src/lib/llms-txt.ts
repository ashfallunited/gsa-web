import { ORG_DESCRIPTION, ORG_EMAIL, ORG_NAME, SITE_URL } from '@/lib/constants'

/** Plain-text site guide for AI assistants (https://llmstxt.org/). */
export function buildLlmsTxt(): string {
  return `# ${ORG_NAME}

> ${ORG_DESCRIPTION}

${ORG_NAME} is a football club and youth development organisation in Monrovia, Liberia. We deliver sport, education, health, and community programmes for young people.

## Contact

- Email: ${ORG_EMAIL}
- Website: ${SITE_URL}
- Instagram: https://www.instagram.com/ashfallunited
- Facebook: https://www.facebook.com/ashfallunited

## Key pages

- [Home](${SITE_URL}/): Mission, impact pillars, partners, ambassadors, blog highlights, contact
- [Donate](${SITE_URL}/donate): Support youth programmes
- [Get Involved](${SITE_URL}/get-involved): Volunteer and partnership enquiries
- [Blog](${SITE_URL}/blog): News and stories from the field
- [Gallery](${SITE_URL}/gallery): Photos and videos
- [Shop](${SITE_URL}/shop): Official merchandise
- [First Team](${SITE_URL}/team/first-team): Senior squad
- [Academy](${SITE_URL}/team/academy): Youth development
- [Management](${SITE_URL}/team/management): Staff and board
- [Privacy Policy](${SITE_URL}/privacy)
- [Terms of Use](${SITE_URL}/terms)

## Optional

- [Sitemap](${SITE_URL}/sitemap.xml)
- [Robots](${SITE_URL}/robots.txt)
`
}
