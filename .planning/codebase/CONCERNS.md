# Codebase Concerns

**Analysis Date:** 2026-04-26

## Tech Debt

**Image Handling Strategy Fragility:**
- Issue: Fallback image handling uses hardcoded Unsplash URLs that have broken multiple times (multiple recent QA fixes for broken pastries/breakfast images). No proper image optimization or validation in place.
- Files: `src/lib/menu-images.ts`, `src/components/menu/menu-content.tsx`, `src/app/[locale]/page.tsx`
- Impact: Visual breakage on customer-facing pages when external images become unavailable. Recent commits (ISSUE-001, ISSUE-001b) had to patch specific URLs multiple times.
- Fix approach: Migrate to self-hosted or CDN-backed images. Implement image validation endpoint. Use Next.js Image component with proper fallback strategies instead of raw `<img>` tags.

**Raw `<img>` Tags Throughout Codebase:**
- Issue: Multiple `eslint-disable-next-line @next/next/no-img-element` suppressions indicate deliberate bypass of Next.js Image optimization. Used for hero logo, featured items, menu items, admin thumbnails, header logo, review carousel profile photos.
- Files: `src/app/[locale]/page.tsx` (lines 130, 239, 335), `src/components/layout/header.tsx`, `src/components/menu/menu-content.tsx`, `src/components/admin/menu-item-row.tsx`
- Impact: Missing image optimization, lazy loading, responsive srcset, and proper sizing. Larger bundle, slower Core Web Vitals, especially on mobile.
- Fix approach: Replace with Next.js `<Image>` component. Requires sizing all image containers. Batch this in refactor phase to maintain performance consistency.

**Explicit Type Suppression in API Routes:**
- Issue: Multiple `@typescript-eslint/no-explicit-any` suppressions in order API route and menu actions. Types are cast as `any` to bypass type checking.
- Files: `src/app/api/order/route.ts` (lines 33, 43, 76), `src/app/admin/(dashboard)/menu/actions.ts` (line 129)
- Impact: Type safety gaps in critical data flow (order processing, menu updates). Could hide bugs in validation logic or data transformations.
- Fix approach: Type the Supabase client response properly instead of using `any`. Extract validated types for order items and cafe info.

**Hardcoded Design Values Scattered Across Files:**
- Issue: Colors, spacing, and sizing use inline Tailwind classes and hardcoded hex values rather than design tokens. Examples: `#2D5A3D` (dark green) appears in 5+ places, `#f2ead5` (cream) appears in 3+ places, spacing is mixed (mt-5, mt-6, mt-8, mt-12, mt-14, gap-2.5, gap-3, gap-6).
- Files: `src/app/[locale]/page.tsx`, `src/app/globals.css`, `src/components/admin/menu-item-row.tsx`
- Impact: Design inconsistency across sections. Difficult to maintain brand coherence. Color changes require multiple find-replace operations. Visual polish degradation noted in user feedback ("visuals are very bad").
- Fix approach: Define design token variables in globals.css for all brand colors (dark green, cream, primary orange). Create Tailwind custom color classes. Create spacing utility classes for section padding (py-section-sm, py-section-lg).

**Caching Strategy Removed — Risk of Re-introduction:**
- Issue: Recent commit (08e8e01) explicitly removed all caching layers due to admin/customer data inconsistency bugs. Now relies solely on `revalidatePath()` calls in server actions. No time-based cache TTL except for Google Places data (24h in-memory).
- Files: `src/lib/google-places.ts` (in-memory cache), `src/app/admin/(dashboard)/*/actions.ts` (revalidatePath calls)
- Impact: Each customer page load may hit database/Sanity. Potential performance degradation under load. Google Places API has rate limits. In-memory cache on server is lost on deployment/restart.
- Fix approach: Implement proper Next.js data cache with `unstable_cache()` or incremental static regeneration (ISR) for menu/categories. Keep aggressive revalidation only for admin edits. Document cache strategy for future developers.

