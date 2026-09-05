# DX design conformance review

- Plan: `docs/plans/2026-08-15-001-refactor-dx-design-conformance-plan.md`
- Design contract: `DESIGN.md`
- Review completed: 2026-08-24
- Independent reviewer: DX design-review subagent (Pascal)
- Final verdict: pass-with-findings
- Blocking findings: none
- Standing overrides: TYP-1 (L1), SLP-10 (L1), both approved by Jeongwon Do
- Deferred launch gate: café-owner validation or replacement of the silent sample-data fallback (CNT-4)

## Verification summary

- `npx tsc --noEmit`: pass
- `npm run lint`: pass
- `npm run build`: pass as part of the production Playwright server command
- `.dx/design.json` freshness: pass
- component manifest validation: pass with declared partial coverage
- token audit: pass
- accessibility static scan: pass
- resolved contrast scan: pass
- TSX typography scan: pass
- full typography scan: five known false positives on display/heading/label line-height token definitions in `globals.css`; no body-copy failure
- production Playwright: 14 passed, 1 deliberately gated authenticated-mutation skip
- gallery Playwright: 1 passed
- real customer orders or admin mutations: none
- plan-fidelity check: `src/app/api/order/route.ts` and `src/lib/supabase/analytics.ts` are byte-equivalent to the pre-plan baseline

## Evidence matrix

| Benchmark decision | Route / locale | Viewport | Auth prerequisite | Safe target / fixture | State reached | Behaviour parity | Accessibility | Pass threshold | Visual verdict | Artifact / link |
|---|---|---:|---|---|---|---|---|---|---|---|
| Lune appetite hierarchy + BOSSA local trust + Blank Street ordering loop | `/en`, `/fr` | 320, 768, 1440 | None | Existing public data path; no mutation | Hero, open/place proof, featured menu, review, visit, footer, mobile navigation | EN/FR routes, locale switch, cart link, and public navigation preserved | Skip link, language state, focus, touch targets, reduced motion, no overflow | All shell assertions pass at every locale/width | Strong | `tests/e2e/storefront-design.spec.ts`; local captures `/private/tmp/cafe-le-den-review-home-{360,768,1280}.png` |
| Chipotle modifier clarity + Starbucks pickup/review + Uber Eats cart recovery | `/en/menu`, `/fr/menu` → order | 320 | None | Sample menu fallback; persisted browser cart; no backend write | Category selection, item Dialog, modifiers, quantity, add, cart removal, Undo | Item/modifier/cart shape and persistence preserved | Dialog focus trap/return, pressed states, 44px controls, localised Undo | Both locale flows pass | Strong | `tests/e2e/storefront-design.spec.ts` |
| Starbucks confirmation/recovery + Uber Eats failure recovery | `/en/order` | 360 | None | Synthetic customer and cart; intercepted order API failure/success | Validation, loading, actionable failure with cart preserved, success redirect | Request payload shape preserved; server text never rendered; no real submit | Associated errors, single focus channel, busy state, recovery | Loading/error/success evidenced; API intercept only | Strong | Local captures `/private/tmp/cafe-le-den-review-order-{loading,error,success}-360.png` |
| Starbucks confirmation truth | `/en/order/confirmation` | 360 | None | Synthetic `E2E-REVIEW-101`; no lookup required for fallback | Order reference, pickup truth, pay-in-person truth, return path | Query parameter and direct-entry fallback preserved | Descriptive title, heading order, readable reference | Confirmation state visible with no overflow | Strong | `/private/tmp/cafe-le-den-review-order-success-360.png` |
| Toast control-tower IA + Square status clarity + Lightspeed density stress | `/dev/admin` preview | 360, 768, 1280 | Explicit auth-free preview flag | Synthetic orders/menu/categories/settings; server actions not invoked | KDS, status cards, tables, analytics empty/error, category draft discard, settings guard | Production components render with unchanged action interfaces | Semantic headings/table, focused recovery, sticky header, draft protection, no overflow | Preview regression passes at 320; visual captures pass | Strong | `tests/e2e/admin-design.spec.ts`; local captures `/private/tmp/cafe-le-den-review-admin-{360,768,1280}.png` |
| Square/Toast operational entry | `/admin/login` | 320, 768, 1280 | None | Intercepted invalid auth response for error case | Form, pending/error recovery, keyboard traversal | Existing auth contract and destination preserved | Labels, autocomplete, focus, 44px targets, announced error | Three login tests pass | Strong | `tests/e2e/admin-design.spec.ts`; local captures `/private/tmp/cafe-le-den-review-admin-login-{360,1280}.png` |
| Toast/Square authenticated operations | Admin dashboard/menu/orders/settings | Desktop + mobile target | Seeded non-production Supabase account required | Not supplied; production mutation explicitly forbidden | Static/server rendering and safe preview only | Code paths inspected; mutation parity not claimed | Pending/error/draft states inspected | Must skip unless explicit safe target variables are set | Unverified by design | Explicit gated row in `tests/e2e/admin-design.spec.ts` |
| Shared design-system conformance | `/dev/components` | Desktop | None | In-repository component gallery | Stable primitives, variants, status and form patterns | Shared APIs preserved | Focus, contrast, reduced motion and semantic roles | Gallery Playwright 1/1 | Strong | `tests/e2e/gallery-design.spec.ts`; `.dx/component-manifest.json` |

