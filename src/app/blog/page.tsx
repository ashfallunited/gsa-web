import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getPublishedBlogPosts } from '@/lib/data/blog'
import { loadPublicData } from '@/lib/public-data'
import StructuredData from '@/components/StructuredData'
import { buildBlogIndexJsonLd, buildPageMetadata, SEO_KEYWORDS } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Blog & News',
  description:
    'Stories, updates, and insights from Asfall United — youth football, education, and community programmes in Monrovia, Liberia.',
  path: '/blog',
  openGraphTitle: 'Blog & News | Ashfall United',
  keywords: SEO_KEYWORDS.blog,
})

function formatDate(ts: { seconds: number } | null | undefined) {
  if (!ts?.seconds) return ''
  return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function BlogPage() {
  const posts = await loadPublicData('blog-posts', () => getPublishedBlogPosts(), [])

  return (
    <>
      <StructuredData id="blog-index-jsonld" data={buildBlogIndexJsonLd()} />
      <Navbar />
      <main className="pt-16 lg:pt-[70px]">
        <div className="bg-[#01255f] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
            <span className="label-light">News & Stories</span>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mt-4 mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Latest from Asfall United
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-lg">
              Updates from our programmes, community, and the young people we serve.
            </p>
          </div>
        </div>

        <div className="bg-[#f5f7fc] py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
            {posts.length === 0 ? (
              <p className="text-center text-[#5a6478] text-sm py-12">No posts published yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group bg-white border border-gray-100 hover:border-[#01255f]/20 transition-colors"
                  >
                    <div className="relative h-48 overflow-hidden bg-gray-100">
                      {post.featuredImage ? (
                        <Image
                          src={post.featuredImage}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      ) : null}
                    </div>
                    <div className="p-6">
                      <p className="text-[10px] text-gray-400 mb-2">
                        {formatDate(post.publishedAt ?? post.createdAt)}
                      </p>
                      <h2
                        className="font-bold text-[#01255f] text-base leading-snug group-hover:underline"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {post.title}
                      </h2>
                      <p className="text-[#5a6478] text-sm mt-2 line-clamp-2">{post.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
