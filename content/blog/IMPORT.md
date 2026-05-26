# Blog starter posts — import guide

Five SEO-ready posts live in this folder. Each has metadata in `manifest.json` and HTML body in a matching `.html` file.

## Option A: Publish via admin (no script)

1. Log in at `/admin/blog` → **New Post**.
2. Open `manifest.json` for the post’s title, excerpt, tags, and SEO fields.
3. Open the matching `.html` file, copy all HTML, paste into the rich-text **Content** editor (HTML mode / paste preserves tags).
4. Upload a **featured image** (programme photo recommended).
5. Set status to **Published** and save.
6. Repeat for all five posts (order below).

**Recommended publish order**

1. `who-is-ashfall-united-monrovia`
2. `sport-for-social-impact-liberia`
3. `youth-football-liberia-next-generation`
4. `inside-ashfall-academy-liberia`
5. `support-youth-football-liberia`

**Before publishing:** Delete or unpublish test posts (“Post testo”, etc.) in admin.

## Option B: Seed Firestore (requires `.env.local`)

From the project root, with `FIREBASE_SERVICE_ACCOUNT_KEY` set:

```bash
node scripts/seed-blog-posts.mjs
```

This creates published posts with correct slugs. Re-running skips slugs that already exist.

## After publishing

- Share each post on Instagram/Facebook with a link to `https://www.ashfallunited.com/blog/[slug]`
- In Google Search Console → URL inspection → Request indexing for each new URL
