import Image from 'next/image'
import Link from 'next/link'
import { getPublishedBlogPosts, type BlogPost } from '@/lib/data/blog'
import { loadPublicData } from '@/lib/public-data'
import { IMAGE_PLACEHOLDER } from '@/lib/constants'

function formatTimeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts?.seconds) return ''
  const diffMs = Date.now() - ts.seconds * 1000
  const days = Math.floor(diffMs / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return '1 week ago'
  if (weeks < 5) return `${weeks} weeks ago`
  const months = Math.floor(days / 30)
  if (months <= 1) return '1 month ago'
  return `${months} months ago`
}

function postCategory(post: BlogPost): string {
  const tag = post.tags?.[0]?.trim()
  return tag ? tag.toLowerCase() : 'club news'
}

function NewsCard({
  post,
  featured = false,
  className = '',
}: {
  post: BlogPost
  featured?: boolean
  className?: string
}) {
  const timestamp = post.publishedAt ?? post.createdAt
  const imageSrc = post.featuredImage?.trim() || IMAGE_PLACEHOLDER

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group relative block w-full overflow-hidden rounded-lg bg-[#01255f] ${
        featured
          ? 'aspect-[16/10] sm:aspect-[16/9]'
          : 'aspect-[4/3] sm:aspect-[5/4]'
      } ${className}`}
    >
      <Image
        src={imageSrc}
        alt={post.title}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes={
          featured
            ? '(max-width: 1024px) 100vw, 40vw'
            : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
        }
      />

      <div
        className="absolute inset-0 bg-gradient-to-t from-[#011840]/95 via-[#01255f]/50 to-[#01255f]/20"
        aria-hidden
      />

      <div className="absolute inset-0 flex flex-col justify-end p-3.5 sm:p-5">
        <p className="text-[10px] sm:text-[11px] text-white/75 lowercase tracking-wide mb-1.5 sm:mb-2 line-clamp-1">
          {postCategory(post)}
          <span className="mx-1.5 opacity-60">•</span>
          {formatTimeAgo(timestamp)}
        </p>
        <h3
          className={`font-bold text-white leading-snug line-clamp-3 ${
            featured ? 'text-base sm:text-xl lg:text-2xl' : 'text-sm sm:text-base lg:text-lg'
          }`}
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {post.title}
        </h3>
      </div>
    </Link>
  )
}

type GridSlots = {
  featured: BlogPost
  topLeft?: BlogPost
  bottomLeft?: BlogPost
  topRight?: BlogPost
  bottomRight?: BlogPost
}

function buildSlots(posts: BlogPost[]): GridSlots | null {
  if (posts.length === 0) return null
  return {
    featured: posts[0],
    topLeft: posts[1],
    bottomLeft: posts[2],
    topRight: posts[3],
    bottomRight: posts[4],
  }
}

export default async function BlogSection() {
  const posts = await loadPublicData('home-blog', () => getPublishedBlogPosts(5), [])
  const slots = buildSlots(posts)
  if (!slots) return null

  const secondaryPosts = [slots.topLeft, slots.bottomLeft, slots.topRight, slots.bottomRight].filter(
    (p): p is BlogPost => Boolean(p)
  )

  return (
    <section id="blog" className="py-16 sm:py-24 lg:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-10">
          <div className="min-w-0">
            <span className="label">Latest News</span>
            <h2
              className="heading-underline text-2xl sm:text-3xl lg:text-[2.4rem] font-bold text-[#01255f] leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Stories from the Field
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-xs font-bold text-[#01255f] uppercase tracking-widest hover:underline shrink-0 self-start sm:self-auto min-h-0 min-w-0"
          >
            All Posts →
          </Link>
        </div>

        {/* Mobile & tablet: featured + single column (readable on narrow screens) */}
        <div className="flex flex-col gap-3 md:gap-4 lg:hidden">
          <NewsCard post={slots.featured} featured />
          {secondaryPosts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {secondaryPosts.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Desktop: bento — side stacks + tall center */}
        <div className="hidden lg:grid lg:grid-cols-3 lg:grid-rows-2 gap-3 lg:min-h-[520px] lg:h-[560px]">
          {slots.topLeft && (
            <NewsCard post={slots.topLeft} className="lg:col-start-1 lg:row-start-1 !aspect-auto min-h-0 h-full" />
          )}
          {slots.bottomLeft && (
            <NewsCard post={slots.bottomLeft} className="lg:col-start-1 lg:row-start-2 !aspect-auto min-h-0 h-full" />
          )}
          <NewsCard
            post={slots.featured}
            featured
            className="lg:col-start-2 lg:row-start-1 lg:row-span-2 !aspect-auto min-h-0 h-full"
          />
          {slots.topRight && (
            <NewsCard post={slots.topRight} className="lg:col-start-3 lg:row-start-1 !aspect-auto min-h-0 h-full" />
          )}
          {slots.bottomRight && (
            <NewsCard post={slots.bottomRight} className="lg:col-start-3 lg:row-start-2 !aspect-auto min-h-0 h-full" />
          )}
        </div>
      </div>
    </section>
  )
}
