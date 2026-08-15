# Customer-facing benchmark decision

**Research date:** 2026-08-15 (Asia/Singapore)
**Target:** Café Le Den's bilingual, mobile-first storefront and guest pickup
ordering flow, with payment at the café and no customer account.

## Decision

Use a focused six-product benchmark set. Each product owns a different question;
none is a visual template for Café Le Den.

1. **Lune Croissanterie** — appetite and first-screen graphic hierarchy.
2. **BOSSA Montréal** — local credibility, physical-place proof, and bilingual
   storefront context.
3. **Blank Street** — a compact coffee-ordering loop and visible error treatment.
4. **Chipotle** — required/optional modifier architecture and transparent deltas.
5. **Starbucks Canada** — scheduled pickup choice, review, confirmation, and
   English/French parity.
6. **Uber Eats Pickup** — cart-mode review, order-status communication, pickup
   identity, and recoverability.

This is deliberately a portfolio, not a ranking. Lune and BOSSA answer how a
hungry stranger should feel; Blank Street and Chipotle answer how an item should
be selected; Starbucks and Uber Eats answer how the service promise should be
made and recovered.

Do **not** install Mobbin MCP for this work. Mobbin's own MCP page says MCP access
requires a paid plan, while its public Explore catalog exposes enough individual
shipped screens to validate the relevant Blank Street and Uber Eats patterns.
That preserves the zero-additional-spend constraint.

## What to learn from each

### 1. Lune Croissanterie — make one product irresistible

**Use for:** brand desire, mobile homepage, graphic hierarchy.

The current mobile homepage puts one tightly cropped pastry against a restrained
field, gives `ORDER NOW` the only headline-scale treatment, and lets a few strong
images do the appetite work. Its location-specific menu then uses precise product
names, short sensory descriptions, and explicit dietary notes.

Learn exactly this:

- Give the opening phone viewport one dominant food photograph and one dominant
  pickup action. A sandwich, pastry, or drink should be the visual subject, not a
  generic café lifestyle scene.
- Use crop, scale, light, and negative space to produce appetite before adding
  decorative UI.
- Make menu descriptions concrete: ingredients, preparation, and one sensory
  detail; keep allergen or dietary facts adjacent to the item.
- Allow a seasonal item to create novelty without displacing the permanent menu.

Do not copy Lune's black palette, compressed display type, cinematic luxury
identity, or long stretches of empty scroll. Café Le Den should translate the
same visual conviction into its cream/forest/orange palette, friendly wordmark,
and real sandwich-and-coffee photography.

**Dated sources (accessed 2026-08-15):**
[Lune homepage](https://lunecroissanterie.com/),
[Lune Rosebery menu](https://lunecroissanterie.com/rosebery-menu/).

### 2. BOSSA Montréal — prove that the place is real and local

**Use for:** brand trust, local fit, bilingual content, above-the-fold ordering.

BOSSA is the closest contextual comparator: a Montréal sandwicheria with French
and English routes, food and store photography, an immediate order action, a
short origin story, and concrete location, hours, address, and phone information.

Learn exactly this:

- Put the pickup action beside trust proof: today's open/closed state, hours,
  Montréal address, phone number, and a clear description of what the café makes.
- Use real counter, ingredient, and finished-food photographs to connect the site
  to the physical café.
- Keep a language switch persistent and offer equivalent English and French
  content rather than a decorative French label on an English-only journey.
- Let a brief maker story support the food; it should not precede the user's
  decision to view the menu or order.

Do not copy BOSSA's dense small mobile text, repeated calls to third-party
ordering, mixed-language item naming, or multi-location complexity. It is the
local-context benchmark, not the quality ceiling. Café Le Den's single-location,
direct guest order should remain on-brand and on-site.

**Dated sources (accessed 2026-08-15):**
[BOSSA English homepage](https://www.bossa.ca/),
[BOSSA French homepage](https://www.bossa.ca/fr),
[BOSSA French menu](https://www.bossa.ca/fr/menu).

### 3. Blank Street — keep the coffee-ordering loop short

**Use for:** coffee menu rhythm, item customization, ready feedback, error-state
composition, and negative evidence about inventory recovery.

Blank Street's official product pages describe a flow from nearest location to
coffee/tea/pastry selection, drink customization, order-ahead, and ready
notification. Its public Mobbin screen shows a shipped payment error as a focused
bottom sheet over dimmed order context, so the user is not thrown into an
unrelated page.

Learn exactly this:

- Make repeat café choices quick: recognizable categories, large tap targets,
  short item names, and modifiers close to the drink they affect.
- Preserve the item and order underneath an error. Explain the failed step and
  offer one next action in place.
- Separate store availability from product availability before submission.

Treat Blank Street as an anti-benchmark for recovery copy and inventory drift.
Its Mobbin error leads with the vague `Ooops`, and its help center routes closed
location and sold-out-at-arrival problems to support rather than resolving them
in the order flow. Café Le Den must name the problem, preserve every valid
selection, and offer an immediate alternative item, pickup slot, or retry.

Do not import account signup, stored payment, subscriptions, points, or app-only
reordering. Those contradict Café Le Den's guest, pay-in-person scope.

**Dated sources (accessed 2026-08-15):**
[Blank Street app overview](https://www.blankstreet.com/en-US/app),
[public Mobbin Blank Street payment-error screen](https://mobbin.com/explore/screens/b488ac16-3829-4a66-85fd-0f2926738eef),
[Blank Street order-help index](https://help.blankstreet.com/hc/en-us/sections/10111970779277-ORDERS-DELIVERY),
[closed-location response](https://help.blankstreet.com/hc/en-us/articles/10198111997453-What-happens-if-I-place-an-order-for-pick-up-and-the-location-is-closed),
[sold-out response](https://help.blankstreet.com/hc/en-us/articles/20862063020685-What-happens-if-an-item-is-sold-out-by-the-time-I-arrive).

### 4. Chipotle — make complex customization legible

**Use for:** item configuration, price transparency, required versus optional
choices, and add-to-cart readiness.

The shipped mobile web order builder presents one item as a sequence of named
choice groups. Options expose their names, calorie information, and paid deltas;
the user completes the build before one `ADD TO BAG` action. The official
build-your-own description independently confirms the staged protein, base,
topping, dip, and side model.

Learn exactly this:

- Break modifiers into semantic groups and show which groups are required.
- Put the extra price directly on the option that causes it; update the item
  total and concise selection summary immediately.
- Keep `No …` choices explicit where omission is valid.
- Disable the add action only when a required decision is missing, then point to
  that group instead of emitting a generic error.

Do not copy Chipotle's ingredient volume, long-scroll density, calories-first
visual prominence, or corporate brown identity. Café Le Den needs only the small
set of modifiers staff can reliably honour: for example size, milk, sweetness,
extra shot, heat/toasting, and a bounded set of sandwich add-ons.

**Dated sources (accessed 2026-08-15):**
[live Chipotle burrito-bowl builder](https://www.chipotle.com/order/build/burrito-bowl),
[official Build Your Own description](https://www.chipotle.com/build-your-own).

### 5. Starbucks Canada — make the pickup promise before submission

**Use for:** pickup-slot choice, order review, confirmation, ready notification,
and bilingual parity.

Starbucks' April 2026 description of its shipped scheduled-ordering flow is
specific: build the order, choose `Pickup Time` on `Review Order`, select an
available five-minute window up to one hour ahead, complete the order, then
receive a ready notification. The accompanying official image shows the time
selector, a confirmation with location/items/instructions, and the ready state.
The Canada ordering guide is also available as a substantive French page, not
just a translated navigation label.

Learn exactly this:

- Choose the pickup promise on the review screen, before final submission.
- Show only capacity-backed times; distinguish `As soon as possible` from
  scheduled windows and state when availability changes.
- Repeat the chosen location and time beside the final action and again on the
  confirmation screen.
- Make confirmation durable and scannable: accepted state, order identity,
  pickup time, address/instructions, item summary, and what happens next.
- Give every ordering, validation, status, and recovery message equivalent EN/FR
  treatment while keeping product names intentionally consistent.

Do not copy the account, loyalty, stored-payment, delivery, or drive-through
layers. Do not promise five-minute precision unless Café Le Den's capacity model
can support it; the transferable pattern is **available window before submit**,
not Starbucks' exact time granularity.

**Dated sources (accessed 2026-08-15):**
[Starbucks scheduled ordering, published 2026-04-22](https://about.starbucks.com/press/2026/making-it-easier-to-plan-your-starbucks-visit/),
[Starbucks Canada French ordering and pickup guide](https://fr.starbucks.ca/ways-to-order/),
[Starbucks Canada English ordering and pickup guide](https://www.starbucks.ca/ways-to-order/).

### 6. Uber Eats Pickup — expose order state and a recovery path

**Use for:** cart review, ASAP versus scheduled pickup, confirmation, order
identity, status progression, and service recovery.

Uber's official pickup help describes choosing `Pickup`, choosing ASAP or a
scheduled time, seeing preparation time, changing the mode from the cart, then
receiving acceptance, estimated-ready, and ready-for-pickup updates. It places an
order number on the tracking screen and receipt and exposes direct restaurant
contact. Mobbin's public Uber Eats cancel screen shows structured cancellation
UI using selectable reasons and a text field rather than an unbounded support
dead end.

Learn exactly this:

- Let the cart summarize items, modifiers, quantities, total due at pickup,
  location, and pickup mode/time in one reviewable surface.
- Distinguish `submitted`, `accepted`, `preparing`, `ready`, and terminal failure;
  do not make one success page stand in for all states.
- Give the customer a short human-readable order number plus the name used at
  pickup.
- Keep `Call the café` beside delayed, rejected, or otherwise recoverable orders.
- Ask for a structured cancellation/problem reason before optional free text so
  both the customer and staff can scan what happened.

Do not copy delivery maps, courier states, marketplace discovery, ratings,
digital payment, promotions, or refund language. Café Le Den needs the state
clarity and contact escape hatch only.

**Dated sources (accessed 2026-08-15):**
[Uber Eats pickup-order FAQ](https://help.uber.com/en-GB/ubereats/restaurants/article/pick-up-order-faq?nodeId=50af0e23-5342-4c46-abef-c4d8c2af8638),
[Uber Eats order-status help](https://help.uber.com/ubereats/restaurants/article/check-the-status-of-my-order?nodeId=01d2f4cc-3176-40d6-bf9e-1588e3e83408),
[public Mobbin Uber Eats cancel screen](https://mobbin.com/explore/screens/33f34dbe-86d5-4750-9926-7b8034de8d08).

## Coverage check

| Decision area | Primary benchmark | Secondary check | Café Le Den adaptation |
| --- | --- | --- | --- |
| Brand trust | BOSSA | Lune | Real Montréal address, today's hours, phone, café/food photography, short maker proof |
| Food desire | Lune | BOSSA | One dominant real product crop; cream/forest/orange identity; no stock or dark-luxury imitation |
| Mobile homepage | Lune | BOSSA | Logo + appetite image + open/order facts within the first viewport |
| Menu browsing | Blank Street | BOSSA | Coffee/sandwich categories, short cards, explicit price/availability/dietary data |
| Item customization | Chipotle | Blank Street / Starbucks | Grouped required/optional choices, paid deltas, bounded café-operable modifier set |
| Pickup time | Starbucks | Uber Eats | Capacity-backed ASAP/scheduled choice before submit; no false precision |
| Cart/review | Uber Eats | Chipotle / Starbucks | Items + modifiers + quantities + due-at-pickup total + place/time in one surface |
| Confirmation/status | Starbucks | Uber Eats | Accepted state, order number/name, location, promised time, next step, café contact |
| Errors/recovery | Uber Eats | Blank Street (negative) | Specific cause, preserved state, immediate alternative/retry/contact; never vague `Oops` alone |
| Bilingual/local fit | BOSSA | Starbucks Canada | Route and state parity across EN/FR, persistent switch, French-length testing at 320px |

Every decision area has one owner. This prevents a collage UI assembled from six
brands and gives later prototype reviews a clear answer to “which shipped pattern
are we testing here?”

## Prototype scenarios this decision unlocks

Future customer-facing prototypes should compare against the set using the same
seven scenarios at 320px and a larger phone width:

1. A first-time visitor decides the café is real, open, and worth visiting.
2. The visitor reaches coffee or sandwich choices without hunting.
3. The visitor configures one item and can explain every price change.
4. The visitor reviews a multi-item cart and chooses ASAP or an available slot.
5. The visitor submits a guest, pay-at-pickup order and knows it was accepted.
6. An item or slot becomes unavailable, or submission is uncertain, without the
   visitor losing valid choices or accidentally creating a duplicate order.
7. The visitor switches EN/FR mid-journey without losing cart or status context.

## Mobbin access note

The public Explore catalog was used for the two exact screens linked above. A
paid MCP was unnecessary and was not installed. Mobbin describes MCP as included
on paid plans: [Mobbin MCP page, accessed 2026-08-15](https://mobbin.com/mcp).
Public single-screen evidence is sufficient for composition and taxonomy; the
official product/help pages above are the source of truth for shipped behavior.
