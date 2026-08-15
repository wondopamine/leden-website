# Zero-additional-cost operating envelope

**Researched:** 2026-08-15
**Target:** More than 100 pickup orders per day, one Montréal café, guest checkout,
pay in person, and one or a few staff users.

## Decision

The product can operate at this volume with **no new recurring software spend as
a deliberately bounded, best-effort production pilot**, but it cannot honestly be
specified as an SLA-backed or zero-data-loss system. Order count is not the
capacity problem. Provider terms, unbacked-up data, uncapped media, abuse paths,
and notification design are the constraints.

The acceptable zero-cost topology is:

1. Host the commercial Next.js application on **Cloudflare Workers Free**, not
   Vercel Hobby. Keep public assets and as much of the customer surface as possible
   static/cache-first; reserve Worker execution for order submission, authenticated
   admin work, and necessary revalidation.
2. Keep **Supabase Free** for Postgres, fixed-staff password authentication, Storage,
   and Realtime, with strict size/egress monitoring and an off-platform backup.
3. Make the always-open admin order board, Realtime, and a polling fallback the
   primary alert system. Replace per-order Resend mail with Cloudflare Email Service
   sends to a verified café destination, or omit per-order email. Resend Free may
   remain for rare auth recovery or low-frequency digest mail only.
4. Remove live and copied Google review content from the launch dependency. Link
   to the café's Google Maps profile and use café-owned testimonials. A compliant
   live Places integration is optional, billing-enabled, attribution-heavy, and
   must fail without affecting ordering.
5. Keep pay-in-person. Both the zero-cost scope and Cloudflare's Free Service terms
   exclude collecting or processing card data here.

This is viable only if the café already controls a registered domain and at least
one durable destination mailbox. Cloudflare adds no custom-domain hosting or TLS
fee, but it does not eliminate registrar renewal. Without an already-owned domain,
the strict-$0 fallback is a `workers.dev` address and materially weaker branded
email.

## Why the current deployment assumptions cannot ship unchanged

| Current assumption | Finding | Required decision |
| --- | --- | --- |
| Vercel Hobby can host the café | **No.** Vercel restricts Hobby to personal, non-commercial use. Its fair-use examples explicitly classify advertising a product/service and requesting or processing payment as commercial. A café storefront and pickup-ordering app is commercial even though payment happens in person. | Move production hosting to Cloudflare Workers Free, self-host on already-owned infrastructure, or accept a paid Vercel plan outside this map. |
| One Resend email per order | **No at the target.** Resend Free is capped at 100 transactional emails/day and 3,000/month. More than 100 orders/day necessarily exceeds the daily cap and normally the monthly cap. Extra recipients also each count. | Per-order Resend mail cannot be a required order-alert path. Use the admin board plus polling, and optionally Cloudflare's free sends to verified destination addresses. |
| The Google Places fallback is safe | **No.** The repository permanently stores reviews copied from Google/another scraper and caches live Places content for 24 hours. Google prohibits scraping, copying/saving user reviews, and caching Places content except narrow exceptions such as Place IDs. The UI also lacks each review's required author avatar/profile attribution and direct source-review link. | Delete the copied Google review/rating fallback before launch. Use owned testimonials and a plain Google Maps link, or rebuild a compliant live integration. |
| Supabase Free is production-reliable by itself | **No.** It is commercially usable, and the numerical limits fit the launch volume, but Free has no uptime SLA, downloadable automatic backups, email support SLA, or immunity from inactivity pausing. | Treat it as best effort, add external backups and explicit outage behavior, and never promise uninterrupted ordering or zero data loss. |
| Anonymous direct order inserts are harmless | **No.** The current RLS policies allow anonymous clients to insert directly into `orders` and `order_items`, bypassing the server route's price, hours, and shape checks. That exposes the 500 MB database and free quotas to cheap abuse. | Remove anonymous insert policies; accept orders only through the server endpoint; add idempotency, request throttling, and server-validated Turnstile. |

## Service-by-service envelope

### Hosting and rendering

Cloudflare's agreement supports use by an entity and does not impose Vercel
Hobby's non-commercial restriction. It can terminate a Free Service at its
discretion and disclaims liability for Free Services, so this is not an SLA.
Cloudflare also prohibits processing or collecting card information on properties
using Free Services; the existing pay-in-person model remains compatible.

