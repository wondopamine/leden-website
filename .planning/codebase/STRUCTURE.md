# Codebase Structure

**Analysis Date:** 2026-04-26

## Directory Layout

```
leden-website/
├── src/
│   ├── app/                          # Next.js App Router pages & layouts
│   │   ├── layout.tsx                # Root HTML scaffold (fonts, metadata)
│   │   ├── globals.css               # Global styles
│   │   │
│   │   ├── [locale]/                 # Dynamic locale segment (en/fr)
│   │   │   ├── layout.tsx            # Locale wrapper (header, footer, i18n)
│   │   │   ├── page.tsx              # Homepage (hero, featured, reviews)
│   │   │   ├── menu/
│   │   │   │   └── page.tsx          # Menu browsing page
│   │   │   └── order/
│   │   │       ├── page.tsx          # Order form (cart, customer info)
│   │   │       └── confirmation/
│   │   │           └── page.tsx      # Order confirmation (receipt)
│   │   │
│   │   ├── admin/                    # Admin portal (not localized)
│   │   │   ├── layout.tsx            # Admin root layout
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Admin login form
│   │   │   └── (dashboard)/          # Route group for protected pages
│   │   │       ├── layout.tsx        # Auth guard + sidebar + toast
│   │   │       ├── actions.ts        # Server actions (updateOrderStatus)
│   │   │       ├── page.tsx          # Dashboard (stats, today's orders)
│   │   │       ├── orders/
│   │   │       │   ├── page.tsx      # Orders list/search
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx  # Order detail & status management
│   │   │       ├── menu/
│   │   │       │   ├── page.tsx      # Menu items CRUD
│   │   │       │   ├── actions.ts    # Menu item mutations
│   │   │       │   ├── new/
│   │   │       │   │   └── page.tsx  # Create new item form
│   │   │       │   └── [id]/
│   │   │       │       └── edit/
│   │   │       │           └── page.tsx  # Edit item form
│   │   │       ├── categories/
│   │   │       │   ├── page.tsx      # Categories CRUD
│   │   │       │   └── actions.ts    # Category mutations
│   │   │       └── settings/
│   │   │           ├── page.tsx      # Store settings (hours, address, etc)
│   │   │           └── actions.ts    # Settings mutations
│   │   │
│   │   └── api/                      # API routes (not localized)
│   │       ├── order/
│   │       │   └── route.ts          # POST /api/order (validate, persist)
│   │       └── upload-menu-image/
│   │           └── route.ts          # POST (image upload handler)
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # Shadcn UI primitives (Button, Card, etc)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── table.tsx
│   │   │   ├── sonner.tsx            # Toast notifications
│   │   │   └── ... (17 total)
│   │   │
│   │   ├── layout/                   # Page layout shells
│   │   │   ├── header.tsx            # Navigation + locale switcher
│   │   │   ├── footer.tsx            # Footer with hours, contact
│   │   │   └── announcement-banner.tsx  # Cafe alerts/announcements
│   │   │
│   │   ├── menu/                     # Menu-related components
│   │   │   └── (menu display components)
│   │   │
│   │   ├── order/                    # Order form components
│   │   │   └── order-content.tsx     # Main order form (cart, checkout)
│   │   │
│   │   ├── admin/                    # Admin dashboard components
│   │   │   ├── sidebar.tsx           # Navigation menu
│   │   │   ├── orders-dashboard.tsx  # Orders list with filters
│   │   │   └── analytics-dashboard.tsx  # Revenue/stats charts
│   │   │
│   │   ├── fade-in.tsx               # Animation wrapper component
│   │   ├── doodles.tsx               # SVG doodle elements
│   │   └── stickers.tsx              # Sticker graphics
│   │
│   ├── lib/                          # Utility functions & data access
│   │   ├── data.ts                   # Data fetching abstraction (Supabase → Sanity → Sample)
│   │   ├── cart-store.ts             # Zustand cart state
│   │   ├── sample-data.ts            # Hardcoded fallback data
│   │   ├── menu-images.ts            # Image URL builders
│   │   ├── google-places.ts          # Google Places API client
│   │   │
│   │   ├── utils/
│   │   │   ├── format.ts             # formatPrice, getLocalizedString
│   │   │   └── utils.ts              # classname helpers
│   │   │
│   │   ├── supabase/
│   │   │   ├── server.ts             # Supabase server client factory
│   │   │   ├── client.ts             # Supabase client-side client (deprecated)
│   │   │   ├── auth.ts               # getUser, requireAuth
│   │   │   ├── queries.ts            # Menu, categories, cafe info queries
│   │   │   └── analytics.ts          # Order analytics queries
│   │   │
│   │   └── sanity/
│   │       ├── client.ts             # Sanity client factory
│   │       ├── queries.ts            # Sanity GROQ queries
│   │       └── types.ts              # Shared types (MenuItem, Category, CafeInfo)
│   │
│   ├── hooks/                        # Custom React hooks
│   │   └── use-fade-in.ts            # Intersection Observer hook for animations
│   │
│   ├── i18n/                         # Internationalization
│   │   ├── routing.ts                # Locale config (en, fr)
│   │   ├── navigation.ts             # Localized Link, redirect, useRouter
│   │   └── request.ts                # getRequestLocale for Server Components
│   │
│   ├── messages/                     # Translation files
│   │   ├── en.json                   # English strings (landing, order, common)
│   │   └── fr.json                   # French strings (same keys)
│   │
│   └── proxy.ts                      # Middleware (auth check, i18n routing)
│
├── public/                           # Static assets
│   ├── logo.png
│   └── favicon.ico
│
├── supabase/                         # Supabase migrations & seed scripts
│   ├── migrations/
│   └── seed.sql                      # Schema + sample data
│
├── next.config.ts                    # Next.js config (i18n plugin, images)
├── tsconfig.json                     # TypeScript config (@ alias)
├── package.json                      # Dependencies
└── README.md                         # Project docs
```