**IntersectionObserver Fade-In Component Missing Accessibility:**
- Issue: `src/components/fade-in.tsx` uses IntersectionObserver with `prefers-reduced-motion` suppression in globals.css, but fade-in delays (`animation-delay`) are hardcoded in page CSS (.hero-fade-in-1 through .hero-fade-in-4 with 1.2s to 1.8s staggered delays). No `prefers-reduced-motion` media query on staggered animations.
- Files: `src/app/globals.css` (lines 197-203), `src/app/[locale]/page.tsx` (lines 192-195)
- Impact: Users with motion sensitivity will still see staggered fade timings on hero section, causing layout shift and visual discomfort. Violates WCAG 2.1 Success Criterion 2.3.3.
- Fix approach: Apply `prefers-reduced-motion` to all staggered animation delays. Test with `defaults write com.apple.universalaccess reduceMotionEnabled 1`.

**Admin Authentication Gap — No Session Refresh:**
- Issue: Auth uses `requireAuth()` which calls `getUser()` on server, but no session refresh mechanism. Supabase session can expire during long admin sessions without re-login prompt.
- Files: `src/lib/supabase/auth.ts`, `src/app/admin/(dashboard)/layout.tsx`
- Impact: Admin user could be logged out silently, next action causes 401 redirect loop. Recent fix (71a0bad) addressed this for customer site but admin flow unclear.
- Fix approach: Implement session refresh on layout load or before sensitive mutations. Add middleware to detect and handle 401s gracefully.

**Generic Type Assertions in Type Definitions:**
- Issue: Menu item form and order processing code use loose type definitions that require casting. Example: `category: { id: string; name_en: string } | null` in `MenuItemRow` allows null category, which could cause runtime errors if accessed.
- Files: `src/components/admin/menu-item-row.tsx` (line 22), `src/components/admin/menu-item-form.tsx`
- Impact: Silent failures if data structure doesn't match expected shape. Makes refactoring risky.
- Fix approach: Define strict Sanity/Supabase schema types in `src/lib/sanity/types.ts` and import consistently.

---

## Known Bugs

**Review Carousel Infinite Scroll Breaks on Small Screens:**
- Symptoms: Review carousel on homepage uses fixed `w-[360px]` card width (line 330). On very small phones (<360px), cards overflow and carousel clips badly.
- Files: `src/app/[locale]/page.tsx` (line 330: `w-[360px] shrink-0`)
- Trigger: View homepage on iPhone SE (375px) or older Android phones (320px width)
- Workaround: Reduce card width for mobile with responsive class `sm:w-[360px]` and use `w-[320px]` on mobile

**Unsplash Image URLs Periodically Fail:**
- Symptoms: Category fallback images (coffee, breakfast, pastries, etc.) occasionally return 404 or connection timeout.
- Files: `src/lib/menu-images.ts` (lines 3-8)
- Trigger: Unsplash rate limiting, image removal, or temporary CDN outages
- Workaround: Manual URL rotation in code; no automatic retry logic

**Footer/Hours Section Layout Shifts on Mobile:**
- Symptoms: Hours and location cards stack on mobile with border-left accent, but padding and font sizes aren't responsive, causing text overflow on narrow screens.
- Files: `src/app/[locale]/page.tsx` (lines 484-510+)
- Trigger: View hours section on phone in portrait orientation
- Workaround: Manually tested at `sm:` breakpoint, but smaller phones may still overflow

---

## Security Considerations

**Admin Authentication Uses Auth Role Check Only:**
- Risk: RLS policies check `auth.role() = 'authenticated'` but don't verify user's admin status or specific permissions. Any authenticated user can potentially access admin tables.
- Files: `supabase/migrations/001_initial_schema.sql` (lines 142-148)
- Current mitigation: Supabase session requirement in `src/lib/supabase/auth.ts`. But no row-level restrictions based on user ID or role.
- Recommendations: 
  1. Add `admin_users` table with user IDs and roles.
  2. Update RLS policies to check `auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'admin')`.
  3. Implement admin onboarding with secure invitation flow.

