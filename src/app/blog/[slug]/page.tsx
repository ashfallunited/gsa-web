import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getBlogPostBySlug } from '@/lib/data/blog'
import { SITE_OG_IMAGE } from '@/lib/constants'
import StructuredData from '@/components/StructuredData'
import { buildBlogPostingJsonLd, buildPageMetadata, normalizePageTitle } from '@/lib/seo'

function formatDate(ts: { seconds: number } | null | undefined) {
  if (!ts?.seconds) return ''
  return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug).catch(() => null)
  if (!post) return { title: 'Post Not Found' }

  const title = normalizePageTitle(post.seoTitle || post.title)
  const description = post.seoDescription || post.excerpt

  return buildPageMetadata({
    title,
    description,
    path: `/blog/${slug}`,
    openGraphType: 'article',
    openGraphTitle: `${title} | Ashfall United`,
    image: post.featuredImage
      ? { url: post.featuredImage, alt: post.title }
      : { url: SITE_OG_IMAGE, alt: post.title },
  })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug).catch(() => null)
  if (!post) notFound()

  return (
    <>
      <StructuredData id={`article-jsonld-${post.slug}`} data={buildBlogPostingJsonLd(post)} />
      <Navbar />
      <main className="pt-16 lg:pt-[70px]">
        <article>
          {post.featuredImage && (
            <div className="relative h-56 sm:h-72 lg:h-96 bg-[#01255f]">
              <Image src={post.featuredImage} alt={post.title} fill className="object-cover opacity-90" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-[#01255f] to-transparent" />
            </div>
          )}

          <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
            <Link href="/blog" className="text-xs font-bold text-[#5a6478] uppercase tracking-widest hover:text-[#01255f]">
              ← All posts
            </Link>

            {post.tags?.[0] && (
              <span className="block mt-6 text-[9px] uppercase tracking-widest font-bold text-[#fee11b] bg-[#01255f] px-2 py-0.5 w-fit">
                {post.tags[0]}
              </span>
            )}

            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#01255f] mt-4 mb-3 leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {post.title}
            </h1>

            <p className="text-sm text-[#5a6478] mb-8">
              {post.author && <span>{post.author} · </span>}
              {formatDate(post.publishedAt ?? post.createdAt)}
            </p>

            <div
              className="blog-content text-sm sm:text-base max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
