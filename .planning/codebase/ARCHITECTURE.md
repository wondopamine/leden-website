# Architecture

**Analysis Date:** 2026-04-26

## Pattern Overview

**Overall:** Next.js App Router with server-client separation, multi-source data abstraction layer, and split customer/admin routes.

**Key Characteristics:**
- Server Components by default, Client Components for interactive UI only (`"use client"`)
- Data fetching abstraction: Supabase → Sanity → Sample data fallback chain
- Admin routes protected by middleware-level auth + server action validation
- Customer routes use dynamic locale segment `[locale]` with i18n
- Minimal caching — recent commits removed caching layers (PSE → PSR, force-dynamic)
- Order creation validates prices/availability server-side (no trust in client)

## Layers

**Route Layer (App Router):**
- Purpose: HTTP request handling and page rendering
- Location: `src/app/`
- Contains: Page components, layouts, API routes
- Depends on: Components, Server Actions, data fetching functions
- Used by: Browser, API clients

**Server Components (`src/app/[locale]/*`, `src/app/admin/(dashboard)/*`):**
- Purpose: Safe server-side rendering, data fetching
- Location: Layout and Page files marked `async`
- Contains: Parallel data fetching with `Promise.all()`, Suspense boundaries
- Depends on: Data layer (`src/lib/data.ts`, `src/lib/supabase/*`)
- Used by: Client Components via props

**Client Components (`src/components/`):**
- Purpose: Interactive UI, state management, user input
- Location: Files with `"use client"` directive
- Contains: Form handling, cart management, modals, animations
- Depends on: UI library (shadcn/ui), Zustand store, server actions
- Used by: Server Components and other client components

**Data Abstraction Layer (`src/lib/data.ts`):**
- Purpose: Unified data fetching with fallback chain
- Pattern: Try Supabase → Try Sanity → Return sample data
- Exports: `fetchMenuItems()`, `fetchCategories()`, `fetchCafeInfo()`
- Enables: Hot-swap data sources without changing consumer code
- Used by: Server components, server actions

**API Routes (`src/app/api/`):**
- Purpose: Request handling outside i18n (order submission, uploads)
- Location: `src/app/api/order/route.ts`, `src/app/api/upload-menu-image/route.ts`
- Contains: Business logic, validation, third-party API calls
- Depends on: Supabase client (service role for admin operations)
- Pattern: POST → Validate → Persist → Notify → Return

**Server Actions (`src/app/admin/(dashboard)/actions.ts`):**
- Purpose: Secure mutations from Client Components (order status updates, category edits)
- Pattern: `"use server"` functions, checks auth before mutation, revalidates cache
- Depends on: Supabase client, `requireAuth()` for protection
- Called by: Admin dashboard Client Components

**State Management (`src/lib/cart-store.ts`):**
- Purpose: Client-side persistent cart state
- Tool: Zustand with localStorage persistence
- Scope: Cart items, customer info, pickup time
- Persisted key: `cafe-leden-cart`
- Used by: Order creation, cart UI, checkout page

## Data Flow

**Customer Order Flow:**

1. User adds items on menu page (Client Component) → `useCartStore.addItem()`
2. Cart stored locally in Zustand + localStorage
3. User navigates to `/[locale]/order` (Server Component)
4. Server fetches cafe hours/info via `fetchCafeInfo()`
5. Client Component (`OrderContent`) reads cart store, generates time slots
6. User submits order → POST `/api/order`
7. API Handler: Validate phone, items exist, prices match DB, business hours
8. API inserts to `orders` + `order_items` tables, sends email via Resend
9. Client receives `orderNumber`, redirects to confirmation page
10. Confirmation page shows order details from route state (not DB)

**Admin Order Management Flow:**

1. Middleware checks `/admin/*` routes → requires auth or redirect to login
2. Dashboard page (Server Component) fetches today's orders from Supabase
3. Orders list uses `OrdersDashboard` Client Component
4. Admin clicks "Preparing" button → calls Server Action `updateOrderStatus()`
5. Server Action validates auth, updates DB, calls `revalidatePath()`
6. Page re-fetches and re-renders with new status

**Menu Data Flow:**

1. Page component calls `fetchMenuItems()` → tries Supabase first
2. If Supabase fails, tries Sanity CMS
3. If both fail, returns sample menu (hardcoded)
4. Server Component renders menu via `FeaturedSection`, `MenuPage`
5. Admin can edit items at `/admin/menu/[id]/edit` using form + Server Actions

**Google Places / Reviews Flow:**

1. `getGooglePlaceData()` called from Server Components
2. Fetches live ratings, review count, review text from Google Places API
3. Used on homepage and in various sections (no caching)
4. Returns typed `PlaceData` object

## Key Abstractions

**LocalizedString:**
- Purpose: Bilingual content (EN/FR)
- Pattern: `{ en: string, fr: string }`
- Used by: MenuItem, Category, CafeInfo, announcements
- Examples: `src/lib/sanity/types.ts`

**MenuItem:**
- Purpose: Product definition with modifiers, availability, images
- Fields: `_id`, `name`, `description`, `price`, `category`, `status` ("available" | "sold_out" | "hidden"), `modifiers`
- Modifiers: Size, dairy, add-ons with price adjustments
- Example: `src/lib/sanity/types.ts`

**CafeInfo:**
- Purpose: Store-wide settings: hours, address, phone, announcements, order constraints
- Fields: `hours` (array), `pickupLeadTime`, `maxAdvanceOrderDays`, `announcement`
- Used by: Homepage, order page for UI/validation
- Sources: Supabase `cafe_info` table, Sanity document