**Order Validation Missing Phone Number Format Check:**
- Risk: Order phone validation in API accepts any string format. No E.164 or international format validation. Could accept invalid phone numbers, breaking SMS/WhatsApp notifications if implemented later.
- Files: `src/app/api/order/route.ts` (line 34 accepts phone in `orderBody` without regex check)
- Current mitigation: Basic required field check, but no format validation.
- Recommendations: Add phone regex validation before saving to database. Consider using a phone number library like `libphonenumber-js`.

**Image Upload Endpoint Not Visible in Route Definitions:**
- Risk: `/api/upload-menu-image` endpoint called in `src/components/admin/menu-item-form.tsx` (line 76) but route file not found in codebase audit. May be unprotected or missing authentication.
- Files: Referenced but endpoint implementation unclear
- Current mitigation: Unknown
- Recommendations: Verify endpoint exists, implements auth check via `requireAuth()`, validates file size/type, and stores in Supabase buckets with RLS.

**Environment Variables for Secrets Not Audited:**
- Risk: `.env.local` not in repo, but `process.env.SUPABASE_SERVICE_ROLE_KEY` used in `src/app/api/order/route.ts`. Service role key exposed in server-side code, which is safe, but if accidentally committed, becomes critical.
- Files: `src/app/api/order/route.ts` (line 29)
- Current mitigation: `.env.local` in `.gitignore`
- Recommendations: Document required env vars in `.env.example`. Add pre-commit hook to scan for leaked secrets (git-secrets, talisman).

**RLS Policies Allow Anonymous Order Insert:**
- Risk: `CREATE POLICY "Anon insert orders" ON orders FOR INSERT WITH CHECK (true);` allows any unauthenticated user to insert orders. No validation of order total, items, or customer info at database level.
- Files: `supabase/migrations/001_initial_schema.sql` (line 138)
- Current mitigation: Server-side validation in `src/app/api/order/route.ts` (validateItems, validateBusinessHours)
- Recommendations: 
  1. Rely on API validation as primary gate, but add database constraints: check that order total matches calculated subtotal + tax.
  2. Add rate limiting on `/api/order` endpoint (max orders per IP per hour).
  3. Consider adding CAPTCHA or phone verification for orders.

---

## Performance Bottlenecks

**Homepage Data Fetching Parallelizes But No Streaming:**
- Problem: `src/app/[locale]/page.tsx` uses `Promise.all()` to fetch menu items, cafe info, and Google Place data in parallel, but `force-dynamic` (line 16) prevents any caching. Every page load hits three external services.
- Files: `src/app/[locale]/page.tsx` (lines 53-57)
- Cause: Removed caching layers (commit 08e8e01) to fix stale data. Now trades performance for consistency.
- Improvement path: Use React 19 `use()` with Promise.all and Suspense boundaries to stream sections. Implement granular cache invalidation: cache menu/categories for 5 min, cache Google data for 24h, invalidate only on admin edits.

**Google Places API Called Every Page Load:**
- Problem: `src/lib/google-places.ts` has in-memory cache (CACHE_TTL = 1 hour), but cache is lost on server restart. Call is made in `getGooglePlaceData()` which is awaited on every homepage load.
- Files: `src/lib/google-places.ts` (lines 84-170)
- Cause: In-memory cache insufficient for multi-instance deployments or frequent redeployments.
- Improvement path: Implement persistent cache in Redis or Supabase. Use edge caching headers. Implement fallback to cached data if API fails.

**Admin Dashboard Loads All Orders Without Pagination:**
- Problem: Orders dashboard likely fetches all orders from Supabase with no limit/offset.
- Files: `src/app/admin/(dashboard)/page.tsx` (likely in queries)
- Cause: No pagination UI visible in structure.
- Improvement path: Implement cursor-based pagination. Add filters (date range, status) to reduce result set. Index orders by `created_at DESC`.

**Featured Section Query Filters Manually in JS:**
- Problem: `src/app/[locale]/page.tsx` line 206 filters to `status === "available"` after fetching all items. Could be 100+ items fetched and filtered client-side during rendering.
- Files: `src/app/[locale]/page.tsx` (line 206)
- Cause: Data fetch doesn't filter at source.
- Improvement path: Move filter to Sanity query: `filter: status == "available" && category in [...availableCategories]`.