The PNG evidence contains only public café information or synthetic people/orders. It remains private under `/private/tmp`, is never staged, and should be deleted when the review branch is merged or closed. No authentication state, session-bearing trace, or real customer PII is linked.

## Independent reviewer verdict — verbatim

VERDICT: pass-with-findings

BLOCKING (must fix before ship):
- None.

ADVISORY (should fix):
- Real café data is authoritative or explicitly labelled illustrative (CNT-4) — `src/lib/data.ts` still silently falls back to `sample-data.ts` for menu items, opening hours, address, and phone without an in-product illustrative label or named café-owner sign-off. Deferral is appropriate for this visual refactor, but the data-authority gate must remain recorded before public launch.

SUGGESTIONS (not violations — layout/pattern improvements the builder may take):
- Give the desktop hero’s pickup action a more distinct filled surface against the forest background — this would improve dominant-action recognition.
- Consider compact mobile section navigation for the long admin dashboard — this would reduce traversal time without changing operational policy.
- In a future approved polish pass, test reducing established static card chrome to headings, spacing, and dividers where comprehension remains intact.

QUALITY GRADES: design quality strong — the storefront is appetite-led and locally distinctive while admin screens are dense, calm, and task-led; originality acceptable — Café Le Den has a specific restrained identity, though established card composition remains conventional; craft strong — responsive, bilingual, loading, error, undo, focus, draft-safety, motion, typography, and recovery details are deliberately resolved; functionality strong — customer ordering and recovery complete safely, filters recover, cart removal is reversible, and admin drafts are protected. Dark mode: N/A — the product contract is light-only.

CONTROL LEDGER DELTAS FROM PRIOR VERDICT:
- A11Y-11 fail → pass — the orders error boundary now focuses its labelled recovery section on mount using `tabIndex={-1}` and a visible focus treatment; no live region is added, so focus is the single announcement channel.
- CNT-13 fail → pass — both “favourite” and “savoury” now follow the declared British-base spelling.
- All previously resolved deltas remain resolved: CMP-2, CMP-3, CMP-8, CNT-5, CNT-10, R2 plan fidelity, MOT-1, MOT-2, SLP-6, LAY-6, and the approved scoped SLP-10 override.

CONTRACT COMPLIANCE:
- R1 met — `DESIGN.md` and the fresh `.dx/design.json` define and project the ten-section design language.
- R2 met — order API and analytics behaviour are byte-equivalent to the pre-plan baseline; customer/admin semantics and action boundaries remain preserved.
- R3 met — customer screens are appetite-first, locally grounded, mobile-first, and consistent from home through confirmation.
- R4 met — admin screens are neutral, dense, high-contrast, and operationally scannable without new queue policy.
- R5 met — semantic colours, approved typography, and tabular operational figures are consistently applied.
- R6 met — the validated partial manifest honestly declares shared primitives and specialised composites.
- R7 met — reduced motion, visible focus, bilingual resilience, and distinct loading, empty, error, and recovery states are evidenced.
- R7.1 met — modified controls preserve names, states, associated errors, single-channel announcements, overlay focus, touch targets, and draft safety.
- R8 met — no recurring cost, framework swap, or new runtime dependency is introduced.
- R9 met — Fraunces/Inter remains the only UI type pair under the approved TYP-1 override.

PLAN FIDELITY:
- Met — API and analytics drift is reverted. The focused item Dialog follows the approved plan and is captured as a scoped SLP-10 override with a named L1 approver.

