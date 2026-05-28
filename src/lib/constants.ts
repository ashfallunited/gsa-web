export const ORG_NAME = 'Ashfall United'

/** Homepage `<title>` and default Google / social preview headline. */
export const SITE_HOME_TITLE = 'Ashfall United | Sports for social Impact'

/** Inner pages: layout template renders `{segment} | Ashfall United` (e.g. Shop | Ashfall United). */
export const SITE_PAGE_TITLE_SUFFIX = 'Ashfall United'

export const SITE_URL = 'https://www.ashfallunited.com'

/** Google Analytics stream */
export const GA_MEASUREMENT_ID = 'G-QZ6073NJ1K'

export const ORG_EMAIL = 'ashfall@gayduosa.org'

export const ORG_INSTAGRAM =
  process.env.NEXT_PUBLIC_ORG_INSTAGRAM ?? 'https://www.instagram.com/ashfallunited'

export const ORG_FACEBOOK =
  process.env.NEXT_PUBLIC_ORG_FACEBOOK ?? 'https://www.facebook.com/ashfallunited'

export const ORG_INSTAGRAM_HANDLE =
  process.env.NEXT_PUBLIC_ORG_INSTAGRAM_HANDLE ?? '@asfallunited'

export const ORG_DESCRIPTION =
  'Ashfall United — football and youth development through sport, education, and community programmes.'

/** Default social preview image (1200×630+). Used site-wide and on /donate. */
export const SITE_OG_IMAGE =
  'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/gallery/1775475072579-6n88a265wr5.jpg'

/** @deprecated Use SITE_OG_IMAGE */
export const DONATE_OG_IMAGE = SITE_OG_IMAGE

/** Marketing assets on Supabase Storage (public `website_files` bucket). */
export const STATIC_ASSETS = {
  hero: 'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/PSA.jpg',
  placeholder:
    'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/Gemini_Generated_Image_ihgfo6ihgfo6ihgf.png',
  about: {
    rep: 'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/rep.jpg',
    psa3: 'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/PSA-3.jpg',
    psa1: 'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/PSA-1.jpg',
    development:
      'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/Development.jpg',
  },
  pillars: {
    impact11:
      'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/impact-11.jpg',
    impact4:
      'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/impact-4.jpg',
  },
  liberia: {
    wellbeing:
      'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/Wellbeing.jpg',
    psa: 'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/PSA.jpg',
    psa1: 'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/PSA-1.jpg',
    impact1:
      'https://fckzyvkbthqvmmjpvfxr.supabase.co/storage/v1/object/public/website_files/impact-1.jpg',
  },
} as const

export const IMAGE_PLACEHOLDER = STATIC_ASSETS.placeholder

/** Supabase Storage bucket names allowed for admin uploads. */
export const SUPABASE_STORAGE_BUCKETS = ['website_files', 'blog-images', 'team-images'] as const

export const ALLOWED_UPLOAD_BUCKETS: readonly string[] = SUPABASE_STORAGE_BUCKETS

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