**Doodles Component Renders Inline SVGs:**
- Problem: `src/components/doodles.tsx` (310 lines) defines multiple animated SVG doodles that are rendered on every pageload. Each has keyframe animations and event listeners.
- Files: `src/components/doodles.tsx`
- Cause: Not clear if doodles are visible or used actively on current pages.
- Improvement path: If doodles are not visible, remove or lazy-load behind a feature flag. If used, convert to CSS-only or sprite sheet.

---

## Fragile Areas

**Homepage Section Structure — Tightly Coupled to Data Shape:**
- Files: `src/app/[locale]/page.tsx` (entire file, 576 lines)
- Why fragile: Each section component (FeaturedSection, ReviewsSection, AboutSection, HoursSection) assumes specific data shape from Sanity/Google Places API. If API schema changes, multiple sections break silently.
- Safe modification: Define strict TypeScript interfaces for each data source at import time. Add runtime validation with Zod or io-ts. Test data schema changes in staging environment first.
- Test coverage: No unit tests visible. Integration test would need live API calls.

**Menu Item Status Enum Migration Risk:**
- Files: `supabase/migrations/004_menu_item_status.sql`, `src/components/admin/menu-item-row.tsx` (lines 26-30)
- Why fragile: Recent migration added 3-state status (available/sold_out/hidden) replacing boolean `available` flag. Code handles fallback (`item.status ?? (item.available ? "available" : "hidden")`), but if schema changes again, many components break.
- Safe modification: Create migration script that tests all status transitions. Update all usages in one PR. Add database constraints to prevent invalid status values.
- Test coverage: No tests for status transitions visible.

**Admin Form State Management:**
- Files: `src/components/admin/menu-item-form.tsx` (427 lines)
- Why fragile: Form uses multiple `useState` calls for form fields, modifiers, options, and image upload. No centralized state validation. Image upload state is isolated from form submission.
- Safe modification: Consider extracting to useReducer or Zustand store. Add form validation schema (Zod) separate from component. Test submit with and without image.
- Test coverage: No unit tests visible.

**IntersectionObserver Hook Manual Implementation:**
- Files: `src/hooks/use-fade-in.ts` (33 lines)
- Why fragile: Manual IntersectionObserver implementation with hardcoded threshold. If threshold changes, all fade-in animations behave differently unexpectedly.
- Safe modification: Document threshold meaning. Add prop to override threshold per section. Test on different scroll speeds and devices.
- Test coverage: No unit tests visible.

**Category Hardcoded Image Fallbacks:**
- Files: `src/lib/menu-images.ts` (18 lines)
- Why fragile: Coffee category returns fixed fallback if no image. If categories are added or renamed, fallback logic breaks. If URLs become unavailable, multiple fixes needed across codebase.
- Safe modification: Store category images in Sanity as separate documents. Query category with embedded image asset. Remove hardcoding entirely.
- Test coverage: No tests for missing/broken image URLs.

---

## Scaling Limits

**In-Memory Cache Single-Server Bottleneck:**
- Current capacity: Google Places data cached for 1 hour in single server instance memory
- Limit: Breaks on multi-instance deployment or server restart (cache lost)
- Scaling path: Move cache to Redis or Supabase. Implement cache warming on deployment. Use Vercel Edge Functions for lightweight cache.

**Database Queries Not Optimized for Large Datasets:**
- Current capacity: Menu items, orders, categories fetched without pagination
- Limit: Database response time grows linearly with dataset size. Homepage load time increases as order history grows.
- Scaling path: Add pagination. Add database indexes for common filters (status, created_at). Denormalize frequently-read data (e.g., order count, total revenue for dashboard).

**Supabase RLS Policies Applied to All Queries:**
- Current capacity: RLS evaluation on every query slows down read performance
- Limit: Becomes noticeable with 10k+ rows
- Scaling path: For public reads (menu, cafe info), consider disabling RLS and using API Gateway rate limiting instead. For admin tables, RLS is appropriate but should be indexed.

---

## Dependencies at Risk

**Sanity CMS Coupling:**
- Risk: Menu data, cafe info, categories all stored in Sanity. Tight coupling to Sanity API and schema. If Sanity goes down, site goes down. If pricing changes, costly to migrate.
- Impact: Menu page, homepage, admin all depend on Sanity queries working. No fallback data source.
- Migration plan: Evaluate migrating menu/categories to Supabase for single source of truth. Sanity could store editorial content only. Would require schema redesign and data migration script.

**Unsplash Image Dependencies:**
- Risk: Multiple category fallback images from Unsplash. URLs broken multiple times requiring code fixes.
- Impact: Customer pages show broken images when Unsplash URLs fail.
- Migration plan: Self-host fallback images in Supabase storage or static assets. Remove Unsplash dependency entirely. For custom menu item images, use Sanity image assets.

**Zustand Cart State Unknown Usage:**
- Risk: `src/lib/cart-store.ts` (119 lines) exists but usage pattern unclear. If cart state becomes complex, Zustand may not scale. If migrating to server state, major refactor needed.
- Impact: Menu ordering flow depends on cart store shape.
- Migration plan: Audit cart store usage across menu and order components. Consider moving to URL search params or form state if order flow is stateless.

**next-intl for i18n:**
- Risk: i18n routing integrated deeply. Adding new locale or changing locale structure requires migration.
- Impact: All content needs EN/FR translations. Building admin UI in one language only (EN).
- Migration plan: Current setup is reasonable. Document adding new locales. Plan translation workflow if expanding to FR properly in admin.

---

## Missing Critical Features

**No Error Boundary or Fallback UI:**
- Problem: If Sanity API fails or Google Places API fails, page shows Suspense fallback skeleton indefinitely. No error state, retry button, or user notification.
- Blocks: Can't handle API failures gracefully. Users see incomplete pages.
- Fix approach: Add error boundaries in Suspense.catch(). Implement retry logic with exponential backoff. Show user-friendly error messages.

**No Order Status Updates Real-Time:**
- Problem: Customers place order and see confirmation, but order status changes in admin don't sync to customer view. Customer must refresh to see "ready for pickup."
- Blocks: Poor customer experience for order tracking. Real-time table enabled in Supabase but not used in UI.
- Fix approach: Subscribe to order updates in confirmation page using `supabase.realtime()`. Add polling fallback if WebSocket unavailable.

**No Admin Audit Trail:**
- Problem: Admin edits to menu items, categories, orders have no history. Can't see who changed what or when.
- Blocks: No accountability for admin actions. Can't reverse malicious changes.
- Fix approach: Create `audit_logs` table with admin_user_id, action, table_name, old_value, new_value, timestamp. Trigger on UPDATE statements.

**No Customer Authentication for Order History:**
- Problem: Customers can't check order status after leaving order confirmation page. Only way is to save order number.
- Blocks: Order tracking requires manual order number entry or email link.
- Fix approach: Implement email-based order lookup. Or add optional customer account creation after order.

**No Mobile App or PWA:**
- Problem: Site not installable. No offline support. Ordering requires live internet and visiting site in browser.
- Blocks: Can't reach customers who prefer app experience. No offline menu browsing.
- Fix approach: Add PWA manifest and service worker for offline menu caching. Consider native app later if needed.

---

## Test Coverage Gaps

**No Tests for Order Validation Logic:**
- What's not tested: `src/app/api/order/route.ts` validates business hours, item availability, and prices. No unit tests verify validation logic catches invalid orders.
- Files: `src/app/api/order/route.ts` (entire file)
- Risk: Invalid orders could be saved if validation logic has bugs. Recent commit (de0b1c8) added validation but no test coverage visible.
- Priority: **High** — Order validation is critical business logic

**No Tests for Menu Item Status Transitions:**
- What's not tested: 3-state status enum (available/sold_out/hidden) and transitions between states. No test verifies old `available` boolean migrations correctly.
- Files: `src/components/admin/menu-item-row.tsx`, `src/app/admin/(dashboard)/menu/actions.ts`
- Risk: Status enum changes introduced in migration could have edge cases. If hidden items show up in menu, or sold-out items don't show status badge, tests would catch it.
- Priority: **High** — Menu display depends on status