## Directory Purposes

**`src/app/`** — Next.js App Router
- Purpose: Page routes and layouts
- Contains: Page.tsx files, layout.tsx for nesting, API routes
- Key files: `layout.tsx` (root scaffold), `[locale]/layout.tsx` (locale wrapper), `proxy.ts` (middleware)

**`src/app/[locale]/`** — Customer-facing pages
- Purpose: Public website (homepage, menu, order, confirmation)
- Pattern: All routes nested under `[locale]` dynamic segment for EN/FR support
- Suspense: Boundaries used for async data fetching (Google badge, sections)
- State: Cart managed in Zustand, passed to client components

**`src/app/admin/`** — Admin portal
- Purpose: Order management, menu editing, analytics
- Auth: Protected by middleware (proxy.ts) and `requireAuth()` in layouts
- Pattern: Ungrouped routes at `/admin` level (`login`), grouped routes in `(dashboard)` for layout sharing
- Scope: Dashboard stats, orders list/detail, menu CRUD, settings

**`src/components/ui/`** — Shadcn UI library
- Purpose: Reusable UI primitives (Button, Card, Input, Select, etc)
- Pattern: Unstyled base components, styled with Tailwind
- Imported by: Page components, admin components, form layouts
- Count: 17 components (Button, Card, Dialog, Input, Label, Select, Sheet, Tabs, Table, Sonner, Badge, Separator, Switch, Scroll Area, Skeleton, Textarea, Dropdown Menu)

**`src/components/layout/`** — Page layout shells
- Purpose: Headers, footers, banners that wrap page content
- Contains:
  - `header.tsx`: Navigation, locale switcher (client component)
  - `footer.tsx`: Hours, address, social links (server component with data)
  - `announcement-banner.tsx`: Cafe announcements from CafeInfo

**`src/components/admin/`** — Admin UI
- Purpose: Dashboard-specific components for order management
- Contains:
  - `sidebar.tsx`: Navigation menu (links to dashboard, orders, menu, settings)
  - `orders-dashboard.tsx`: Orders list with status filters
  - `analytics-dashboard.tsx`: Revenue charts and stats

**`src/lib/data.ts`** — Data abstraction
- Purpose: Unified data fetching with fallback chain
- Pattern: `fetchMenuItems()`, `fetchCategories()`, `fetchCafeInfo()` each try Supabase first, then Sanity, then sample data
- Enables: Hot-swap of data sources without changing consumers
- Used by: Server components, never throws (always returns data)

**`src/lib/supabase/`** — Supabase database client
- Purpose: Server-side database access
- Contains:
  - `server.ts`: Creates Supabase client with cookie-based auth
  - `auth.ts`: `getUser()`, `requireAuth()` for protecting pages
  - `queries.ts`: Database queries for menu, categories, cafe info
  - `analytics.ts`: Order analytics (revenue, count, date ranges)