The official Cloudflare OpenNext adapter supports the Next.js App Router, route
handlers, React Server Components, SSR, SSG, ISR, server actions, middleware, and
image optimization. The relevant Free limits are:

- 100,000 Worker requests per day, resetting at 00:00 UTC;
- 10 ms CPU per Worker invocation and 128 MB memory;
- 50 external subrequests per invocation;
- Error `1027` after the daily request limit and error `1102` when CPU is
  consistently exceeded;
- requests to correctly routed static assets are free and unlimited, with up to
  20,000 static assets per Worker version and 25 MiB per asset.

At 100-150 orders/day, the order API itself is negligible relative to 100,000
requests/day. The risk is accidentally invoking Next SSR for every public asset or
page view and exceeding 10 ms CPU during SSR/auth work. The architecture must
measure the built Worker in preview, use static-first routing, and ensure public
assets continue to serve without invoking the Worker. Crossing a hard limit must
disable order/admin requests rather than create a bill.

### Database, guest orders, authentication, and Realtime

Supabase's terms permit business use; Free is not restricted to non-commercial
projects. Its plan language and missing guarantees still make it a best-effort
tier. Current Free allowances and hard behavior are:

- two active free projects;
- shared Nano compute, up to 500 MB RAM;
- 500 MB database quota; the database enters **read-only mode** after the quota is
  exceeded even though the underlying disk allocation is 1 GB;
- 50,000 monthly active users and unlimited API requests;
- 1 GB file storage;
- 5 GB uncached plus 5 GB cached egress per organization per billing period,
  shared by Database, Auth, Storage, Realtime, and other services;
- 2 million Realtime messages/month, 200 peak connections, 100 messages/second,
  and 256 KB message payloads;
- no downloadable automatic backups or PITR, one-day log retention, no uptime
  SLA, and community support only;
- possible automatic pause after insufficient database activity across seven
  days; a few real queries per day normally prevent it, but a holiday closure can
  still expose this mode;
- default Supabase Auth email is best effort, intended for non-mission-critical
  use, and limited to two emails/hour.

Rough capacity math shows why volume is acceptable but retention must be bounded.
At 100 orders/day there are about 3,000 orders/month and 36,500/year. Even if each
order causes several status events and each event reaches a few staff clients,
normal service traffic remains far below 2 million Realtime messages and 200
connections. Database bytes, indexes, logs, and order-item snapshots accumulate,
however, so no calendar-life estimate should be promised. Monitor actual Postgres
size and begin archive/purge work well before 500 MB (use 350 MB as the operating
warning and 425 MB as the order-stop escalation threshold).

The zero-cost production prerequisites are:

- only the server order route holds the service credential and inserts orders;
  no public direct inserts;
- validate menu items **and modifier options/prices** against database state;
- idempotency per checkout attempt so retries cannot duplicate orders;
- Cloudflare Turnstile Free with mandatory server-side verification, plus a rate
  limit; Turnstile Free permits production use by small/medium businesses and has
  unlimited challenges;
- fixed staff accounts, no public signup, and an explicit admin allowlist/role;
- password auth for daily access; custom SMTP or owner-assisted recovery for the
  rare reset path, rather than relying on Supabase's built-in mail;
- encrypted daily `pg_dump` to storage controlled outside Supabase, plus a
  separate copy of Storage objects and a tested restore procedure. Supabase itself
  recommends regular off-site exports for Free projects and notes that database
  backups do not include Storage objects.

Self-hosting all of Supabase is not the default recommendation. Supabase's own
self-hosting guide makes the operator responsible for provisioning, hardening,
updates, Postgres maintenance, availability, monitoring, backups, and recovery.
It is only a $0 alternative if suitable always-on hardware, Internet, power, and
operations skill already exist. The part that **must** be self-hosted in the
recommended topology is the independent backup/restore copy, not the live stack.

### Images and other media

The current 5 MiB upload ceiling is incompatible with the free envelope. At the
worst case, 1 GB stores only about 200 such files and 5 GB of cached egress serves
only about 1,000 file deliveries. Uploads must be decoded and re-encoded to a
bounded pixel size and byte budget before acceptance; do not trust the filename or
client MIME alone.

Recommended launch policy:

- commit stable hero/story/editorial images as optimized static assets;
- keep a bounded, replace-oriented Supabase Storage library for admin-managed menu
  photos;
- generate a small fixed set of variants on upload, or use Cloudflare Images Free;
  Supabase image transformations are unavailable on Free;
- target roughly 160-300 KiB per menu asset and define a visible placeholder when
  Storage or transformation service is unavailable;
- never let an image failure block the textual menu or ordering.

Cloudflare Images Free includes 5,000 unique transformations/month. Existing
cached transformations continue after the cap, while new ones fail with error
`9422` and are not billed. Cloudflare R2 is a possible later media origin (10
GB-month, 1 million Class A and 10 million Class B operations/month, free Internet
egress), but it becomes usage-billed beyond those allowances. It does not satisfy
a hard no-charge rule unless billing exposure is explicitly accepted and
controlled, so it is not required for launch.

### Notifications

An order must be committed to Postgres before any notification is attempted, and
the response to the customer must not imply that email delivery succeeded. The
current code does not inspect a non-2xx Resend response, so quota errors can be
silent.

The required zero-cost alert layers are:

1. Active admin board with a visible connection-health state.
2. Supabase Realtime for low-latency inserts/updates.
3. Polling every 15-30 seconds when Realtime is unhealthy, with reconciliation by
   order ID rather than append-only UI behavior.
4. Audible/browser alert after staff interaction enables audio, with a prominent
   unacknowledged-order count. The missing notification audio asset must be fixed.
5. Optional Cloudflare Email Service message to a **verified café destination**.
   Such sends are free on Workers Free and do not count toward monthly or daily
   send quotas. They are secondary evidence, not the primary service bell.

Resend Free may send 100/day and 3,000/month, has a default 5 requests/second team
rate limit, and requires an owned/verified domain to send beyond the account's own
address. It is suitable for rare admin password recovery and batched summaries,
not one-email-per-order at this target. Zero-cost customer email/SMS confirmations
are omitted; the customer receives an on-screen order number and the café can call
the supplied phone number manually when recovery is needed.

### Google Places and review content

The safest zero-cost contract is **no Places API dependency**: display café-owned
address/hours, publish testimonials obtained directly with permission, and link
to the Google Maps place page without copying its rating or review text.

If live Google reviews are later considered non-negotiable:

- use Places API (New), store the stable Place ID only, and remove the text-search
  call;
- enable a Google Cloud billing account and restrict the API key;
- request only necessary fields. `rating` and `userRatingCount` trigger Place
  Details Enterprise; `reviews` triggers Enterprise + Atmosphere. That SKU has
  1,000 free billable events/month, then is priced at $25 per 1,000 in the first
  paid tier;
- set a quota below the free cap. Budget alerts do **not** cap spend, while API
  quotas can stop requests (with a small accounting-discrepancy caveat);
- do not cache the returned review/rating content; display required Google and
  third-party attribution, author resources, ordering notice, and direct link to
  each source review; publish terms and privacy pages that incorporate Google's
  terms/policy;
- degrade to the café-owned testimonial/link treatment when the quota or API is
  unavailable.

Because the page can receive more than 1,000 views/month and Google disallows the
server cache the current code relies on, the live-review path is not a dependable
strict-$0 default.

## Required degraded modes

| Failure or threshold | Product behavior |
| --- | --- |
| Cloudflare Worker request/CPU limit | Static public content remains reachable where routing permits. Ordering becomes unavailable with a phone/in-person fallback; never accept a checkout locally for later silent sync. |
| Supabase unavailable or project paused | Serve an explicitly timestamped last-known café-owned menu if available, mark live availability and online ordering unavailable, and show the café phone/address. Staff use the agreed manual order process until resume. |
| Database at warning threshold | Stop nonessential history/analytics reads, export and verify backup, archive according to the later retention decision. At the order-stop threshold, disable online orders before the 500 MB read-only state. |
| Realtime disconnected or suspended | Show a persistent disconnected indicator and automatically poll. Reconcile the full active-order set; do not rely only on missed events. |
| Email provider/quota failure | Order stays valid; active board/polling remains primary. Log and surface alert-delivery failure to staff. |
| Storage/egress/transformation limit | Text menu and checkout continue with a local placeholder. Admin photo upload is disabled until capacity is restored. |
| Google quota/API/terms issue | Omit rating/reviews and keep only café-owned content plus a normal Google Maps link. Ordering is unaffected. |
| Domain expires or is not already owned | Use the platform subdomain; branded web/email cannot be claimed as zero-cost. |

## Architecture gates carried forward

The later platform-architecture decision should reject any proposal that lacks:

- Cloudflare OpenNext preview/load measurements proving representative dynamic
  requests stay inside the 10 ms Free CPU envelope;
- hard separation between static storefront delivery and dynamic ordering/admin;
- quota dashboards and warning thresholds for Worker requests, Supabase DB size,
  Storage, egress, and Realtime;
- external automated backups with a restore drill;
- no anonymous database write path, plus idempotency and abuse control;
- Realtime health plus polling reconciliation;
- notification behavior that remains usable after Resend is removed from the
  per-order path;
- owned review/testimonial content and no cached or scraped Google content;
- a café-run manual fallback and an honest customer-facing unavailable state.

If the café requires a contractual uptime commitment, downloadable managed
backups, guaranteed recovery point, uninterrupted ordering during provider
incidents, or vendor support response times, the destination itself must change:
those requirements are incompatible with the current no-new-spend constraint.

## Primary sources

All sources were accessed on **2026-08-15**. Dates in parentheses are the
provider's stated page/document update dates where published.

### Vercel

- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby) (updated 2026-01-07)
- [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines) (updated 2025-09-24)
- [Vercel Terms of Service](https://vercel.com/legal/terms) (updated 2026-06-01)

### Cloudflare

- [Self-Serve Subscription Agreement](https://www.cloudflare.com/terms/) (updated 2025-09-12)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) (updated 2026-07-07)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) (updated 2026-07-28)
- [Next.js on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) (updated 2026-06-05)
- [Static-asset billing and limits](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) (updated 2026-04-23)
- [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) (updated 2026-06-23)
- [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/) (updated 2026-04-16)
- [Mandatory Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) (updated 2026-05-05)
- [Cloudflare Images pricing](https://developers.cloudflare.com/images/pricing/) (updated 2026-07-08)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/) (updated 2026-05-28)
- [Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/) (updated 2026-06-09)
- [Email Service limits](https://developers.cloudflare.com/email-service/platform/limits/) (updated 2026-06-09)

### Supabase

- [Supabase pricing and plan comparison](https://supabase.com/pricing)
- [Billing and Free-plan quotas](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Database and disk-size behavior](https://supabase.com/docs/guides/platform/database-size)
- [Free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Database backups](https://supabase.com/docs/guides/platform/backups)
- [Realtime limits](https://supabase.com/docs/guides/realtime/limits)
- [Egress usage and quota behavior](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
- [Production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Auth email/SMTP limits](https://supabase.com/docs/guides/auth/auth-smtp)
- [Self-hosting responsibilities](https://supabase.com/docs/guides/self-hosting)
- [Supabase Terms of Service](https://supabase.com/terms)

### Resend

- [Account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
- [Pricing](https://resend.com/pricing)
- [Production access](https://resend.com/docs/knowledge-base/does-resend-require-production-approval)
- [Domain verification](https://resend.com/docs/dashboard/domains/introduction)
- [`resend.dev` testing-domain restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)

### Google Maps Platform

- [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing) (updated 2026-07-20)
- [Pricing categories and free usage caps](https://developers.google.com/maps/billing-and-pricing/pricing-categories) (updated 2026-07-20)
- [Places field/SKU billing details](https://developers.google.com/maps/billing-and-pricing/sku-details)
- [Places API setup and billing-account requirement](https://developers.google.com/maps/documentation/places/web-service/get-api-key) (updated 2026-07-20)
- [Cost controls and quota behavior](https://developers.google.com/maps/billing-and-pricing/manage-costs)
- [Places policies and attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms)

This is a product/vendor-terms assessment, not legal advice. Provider terms and
free allowances can change, so these gates must be rechecked immediately before
production launch.