**OrderItem (in cart vs persisted):**
- Client: `CartItem` in Zustand (includes modifiers array, client-generated ID)
- Persisted: `orders` + `order_items` tables (separate normalization)
- API validates and transforms between formats

**Server Client (Supabase):**
- Purpose: Server-side only database access
- Location: `src/lib/supabase/server.ts`
- Pattern: Creates client with cookie-based auth, safe for Server Components
- No client-side auth token exposed in response headers

**i18n Routing:**
- Purpose: URL-based locale selection (`/en/*` or `/fr/*`)
- Middleware applies via `src/proxy.ts` using next-intl
- Disabled for `/admin` routes (admin is English-only)
- Locale passed to Components via params for translations

## Entry Points

**Root Layout (`src/app/layout.tsx`):**
- Location: `src/app/layout.tsx`
- Triggers: Every page request
- Responsibilities: HTML scaffold, global fonts (Geist, DM Serif), metadata
- Children: `[locale]/layout.tsx` or `/admin/layout.tsx`

**Locale Layout (`src/app/[locale]/layout.tsx`):**
- Location: `src/app/[locale]/layout.tsx`
- Triggers: All customer pages (`/`, `/menu`, `/order`, `/order/confirmation`)
- Responsibilities: Fetch cafe info, render header/footer, i18n context setup
- Fetching: `fetchCafeInfo()` server-side once, passed down
- Children: Locale-specific pages (menu, order, home)

**Admin Root (`src/app/admin/layout.tsx`):**
- Location: `src/app/admin/layout.tsx`
- Triggers: Any `/admin/*` request
- Responsibilities: Minimal wrapper (no special layout)
- Middleware: Handled in `src/proxy.ts` (session refresh, auth check)

**Admin Dashboard Layout (`src/app/admin/(dashboard)/layout.tsx`):**
- Location: `src/app/admin/(dashboard)/layout.tsx`
- Triggers: Protected routes (`/admin/dashboard`, `/admin/menu`, `/admin/orders`)
- Responsibilities: Call `requireAuth()` to guard page, render sidebar + toast
- Pattern: Async layout that throws redirect if user not authenticated
- Children: Dashboard, orders, menu management pages

**Proxy / Middleware (`src/proxy.ts`):**
- Location: `src/proxy.ts`
- Triggers: Every request (via Next.js config matcher)
- Responsibilities: Route admin requests to auth check, apply i18n to public routes
- Auth Logic: Creates Supabase client, calls `getUser()`, redirects to login if missing
- i18n Logic: Delegates to `intlMiddleware` for public routes

**Admin Login (`src/app/admin/login/`):**
- Location: `src/app/admin/login/page.tsx`
- Triggers: Unauthenticated admin access
- Responsibilities: Email/password login form
- Depends on: Supabase Auth
- Redirects to: `/admin` after successful auth

**Homepage (`src/app/[locale]/page.tsx`):**
- Location: `src/app/[locale]/page.tsx`
- Triggers: `/` or `/[locale]/` requests
- Responsibilities: Hero section, featured items, reviews, hours, about
- Fetching: Parallel fetch of items, cafe info, Google place data
- Suspense: Google badge in Suspense, sections in Suspense with skeleton
- State: `dynamic = "force-dynamic"` — always fresh (no ISR)

## Error Handling

**Strategy:** Graceful degradation with fallback data

**Patterns:**
- Data layer: Try Supabase → Try Sanity → Return sample/hardcoded data (never throw)
- Server Components: Suspense boundaries catch async errors, show skeleton
- API routes: Return 400/500 with error message, log to console
- Supabase queries: Check `error` object, throw with context, caught in try-catch
- Client validation: Phone format, item count, name length checked before API call
- Server validation: Prices rechecked against DB, availability re-confirmed, hours re-validated

## Cross-Cutting Concerns

**Logging:**
- Approach: console.log/error for debugging, no dedicated logger
- API: Log order number, customer name, phone, pickup time, total after success
- Admin: Log mutations and auth failures
- Production: Logs go to stdout (captured by hosting platform)

**Validation:**
- Client (UX): Form validation prevents invalid submission (empty fields, malformed phone)
- Server (Security): API route re-validates all data against DB before persisting
- Pattern: Client-side UI checks, then server-side security checks (never trust client)

**Authentication:**
- Provider: Supabase Auth (email/password)
- Pattern: Session stored in secure HTTP-only cookie, refreshed on every admin request
- Middleware: Proxy checks session on `/admin` routes, redirects to login if missing
- Server Actions: Each admin action calls `requireAuth()` before mutation
- Client: No tokens in localStorage or headers (cookie-based only)

**Internationalization:**
- Tool: next-intl
- Locales: EN, FR
- Routing: `[locale]` dynamic segment in URL
- Translations: `src/messages/` contains JSON translation files
- API: Order submission includes `locale` parameter for email
- Admin: English-only (no i18n in `/admin` routes)

**Image Handling:**
- Menu item images: Stored in Supabase storage or Sanity CDN
- Image URLs: Built by `getItemImageUrl()` helper
- Next.js Config: Allows remote patterns for `cdn.sanity.io` and `*.supabase.co`
- Lazy loading: Images use `loading="lazy"` on homepage cards
- Avatar images: Fetched from Google (user profile photos in reviews)

**Caching & Revalidation:**
- Strategy: No caching (recently removed)
- Pages: `force-dynamic` on homepage, API routes don't use cache tags
- Admin: `revalidatePath()` after mutations to refresh UI
- Data: Fresh Supabase/Sanity queries on every request
- Implication: All requests are server-rendered (no ISR/SSG except static assets)

---

*Architecture analysis: 2026-04-26*