- Pattern: All files are async, return typed data

**`src/lib/sanity/`** — Sanity CMS client
- Purpose: Alternative content management system
- Contains:
  - `client.ts`: Sanity client factory
  - `queries.ts`: GROQ queries for menu items, categories, cafe info
  - `types.ts`: Shared TypeScript types (MenuItem, Category, CafeInfo)

**`src/i18n/`** — i18n configuration
- Purpose: Multi-language support (EN/FR)
- Contains:
  - `routing.ts`: Locale config (locales, default, detection)
  - `navigation.ts`: Localized `<Link>`, `useRouter`, `redirect` wrappers
  - `request.ts`: Server-side `getRequestLocale()` hook
- Pattern: Locales in URL path `/en/*` or `/fr/*`

**`src/messages/`** — Translation strings
- Purpose: English and French text
- Files: `en.json`, `fr.json`
- Structure: Nested keys (e.g., `landing.hero.subtitle`, `common.orderForPickup`)
- Used by: `useTranslations()` hook in components

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML scaffold (fonts, metadata)
- `src/app/[locale]/layout.tsx`: Locale wrapper (i18n, header, footer)
- `src/app/[locale]/page.tsx`: Homepage (hero, featured items, reviews)
- `src/app/admin/layout.tsx`: Admin root
- `src/proxy.ts`: Middleware (auth + i18n routing)

**Configuration:**
- `next.config.ts`: Next.js config (i18n plugin, image remotes)
- `tsconfig.json`: TypeScript config (`@/*` path alias)
- `.env.local.example`: Environment variable template

**Core Logic:**
- `src/lib/data.ts`: Data fetching abstraction
- `src/lib/cart-store.ts`: Cart state management
- `src/lib/supabase/auth.ts`: Auth helpers
- `src/lib/supabase/queries.ts`: Database queries
- `src/app/api/order/route.ts`: Order submission endpoint

**Testing:**
- Not present in codebase (no test files found)

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- Server Actions: `actions.ts` (grouped by feature)
- API routes: `route.ts` (Next.js convention)
- Components: `kebab-case.tsx` (e.g., `order-content.tsx`, `fade-in.tsx`)
- Utilities: `kebab-case.ts` (e.g., `google-places.ts`, `menu-images.ts`)

**Directories:**
- Features: lowercase (e.g., `order`, `menu`, `admin`)
- UI library: `ui/` (shadcn convention)
- Route groups: Parentheses (e.g., `(dashboard)` to group protected routes)
- Dynamic segments: Square brackets (e.g., `[locale]`, `[id]`)

**Functions:**
- Async data fetchers: `fetch*` (e.g., `fetchMenuItems`, `fetchCafeInfo`)
- Queries: `get*` (e.g., `getCategories`, `getUser`)
- Utilities: PascalCase for components, camelCase for functions
- Server Actions: `update*`, `create*`, `delete*` (verb-noun pattern)

**Variables:**
- Component props: TypeScript interfaces ending in `Props`
- Store hooks: `use*` (e.g., `useCartStore`)
- Translations: `t` (for `useTranslations('key')`)
- Types: PascalCase (e.g., `MenuItem`, `CartItem`, `OrderStatus`)

**Types:**
- Shared types: `src/lib/sanity/types.ts` (MenuItem, Category, CafeInfo, LocalizedString)
- Localized content: `LocalizedString = { en: string, fr: string }`
- Order statuses: `"new" | "preparing" | "ready" | "picked_up" | "cancelled"`
- Item status: `"available" | "sold_out" | "hidden"`

## Where to Add New Code

**New Feature (e.g., loyalty program):**
- Primary code: `src/app/[locale]/loyalty/page.tsx` (customer route)
- Admin counterpart: `src/app/admin/(dashboard)/loyalty/page.tsx`
- Queries: Add to `src/lib/supabase/queries.ts`
- Components: `src/components/loyalty/*.tsx`
- Server actions: `src/app/admin/(dashboard)/loyalty/actions.ts`
- Tests: Would go in `src/app/[locale]/loyalty/page.test.tsx` (not present, add if needed)

**New Component/Module:**
- UI component (reusable): `src/components/[feature]/component-name.tsx`
- Page-specific component: `src/components/[route]/component-name.tsx`
- Admin component: `src/components/admin/feature-name.tsx`
- Utility: `src/lib/feature-name.ts` or `src/lib/utils/feature-name.ts`

**New API Endpoint:**
- Location: `src/app/api/[endpoint]/route.ts`
- Pattern: Create folder with `route.ts` file inside
- Validation: Duplicate server-side validation from API handler (never trust client)
- Example: `src/app/api/order/route.ts` (POST endpoint for order creation)

**Utilities/Helpers:**
- Shared helpers: `src/lib/utils/*.ts`
- Feature-specific: `src/lib/[feature]/*.ts`
- Data access: `src/lib/supabase/queries.ts` or `src/lib/sanity/queries.ts`
- Format/parse: `src/lib/utils/format.ts`

**Database Queries:**
- Server-side: Add to `src/lib/supabase/queries.ts` (named `get*` or `fetch*`)
- Call from: Server Components, API routes, Server Actions
- Pattern: Try Supabase directly, or route through `src/lib/data.ts` for abstraction

**i18n Strings:**
- Add key to `src/messages/en.json`
- Add same key to `src/messages/fr.json`
- Use in component: `const t = useTranslations('namespace'); {t('key')}`
- Namespace examples: `landing`, `order`, `common`, `admin`

## Special Directories

**`src/messages/`** — Translation files
- Purpose: English and French text
- Generated: No (manually maintained)
- Committed: Yes
- Structure: Nested JSON, namespace-based

**`.next/`** — Build output
- Purpose: Compiled Next.js app
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignore)
- Contents: Optimized bundles, server functions, cache

**`node_modules/`** — Dependencies
- Purpose: npm packages
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore)
- package-lock.json: Committed (for reproducible installs)

**`public/`** — Static assets
- Purpose: Images, fonts, favicons served as-is
- Generated: No (manually added)
- Committed: Yes
- Access: `/logo.png` → `public/logo.png`

**`supabase/`** — Database migrations
- Purpose: Schema version control
- Generated: No (manual migrations)
- Committed: Yes
- Pattern: SQL files in `migrations/`, seed in `seed.sql`

## Route Structure

**Customer Routes (with `[locale]` segment):**
- `/` → `src/app/[locale]/page.tsx` (homepage)
- `/menu` → `src/app/[locale]/menu/page.tsx` (menu browsing)
- `/order` → `src/app/[locale]/order/page.tsx` (cart + checkout)
- `/order/confirmation` → `src/app/[locale]/order/confirmation/page.tsx` (receipt)
- All routes support both `/en/*` and `/fr/*` variants

**Admin Routes (no locale):**
- `/admin/login` → `src/app/admin/login/page.tsx` (public)
- `/admin` → `src/app/admin/(dashboard)/page.tsx` (dashboard, auth required)
- `/admin/orders` → `src/app/admin/(dashboard)/orders/page.tsx` (orders list)
- `/admin/orders/[id]` → `src/app/admin/(dashboard)/orders/[id]/page.tsx` (order detail)
- `/admin/menu` → `src/app/admin/(dashboard)/menu/page.tsx` (menu CRUD)
- `/admin/menu/new` → `src/app/admin/(dashboard)/menu/new/page.tsx` (create item)
- `/admin/menu/[id]/edit` → `src/app/admin/(dashboard)/menu/[id]/edit/page.tsx` (edit item)
- `/admin/categories` → `src/app/admin/(dashboard)/categories/page.tsx` (categories CRUD)
- `/admin/settings` → `src/app/admin/(dashboard)/settings/page.tsx` (store settings)

**API Routes (no locale, no auth required at route level):**
- `POST /api/order` → `src/app/api/order/route.ts` (submit order, validates internally)
- `POST /api/upload-menu-image` → `src/app/api/upload-menu-image/route.ts` (image upload)

## Dynamic Route Segments

**`[locale]` — Customer routes**
- Values: `en` or `fr`
- Generated at build time via `generateStaticParams()` in `src/app/[locale]/layout.tsx`
- Passes to children via `params` prop (Promise type in App Router)
- Used by: all customer pages for language selection

**`[id]` — Admin resource pages**
- Values: Resource IDs (order IDs, menu item IDs, category IDs)
- Generated: Dynamically at runtime (no pre-generation)
- Pattern: `/admin/orders/[id]` fetches order from Supabase using `params.id`
- Used by: Order detail, menu item edit, category management

---

*Structure analysis: 2026-04-26*
