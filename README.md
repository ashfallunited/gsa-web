# Asfall United Web

Next.js site for **Asfall United** — football and youth development in Monrovia, Liberia.

## Features

- Public pages: home, team, shop, gallery (photos + YouTube), blog, donate (UI flow), get involved (volunteer/partnership)
- Admin portal: content, shop, gallery, contacts, inquiries, newsletter
- Firebase Firestore for app data; Supabase Storage for images
- Cached data reads with tag-based revalidation

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase (storage), Firebase Admin (Firestore), admin auth, and optional branding overrides (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ORG_EMAIL`, etc.).
2. Install dependencies: `npm install`
3. Run dev: `npm run dev`

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint
