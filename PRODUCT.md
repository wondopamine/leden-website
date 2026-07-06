# Product

> Seeded from `.planning/PROJECT.md` and `.planning/brand/SPEC.md` (committed brand/product docs from a prior design-consultation). This is the impeccable-format transcription; `.planning/` remains the canonical source.

## Register

brand

<!-- The customer storefront (homepage, menu, order, confirmation) is the primary surface: design IS the product — a marketing storefront that must make a stranger want to visit. The admin dashboard (`/admin/*`) is a secondary product-register surface; override to `product` when working there. -->

## Users

**Primary — the hungry Montrealer on a phone.** A local or passer-by who hears about Café Le Den (a café + sandwicherie) and pulls up the site on mobile, often standing on the street or on transit. They are deciding two things in seconds: *is this place real and good?* and *can I grab something without friction?* They are rushed, skimming, and skeptical of generic restaurant sites. Bilingual EN/FR is a genuine operational reality, not decoration.

**Secondary — café staff (admin).** One or a few authenticated staff managing the menu (available / sold-out / hidden), incoming pickup orders (>100/day target), and café info. English-only, desktop-first, density and reliability over delight.

## Product Purpose

Café Le Den is a real Montreal café and sandwicherie. The website is a bilingual customer-facing storefront for menu browsing and **pickup ordering** (no payment online, no accounts, guests only), plus an internal admin dashboard. The brand identity — chunky friendly logo, cream/forest/orange palette, hand-drawn watermelon mascot — already exists and is strong; the website has failed to live up to it.

**Success** = a phone user lands on the homepage and thinks *"this place is real, I want to go here,"* then places a pickup order without friction. Visual quality and order-flow reliability are the two gates; everything else serves them.

## Brand Personality

Three words: **warm, handmade, confident.** Voice is friendly-direct, first-person plural ("we"), 8–14 word sentences, food-forward nouns, no exclamation marks, EN/FR parity (FR copy ≤ 1.15× EN length). Not slick or corporate; not twee or apologetic. The watermelon mascot is a wink, not a gimmick. The feeling: a neighbourhood spot that takes its sandwiches seriously and doesn't need to shout about it.

## Anti-references

- **Generic template restaurant sites** — Wix/Squarespace food templates, stock-smile hero photos, "Welcome to our restaurant!" copy.
- **Unsplash filler** — no borrowed lifestyle stock; warm real product photography only, no human-face hero shots in v1.
- **Sterile minimalism** — not a cold Helvetica-on-white SaaS look; the brand is handmade and warm, not clinical.
- **AI slop tells** — identical card grids, gradient text, glassmorphism-by-default, side-stripe accent borders, the hero-metric template, em dashes in copy.
- **Over-animation** — no parallax, no scroll-jacking, no motion that blocks ordering.

## Design Principles

1. **Serve the logo, don't reinvent it.** The palette and mascot are the established brand truth; the site earns its quality by living up to them, not by inventing a new identity.
2. **The phone is the product.** Every decision is judged at 320px in a rushed thumb-driven context first, desktop second.
3. **Real over decorative.** Real menu items, real reviews, real hours, real photography. Personality comes from craft and voice, not ornament.
4. **Frictionless is a feeling.** The path from "I want this" to "order placed" should feel effortless and trustworthy; reliability of the order flow is non-negotiable.
5. **Tokens are the single source of truth.** Color, type, spacing, radius, shadow, and motion flow from one token layer; no raw hex or off-scale values leak into pages.

## Accessibility & Inclusion

- **WCAG AA** color contrast on all text pairings (hard gate; Lighthouse a11y ≥ 90).
- **`prefers-reduced-motion`** honored on every animation, including staggered hero fade-ups.
- **Keyboard navigable** with visible focus states on every interactive element.
- **Mobile parity at 320px** — no horizontal overflow, no clipped controls on the narrowest phones.
- **Bilingual EN/FR** without missing strings or overflow from longer French copy.
