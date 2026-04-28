# Technology Stack

**Analysis Date:** 2026-04-26

## Languages

**Primary:**
- TypeScript 5 - All source code in `src/` directory
- JSX/TSX - React component files

**Secondary:**
- SQL - Database migrations and schema in `supabase/migrations/`
- PostCSS - Styling pipeline

## Runtime

**Environment:**
- Node.js (version inferred from Next.js 16.2.1 requirement - Node 18+)

**Package Manager:**
- npm (lockfile: `package-lock.json` v3 present)

## Frameworks

**Core:**
- Next.js 16.2.1 - Full-stack React framework with App Router
- React 19.2.4 - UI library
- React DOM 19.2.4 - React rendering library

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework (`postcss.config.mjs`)
- Tailwind CSS PostCSS 4 - Build tool integration
- class-variance-authority 0.7.1 - Component variant management
- clsx 2.1.1 - Conditional class composition
- tailwind-merge 3.5.0 - Merge Tailwind utility classes
- tw-animate-css 1.4.0 - Custom animation utilities

**UI Components:**
- @base-ui/react 1.3.0 - Headless component library
- shadcn 4.1.0 - UI component toolkit
- lucide-react 1.6.0 - Icon library
- sonner 2.0.7 - Toast notifications

**Data Visualization:**
- recharts 3.8.1 - React charting library

**State Management:**
- zustand 5.0.12 - Lightweight state management (used in `src/lib/cart-store.ts`)

**Internationalization:**
- next-intl 4.8.3 - Multi-language support with i18n request handler in `src/i18n/request.ts`

**Theme:**
- next-themes 0.4.6 - Light/dark mode toggle

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.100.0 - Supabase client SDK for database/auth
- @supabase/ssr 0.9.0 - Supabase Server-Side Rendering utilities for cookie management
- next-sanity 12.1.6 - Sanity CMS integration (optional, for legacy CMS)
- @sanity/image-url 2.0.3 - Sanity image optimization utilities

**API & Email:**
- resend 6.9.4 - Email delivery service (optional, for order notifications via `src/app/api/order/route.ts`)

## Configuration

**Environment:**
- `.env.local.example` provided with required and optional environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (required for CMS fallback)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (required for CMS fallback)
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side operations
  - `NEXT_PUBLIC_SANITY_PROJECT_ID` - Sanity project ID (optional legacy CMS)
  - `NEXT_PUBLIC_SANITY_DATASET` - Sanity dataset name (defaults to "production")
  - `RESEND_API_KEY` - Resend email API key (optional)
  - `RESEND_FROM_EMAIL` - Email sender address (defaults to onboarding@resend.dev)
  - `CAFE_EMAIL` - Cafe email for order notifications
  - `GOOGLE_PLACES_API_KEY` - Google Places API for live reviews (optional)

**Build:**
- `next.config.ts` - Next.js configuration with:
  - next-intl plugin integration for internationalization
  - Remote image patterns for Sanity CDN (`cdn.sanity.io`) and Supabase storage (`*.supabase.co`)
- `tsconfig.json` - TypeScript compilation config with:
  - Target: ES2017
  - Path alias: `@/*` maps to `./src/*`
  - Strict mode enabled
  - Next.js plugin enabled for type generation
- `postcss.config.mjs` - PostCSS configuration with Tailwind CSS PostCSS plugin

## Scripts

**Development & Build:**
```bash
npm run dev        # Start Next.js dev server (http://localhost:3000)
npm run build      # Production build
npm start          # Start production server
npm run lint       # Run ESLint with Next.js config
```

## Dev Dependencies

**Tooling:**
- ESLint 9 - Linting
- eslint-config-next 16.2.1 - Next.js ESLint rules
- @types/node 20 - Node.js type definitions
- @types/react 19 - React type definitions
- @types/react-dom 19 - React DOM type definitions

## Platform Requirements

**Development:**
- Node.js 18+ (required by Next.js 16.2.1)
- npm 9+ (inferred from lockfileVersion 3)

**Production:**
- Node.js 18+ runtime
- Supabase PostgreSQL database (required)
- Optional: Sanity CMS project for legacy CMS mode
- Optional: Google Cloud project with Places API enabled
- Optional: Resend account for email delivery

---

*Stack analysis: 2026-04-26*
