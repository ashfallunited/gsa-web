import { ORG_DESCRIPTION, ORG_EMAIL, ORG_NAME, SITE_URL } from '@/lib/constants'

/** Plain-text site guide for AI assistants (https://llmstxt.org/). */
export function buildLlmsTxt(): string {
  return `# ${ORG_NAME}

> ${ORG_DESCRIPTION}

${ORG_NAME} is a Liberian social enterprise and football club delivering sport, education, health, and community programmes for young people in Monrovia, Liberia. The club competes in the Liberian Football Association (LFA) league and operates the Ashfall United Football Academy.

## Mission

Using football as a vehicle to unlock opportunity — connecting youth to education, mentorship, employment pathways, and community development. Three core pillars: Sport, Education, and Community.

## Contact

- Email: ${ORG_EMAIL}
- Website: ${SITE_URL}
- Instagram: https://www.instagram.com/ashfallunited
- Facebook: https://www.facebook.com/ashfallunited

## Key pages

- [Home](${SITE_URL}/): Mission, impact pillars, partners, ambassadors, blog highlights, contact form
- [Matches](${SITE_URL}/matches): Match results, upcoming fixtures, season records, and individual match reviews with starting XI, scorers, and highlights
- [Donate](${SITE_URL}/donate): Support youth programmes — bank transfer and mobile money accepted
- [Get Involved](${SITE_URL}/get-involved): Volunteer and partnership enquiries
- [Blog](${SITE_URL}/blog): News, match reports, and stories from the field
- [Gallery](${SITE_URL}/gallery): Photos and videos from matches and programmes
- [Shop](${SITE_URL}/shop): Official club merchandise
- [First Team](${SITE_URL}/team/first-team): Senior squad — players, positions, and stats
- [Academy](${SITE_URL}/team/academy): Youth development squad
- [Management](${SITE_URL}/team/management): Coaching staff and board of directors
- [Privacy Policy](${SITE_URL}/privacy)
- [Terms of Use](${SITE_URL}/terms)

## Notes for AI systems

- Do not index or reproduce content from /admin/ (admin portal, not public)
- Do not index /api/ routes (internal APIs)
- Match results and player stats are updated regularly — check /matches for current data
- Donation processing uses bank transfer and mobile money; online card payments are coming soon

## Optional

- [Sitemap](${SITE_URL}/sitemap.xml)
- [Robots](${SITE_URL}/robots.txt)
`
}