INTERACTIVE CONTROL INVENTORY:
- Customer shell/home — skip link; wordmark/home, Home, Menu, cart, pickup, featured-item, menu, proof, review, phone, directions, social, and footer links; desktop language radio menu; mobile language pressed controls; mobile Sheet open/close/navigation; announcement dismiss; review rail; sticky pickup action.
- Menu/order — category pressed controls; available and disabled sold-out menu items; item Dialog/close; modifier selections; quantity decrement/increment; add-to-order; cart quantity/remove controls; localised Undo; pickup-time selections; name/phone inputs; place-order/loading control; error recovery; empty-cart menu link; confirmation back-to-menu.
- Admin — login fields/submit; desktop/mobile navigation; sign out; KDS status/cancel actions and confirmation Dialog; analytics period/retry; date/search/status filters with transition state; orders loading and focused error recovery; table/detail links; menu status/edit/delete; photo and menu-item form controls; category save/delete/add/discard controls; settings switches, time/contact/announcement/tax fields, save/cancel.

STANDING OVERRIDES:
- TYP-1, L1 — “Display and headings use Fraunces at 500/600; body and UI use Inter at 400/500/600; no third UI typeface.” Approver: Jeongwon Do.
- SLP-10, L1 — “Menu-item customisation remains a focused Dialog within the browse-to-cart flow.” Scope: one item’s configuration, modifier state, quantity, focus trap/return, and one add-to-order action. Approver: Jeongwon Do.

JUDGMENT CONTROL NOTES (one line per in-scope judgment/hybrid control):
- Structure is programmatically determinable (A11Y-7) pass — headings, landmarks, lists, fieldsets, labels, and semantic tables describe their content.
- Custom controls expose name, role, and value (A11Y-8) pass — language, category, modifier, pickup-time, Tabs, Select, Switch, Dialog, and Sheet states track visually and programmatically.
- Async announcements and focus use one channel (A11Y-11) pass — field errors focus their associated inputs, checkout errors focus the summary, and the orders error focuses its labelled recovery section; none combines focus with a live region.
- Aligned or changing numbers use tabular figures (TYP-5) pass — prices, totals, time, counts, ages, taxes, and analytics figures use tabular numerals.
- Running text has a comfortable measure (TYP-6) pass — customer and admin prose remains width-constrained.
- Brand moments use Café Le Den’s primary colour (COL-1) pass — forest leads actions and framing while orange remains an accent.
- Base UI components are used where available (CMP-1) pass-with-caveat — manifest validation and code inspection confirm declared primitives; partial coverage cannot prove future undeclared one-offs.
- Destructive actions show consequences and recovery (CMP-2) pass — admin destructives confirm consequences and cart removal offers localised one-step Undo.
- Async transactions show loading, success, and error (CMP-3) pass — checkout, filters, route loading/error, login, forms, menu actions, and analytics expose the required states.
- Empty states clearly mean no content (CMP-4) pass — customer and admin empty states pair explicit headings/subtext with no loading chrome.
- Each view has at most one primary action (CMP-5) pass — pickup, place-order, save, retry, and status actions lead without competing filled actions.
- Data tables use the table pattern (CMP-6) pass — headers/rows are semantic, numeric values align, and headers remain visible.
- Components remain consistent with system defaults and siblings (CMP-7) pass-with-caveat — shared primitives remain coherent; established static-card use remains a future design question.
- Drafts have safe exits and interruption handling (CMP-8) pass — menu, settings, and category drafts guard interruption and provide explicit confirmed discard/reset.
- Cross-user content is escaped at render time (CMP-9) pass — authored text renders through React text boundaries.
- Errors explain what happened and what to do next (CNT-1) pass — visible errors are actionable and do not render raw server text.
- Feature and page names use plain language (CNT-2) pass — Menu, Orders, Analytics, Categories, and Settings remain direct.
- Copy is active, direct, and short (CNT-3) pass — visible sentences follow the short active pattern.
- Real-world content is faithful or labelled illustrative (CNT-4) fail — sample café facts remain unlabelled and lack owner sign-off.
- Action words name the action rather than the device (CNT-5) pass — menu actions use “View menu”; no device-bound instruction remains.
- Copy omits low-value filler (CNT-6) pass-with-caveat — visible primary copy is concise; technical/server strings are not presented as primary UI.
- Descriptive copy leads with purpose (CNT-7) pass — ordering, empty, error, visit, and admin helpers state outcome or task first.
- Copy favours action verbs (CNT-8) pass — Browse, Choose, Place, Save, Retry, Return, and Discard are concrete.
- Copy is clear and contains one idea per sentence (CNT-9) pass — recovery and operational guidance are brief and unambiguous.
- One term names each thing (CNT-10) pass — English menu navigation consistently uses “View menu”.
- UI terms follow established vocabulary (CNT-11) pass — Search, Settings, Orders, Menu, and Categories use conventional terms.
- Copy uses sentence case (CNT-12) pass — headings, labels, actions, states, and toasts avoid decorative all-caps.
- Copy is proofread in the declared dialect (CNT-13) pass — “favourite” and “savoury” use the required British-base forms.
- Voice and contextual tone fit (CNT-14) pass — customer success/error/undo copy is warm and calm; admin copy is concise and operational.
- Motion never carries meaning alone (MOT-3) pass — text, icon, and state meaning remains with animation disabled.
- Product tone keeps a calibrated register (IDN-3) pass-with-caveat — Café Le Den is not in the portfolio table, so its explicit product contract was used.
- Copy avoids AI-writing tells (SLP-9) pass — visible copy contains no buzzword, em-dash-chain, filler, or redundant helper pattern.
- Complex tasks follow the approved scoped Dialog rule (SLP-10) pass — the recorded override covers one item’s modifiers, quantity, focus trap/return, and add action.
- Cards represent interactive or focused task units (SLP-11) pass-with-caveat — interactive cards and focused form containers fit documented exceptions.
- Layout follows the declared grid and gutters (LAY-1) pass — customer, footer, checkout, and admin divisions use the 12-column composition and token gaps.
- Layout reflows without loss at 320 CSS px (LAY-2) pass — production tests cover 320/768/1440 without horizontal overflow or lost controls.
- Surfaces map to known page templates (LAY-3) pass — storefront, checkout, confirmation, dashboard, table, form, settings, loading, error, and empty states are recognisable.
- Density suits the task (LAY-5) pass — customer spacing supports browsing while admin density supports scanning.
- Shared and optical edges align (LAY-6) pass — declared spans align and narrow confirmation references retain sufficient width.
- Reading order matches task priority (LAY-7) pass — appetite/place/action leads customer screens and queue/status/action leads admin screens.