**No Tests for Image Upload:**
- What's not tested: Image upload form, file validation, size limits, Supabase bucket upload, error handling.
- Files: `src/components/admin/menu-item-form.tsx` (lines 68-88)
- Risk: Upload failures could silently fail. File size bombs could bloat storage. Non-image files could be uploaded.
- Priority: **Medium** — Image upload is admin-only and less critical than customer-facing features

**No Integration Tests for Google Places Sync:**
- What's not tested: Google Places data fetch, rating calculation, review carousel display with actual API data.
- Files: `src/lib/google-places.ts`, `src/app/[locale]/page.tsx`
- Risk: If API response schema changes, homepage reviews section breaks. Rate limiting could cause errors.
- Priority: **Medium** — Mitigated by in-memory cache fallback

**No E2E Tests for Order Flow:**
- What's not tested: Customer adding items to cart, filling checkout form, placing order, seeing confirmation, and order appearing in admin dashboard.
- Files: Multiple (menu, order, API routes, admin dashboard)
- Risk: Regression in order flow could go unnoticed until customers report issues. Recent fixes (E1-E5 commits) would have benefited from E2E test coverage.
- Priority: **High** — Order flow is core business value

**No Accessibility Tests (a11y):**
- What's not tested: Screen reader compatibility, keyboard navigation, color contrast, focus management, ARIA labels.
- Files: All components
- Risk: Site may not be accessible to users with disabilities. WCAG violations for reduced motion already identified.
- Priority: **Medium** — Required for compliance and inclusivity

---

## Visual & Design Quality Issues

**Inconsistent Spacing and Sizing Across Sections:**
- Problem: Section padding is wildly inconsistent: Featured uses `py-24 sm:py-32`, Reviews uses `py-24 sm:py-32`, About uses `py-28 sm:py-36`, Hours uses `py-24 sm:py-32`. Featured cards are `h-52`, skeleton placeholders are `h-80`. No design token system.
- Impact: Visual rhythm broken. Sections feel ad-hoc rather than cohesive. User said "visuals are very bad."
- Files: `src/app/[locale]/page.tsx` throughout
- Fix: Define spacing scale (xs, sm, md, lg, xl) as CSS variables. Use consistently across all sections.

**Hardcoded Colors Break Brand Consistency:**
- Problem: Primary dark green is `#2D5A3D` (hardcoded in 5+ places), cream background is `#f2ead5` (3+ places). If brand colors change, requires multiple updates and potential misses.
- Impact: Difficult to maintain brand identity. Visual polish degrades as colors diverge.
- Files: `src/app/[locale]/page.tsx`, `src/app/globals.css`
- Fix: Define color tokens in Tailwind config: `--color-cafe-dark: #2D5A3D`, `--color-cafe-cream: #f2ead5`. Use throughout.

**Review Carousel Cards Have Fixed Width:**
- Problem: Review cards are `w-[360px]` hardcoded. On smaller screens, overflows and scrolls awkwardly. On large screens, cards could be larger.
- Impact: Poor responsive design. Looks broken on phones < 360px width.
- Files: `src/app/[locale]/page.tsx` (line 330)
- Fix: Make width responsive with `sm:w-[360px] w-[280px]` or use CSS Grid with auto-fit.

**Typography Lacks Clear Hierarchy:**
- Problem: Heading font sizes are hardcoded: featured title is `text-4xl sm:text-5xl`, reviews title is `text-4xl sm:text-5xl`, about title is `text-4xl sm:text-5xl`. All look identical, no visual distinction.
- Impact: Content hierarchy unclear. Users can't scan page for importance.
- Files: `src/app/[locale]/page.tsx` (lines 213-217, 296-299, 398-401)
- Fix: Define heading scales (h1, h2, h3) with distinct sizes. h1 for main hero, h2 for section titles, h3 for subsections.

**Button Styling Inconsistent:**
- Problem: Hero CTA button has shadow and large size (`h-14 rounded-full px-10`), featured "View Full Menu" button is standard outline (`rounded-full px-6`), reviews badge is small (`px-4 py-2`). No button size/style system.
- Impact: Buttons don't feel like a cohesive component library. Hard to identify primary vs secondary actions.
- Files: `src/app/[locale]/page.tsx` (lines 150-156, 224, 309)
- Fix: Define button size tokens (sm, md, lg) and variant tokens (primary, secondary, ghost). Use consistently.

