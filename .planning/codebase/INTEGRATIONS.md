# External Integrations

**Analysis Date:** 2026-04-26

## APIs & External Services

**Google Maps:**
- Google Places API - Live cafe ratings and reviews
  - SDK/Client: Direct REST API via `fetch()` in `src/lib/google-places.ts`
  - Auth: `GOOGLE_PLACES_API_KEY` environment variable
  - Fallback: Hardcoded reviews collected Dec 2025 when API key not set
  - Endpoints: `maps.googleapis.com/maps/api/place/findplacefromtext/json` and `place/details/json`
  - Cache: 24-hour in-memory cache with ISR (Incremental Static Regeneration via `{ next: { revalidate: 86400 } }`)

**Email Service:**
- Resend - Transactional email for order notifications
  - SDK/Client: Direct HTTP fetch to `api.resend.com/emails`
  - Auth: `RESEND_API_KEY` environment variable (optional)
  - Implementation: Triggered in `src/app/api/order/route.ts` on successful order submission
  - From Address: `RESEND_FROM_EMAIL` (defaults to onboarding@resend.dev)
  - Recipient: `CAFE_EMAIL` environment variable

## Data Storage

**Primary Database:**
- Supabase PostgreSQL
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anonymous), `SUPABASE_SERVICE_ROLE_KEY` (server)
  - Client Libraries:
    - `@supabase/supabase-js` - Browser/client SDK in `src/lib/supabase/client.ts`
    - `@supabase/ssr` - Server-side SDK with cookie management in `src/lib/supabase/server.ts`
  - Schema location: `supabase/migrations/001_initial_schema.sql` (primary), `002_seed_data.sql`, `004_menu_item_status.sql` (status field added)
  - Tables:
    - `categories` - Menu categories (en/fr bilingual)
    - `menu_items` - Menu items with price, availability, descriptions
    - `modifiers` - Item modifiers (Size, Milk, etc.)
    - `modifier_options` - Modifier choices with price adjustments
    - `orders` - Customer orders with status tracking
    - `order_items` - Order line items with JSONB modifiers
    - `cafe_info` - Business hours, address, pickup lead time
  - Row-Level Security: Enabled on all tables
    - Public: Read-only on categories, menu_items, modifiers, modifier_options, cafe_info
    - Anonymous: Can insert orders and order_items (customer submission)
    - Authenticated: Full access (admin dashboard)
  - Realtime: Enabled on `orders` table for live order status updates

**File Storage:**
- Supabase Storage - Menu item images
  - Bucket: `menu-images` (public read, authenticated write)
  - Used in: Menu item management and display
  - Created via: `supabase/migrations/003_menu_images_bucket.sql`
  - Image URLs: Served from `*.supabase.co` via Next.js remote image pattern in `next.config.ts`

**Legacy CMS (Optional):**
- Sanity.io - Alternative content source (optional if `NEXT_PUBLIC_SANITY_PROJECT_ID` is set)
  - SDK/Client: `next-sanity` in `src/lib/sanity/client.ts`
  - API: Sanity Content Delivery Network (CDN)
  - Image URL builder: `@sanity/image-url` in `src/lib/sanity/image.ts`
  - Dataset: Configurable via `NEXT_PUBLIC_SANITY_DATASET` (defaults to "production")
  - Status: Falls back to Supabase or sample data if not configured

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in PostgreSQL auth)
  - Implementation: Cookie-based session management via `@supabase/ssr`
  - Admin Dashboard: Requires authenticated user session
  - Path: `src/app/admin/login` (login page)
  - Session: Stored in cookies, managed via `src/lib/supabase/server.ts`
  - Policies: RLS restricts dashboard access to authenticated users only

## Data Fetching & Queries

**Primary:**
- Supabase queries via ORM-like client in `src/lib/supabase/queries.ts`:
  - `getCategories()` - Fetch menu categories
  - `getMenuItems()` - Fetch menu items with modifiers
  - `getCafeInfo()` - Fetch business hours and settings

**Fallback Chain:**
1. Supabase (if `NEXT_PUBLIC_SUPABASE_URL` set)
2. Sanity (if `NEXT_PUBLIC_SANITY_PROJECT_ID` set)
3. Sample data in `src/lib/sample-data.ts` (always available)

## Analytics & Tracking

**Order Analytics:**
- Supabase Analytics in `src/lib/supabase/analytics.ts`
- Tracks order submissions, status changes via Supabase database events

## Monitoring & Observability

**Error Tracking:**
- None detected (console.error used for local debugging in `src/lib/google-places.ts` and API routes)

**Logs:**
- Server-side console logging in:
  - `src/app/api/order/route.ts` - Order submission logs
  - `src/lib/google-places.ts` - API fetch errors

## CI/CD & Deployment

**Hosting:**
- Not detected in codebase (inferred: Vercel or similar Node.js hosting)

**CI Pipeline:**
- Not detected

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Order notification emails via Resend (one-way HTTP POST)

## Integration Points in Code

**Order Processing:**
- Order submission: `src/app/api/order/route.ts`
  - Validates against Supabase menu items and business hours
  - Persists order to `orders` and `order_items` tables
  - Sends email notification via Resend (if configured)
  - Returns order number to client

**Menu Management:**
- Image upload: `src/app/api/upload-menu-image/route.ts`
  - Uploads to Supabase Storage `menu-images` bucket

**Admin Dashboard:**
- Real-time order updates via Supabase Realtime subscription on `orders` table
- Path: `src/app/admin/` (requires authentication)

---

*Integration audit: 2026-04-26*
