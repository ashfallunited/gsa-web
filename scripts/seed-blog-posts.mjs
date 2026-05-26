/**
 * Seed starter blog posts from content/blog into Firestore.
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY in .env.local (same as the Next.js app).
 *
 * Usage: node scripts/seed-blog-posts.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const require = createRequire(import.meta.url)

function loadEnvLocal() {
  const envPath = join(root, '.env.local')
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

async function main() {
  loadEnvLocal()

  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!keyJson) {
    console.error('Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local')
    process.exit(1)
  }

  const admin = require('firebase-admin')
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(keyJson)),
    })
  }

  const db = admin.firestore()
  const blogDir = join(root, 'content/blog')
  const manifest = JSON.parse(readFileSync(join(blogDir, 'manifest.json'), 'utf8'))

  let created = 0
  let skipped = 0

  for (const entry of manifest) {
    const slug = entry.slug || slugify(entry.title)
    const existing = await db
      .collection('blog_posts')
      .where('slug', '==', slug)
      .limit(1)
      .get()

    if (!existing.empty) {
      console.log(`Skip (exists): ${slug}`)
      skipped += 1
      continue
    }

    const htmlPath = join(blogDir, `${slug}.html`)
    if (!existsSync(htmlPath)) {
      console.error(`Missing content file: ${htmlPath}`)
      process.exit(1)
    }

    const content = readFileSync(htmlPath, 'utf8')
    const now = admin.firestore.FieldValue.serverTimestamp()

    await db.collection('blog_posts').add({
      title: entry.title,
      slug,
      excerpt: entry.excerpt,
      content,
      author: entry.author ?? 'Ashfall United',
      tags: entry.tags ?? [],
      status: 'published',
      featuredImage: entry.featuredImage ?? '',
      seoTitle: entry.seoTitle ?? '',
      seoDescription: entry.seoDescription ?? '',
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    })

    console.log(`Created: ${slug}`)
    created += 1
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