VERIFICATION LEDGER (one row per in-scope control — the record pastes this verbatim):

| Control | Method | Evidence |
|---------|--------|----------|
| A11Y-1 | script | Resolved contrast scan clean; supplied frames checked for unresolved text/UI pairs. |
| A11Y-2 | script | `a11y-static.py` clean; production keyboard/focus tests pass. |
| A11Y-3 | script | `a11y-static.py` clean; visible labels and icon-control names confirmed. |
| A11Y-4 | manual | Production tests cover 44 px touch targets at narrow widths; shared sizing inspected. |
| A11Y-5 | manual | Reduced-motion production test passes; global guard disables non-essential animation. |
| A11Y-6 | manual | Meaningful images have alternatives and decorative icons/doodles are hidden. |
| A11Y-7 | manual | Headings, landmarks, lists, fieldsets, labels, and table semantics inspected. |
| A11Y-8 | script | Static scan clean; ARIA state tracking manually inspected across custom controls. |
| A11Y-9 | manual | Production tests assert descriptive titles and EN/FR document language. |
| A11Y-10 | manual | Shared layout exposes a keyboard-reachable skip link and main landmark. |
| A11Y-11 | manual | Checkout and field focus tests pass; orders recovery section focuses on mount without an added live region. |
| TOK-1 | script | Token audit and curated detection clean. |
| TOK-2 | script | Token audit clean. |
| TOK-3 | script | Token audit clean. |
| TYP-1 | script | Type scan passes the Fraunces/Inter override with no third face. |
| TYP-2 | script | TSX type scan clean; known CSS token-definition reports are false positives. |
| TYP-3 | script | TSX type scan clean; declared scale projects through typography tokens. |
| TYP-4 | script | Type/code inspection finds no decorative all-caps UI. |
| TYP-5 | manual | Price, total, time, count, age, tax, and analytics classes use tabular figures. |
| TYP-6 | manual | Rendered copy and width constraints remain within comfortable measures. |
| COL-1 | script | Token audit clean; forest/orange product roles confirmed visually. |
| COL-2 | script | Token and resolved contrast scans clean; status meaning is redundant in text/icons. |
| CMP-1 | script | Component-manifest validator passes with honest partial coverage. |
| CMP-2 | manual | EN/FR production tests verify remove message, reachable Undo, and configured-line restoration. |
| CMP-3 | manual | Checkout frames plus filter pending, orders loading/error, form, login, and analytics states verified. |
| CMP-4 | manual | Empty-state DOM/copy contains explicit heading/subtext and no loading chrome. |
| CMP-5 | manual | Filled actions counted per customer/admin view. |
| CMP-6 | manual | Semantic rows/headers, alignment, tabular figures, and sticky header inspected. |
| CMP-7 | manual | Shared primitives compared across sibling customer/admin routes. |
| CMP-8 | manual | Dirty-state hooks, saved/draft reset, explicit discard, and preview regression inspected. |
| CMP-9 | manual | Raw-HTML grep and authored-content render boundaries inspected. |
| CNT-1 | manual | Checkout test rejects server text; customer/admin errors state outcome and recovery. |
| CNT-2 | manual | Visible route, navigation, feature, and state names inspected. |
| CNT-3 | manual | Visible copy inspected for voice and sentence length. |
| CNT-4 | manual | `data.ts` fallback and `sample-data.ts` inspected; no label or owner sign-off found. |
| CNT-5 | manual | Repeated menu CTAs read “View menu”; no device-bound instruction found. |
| CNT-6 | manual | Visible primary copy inspected for empty openers and filler. |
| CNT-7 | manual | Descriptive and recovery copy inspected in context. |
| CNT-8 | manual | Visible copy inspected for nominalisations and passive constructions. |
| CNT-9 | manual | Visible copy inspected for idea density, tense, negatives, noun stacks, and undefined terms. |
| CNT-10 | manual | Repeated action/state/object terminology compared across messages/components. |
| CNT-11 | manual | UI vocabulary compared with conventional product terminology. |
| CNT-12 | manual | Headings, labels, actions, states, and toasts inspected for sentence case. |
| CNT-13 | manual | “favourite” and “savoury” confirmed in `sample-data.ts`; no remaining declared-dialect error found. |
| CNT-14 | manual | Success, error, empty, destructive, and operational tones judged against the product voice. |
| MOT-1 | manual | Open-status infinite pulse removed; remaining interface motion is finite. |
| MOT-2 | manual | Dialog/Sheet and shared motion classes reference declared duration/easing tokens. |
| MOT-3 | manual | Text/icon/state meaning remains when animation is disabled. |
| IDN-1 | manual | Logo/lockup render paths reuse approved repository assets. |
| IDN-2 | manual | No regenerated product-icon family member found. |
| IDN-3 | manual | Customer/admin copy compared with Café Le Den’s declared tone register. |
| SLP-1 | manual | No purple/cyan/glow palette found. |
| SLP-2 | manual | No gradient text found. |
| SLP-3 | manual | No thick side-tab accent cards found. |
| SLP-4 | manual | No unresolved nested-card hierarchy found. |
| SLP-5 | manual | No icon-tile-above-heading default feature template found. |
| SLP-6 | manual | H1/H2 steps are 40/30 = 1.33× and 30/24 = 1.25×. |
| SLP-7 | manual | Responsive frames retain tighter related grouping and larger sectional rhythm. |
| SLP-8 | manual | No bounce or elastic easing found. |
| SLP-9 | manual | Visible copy contains no confirmed AI-writing tell. |
| SLP-10 | manual | Fresh scoped L1 override and current single-item Dialog implementation inspected. |
| SLP-11 | manual | Card-styled regions checked against interaction, established-pattern, and focused-task exceptions. |
| LAY-1 | manual | Declared 12-column spans and token gutters inspected across major layouts. |
| LAY-2 | manual | Production tests cover 320/768/1440 reflow and horizontal overflow. |
| LAY-3 | manual | Routes mapped to known storefront, flow, dashboard, table, form, settings, loading, error, and empty templates. |
| LAY-4 | manual | Running-text columns inspected; none exceeds 80ch. |
| LAY-5 | manual | Storefront browsing density and admin operational density compared at all widths. |
| LAY-6 | manual | Shared edges and updated narrow confirmation-reference width inspected. |
| LAY-7 | manual | Focal and reading order assessed across customer and admin frames. |

UNCOVERED (defects no control covers — feed the ratchet):
- None.
- Evidence boundary, not an uncovered defect: authenticated admin mutations remain deliberately gated because no seeded non-production target was supplied. Final production Playwright otherwise passes 14/14 with one explicit safe skip; build, TypeScript, lint, design projection, manifest, token, accessibility, and diff checks pass without a real mutation.