**Google Icon Hardcoded in Multiple Places:**
- Problem: `GoogleIcon` SVG component defined in page.tsx (lines 103-112). Duplicated inline in multiple components.
- Impact: Icon colors hardcoded (Google's official colors). If icon needs resizing, updates in multiple places.
- Files: `src/app/[locale]/page.tsx` (lines 103-112, 183, 311, 351, 371, 428, 441)
- Fix: Move `GoogleIcon` to `src/components/icons/` as reusable component. Accept size and color props.

**Star Rating Component Hard to Style:**
- Problem: `Stars` component uses `text-amber-500` hardcoded color. Star size is determined by `h-4 w-4` or `h-5 w-5` class. Hard to customize globally.
- Impact: If brand color changes or star size needs adjustment, requires multiple updates.
- Files: `src/app/[locale]/page.tsx` (lines 85-99)
- Fix: Accept color and size props. Move to `src/components/ui/stars.tsx`.

**No Design System Documentation:**
- Problem: No Storybook, no component gallery, no design tokens file. New developers can't reference official component usage.
- Impact: Inconsistent implementations of buttons, inputs, cards across pages and admin.
- Files: Entire codebase
- Fix: Create `DESIGN_TOKENS.md` documenting colors, spacing, typography, shadows. Consider Storybook for complex components.

---

## Admin UI Quality Issues

**No Input Validation Messages:**
- Problem: Form inputs don't show validation errors inline. Submit fails silently or shows generic alert.
- Files: `src/components/admin/menu-item-form.tsx`, `src/components/admin/settings-form.tsx`
- Impact: Admins don't know why form submission failed.
- Fix: Add error boundaries, show field-level error messages with red text/border.

**Menu Item Modifiers UI Complex:**
- Problem: Modifiers section allows adding/removing modifiers and options dynamically, but no drag-to-reorder. Adding/removing deeply nested items uses index-based state mutations (error-prone).
- Files: `src/components/admin/menu-item-form.tsx` (lines 95-125)
- Impact: Complex UX for admin. Easy to accidentally delete wrong modifier or lose data on errors.
- Fix: Use form library like `react-hook-form` with nested array support. Add drag reordering. Show confirmation before delete.

**Status Dropdown in Menu Row Limited:**
- Problem: Status dropdown in `MenuItemRow` uses native `<select>` with inconsistent styling across browsers. No visual feedback during status change.
- Files: `src/components/admin/menu-item-row.tsx` (lines 76-85)
- Impact: Admin interaction feels unpolished.
- Fix: Replace with custom styled dropdown or `shadcn/select` component. Show loading state during mutation.

---

## Database Schema Concerns

**No Constraints on Order Totals:**
- Problem: Order total is stored as numeric field with no check constraint that validates total = subtotal + GST + QST. If client tampers with order payload, database accepts invalid totals.
- Files: `supabase/migrations/001_initial_schema.sql` (lines 63-66)
- Impact: Could accept orders with incorrect totals, breaking business logic.
- Fix: Add CHECK constraint: `CONSTRAINT valid_total CHECK (total = subtotal + tax_gst + tax_qst)`

**Menu Items Don't Track Discount or Promotions:**
- Problem: Menu schema has no field for discount, promotion, or seasonal pricing. Requires code changes to offer sales.
- Files: `supabase/migrations/001_initial_schema.sql` (lines 17-31)
- Impact: Limited e-commerce flexibility.
- Fix: Add `discount_percent`, `discount_valid_until`, `is_promotional` fields.

**Audit Trail Missing:**
- Problem: No way to track admin edits to categories, menu items, or cafe info. No created_by, updated_by fields.
- Files: All schema tables
- Impact: No accountability. Can't reverse malicious changes.
- Fix: Add `created_by`, `updated_by` fields to menu_items, categories, cafe_info. Create `audit_logs` table.

---

*Concerns audit: 2026-04-26*
