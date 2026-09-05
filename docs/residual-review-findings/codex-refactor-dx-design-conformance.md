# Residual review findings

Source: compound-engineering code-review run `20260823-235650-dx` on branch `codex/refactor-dx-design-conformance`.

GitHub Issues was detected and authenticated, but external ticket creation was rejected by the environment’s disclosure-safety gate before any issue was created. This tracked file is the durable LFG fallback. Full evidence remains in `.context/compound-engineering/ce-code-review/20260823-235650-dx/`.

## Residual Review Findings

- **P1 — `src/components/order/order-content.tsx:190` — Order rejections prescribe an unsafe retry.** Defer failed: external GitHub issue creation was not authorized. Map the existing order API errors to localized hours, menu-change, service, price-change, and partial-write recovery without changing the API response shape or exposing raw server text.
- **P2 — `tests/e2e/admin-design.spec.ts:313` — Mutation gate passes without testing a mutation.** Defer failed: external GitHub issue creation was not authorized. Keep the placeholder visibly skipped until a seeded non-production Supabase target exists, then replace it with authenticated synthetic mutations and deterministic cleanup.
- **P2 — `src/components/admin/sidebar.tsx:45` — Sign-out runs before the draft guard.** Defer failed: external GitHub issue creation was not authorized. Coordinate the shared sign-out action with active draft guards before clearing authentication.
- **P2 — `src/lib/use-unsaved-changes.ts:79` — Navigation guard cannot cancel some history traversals.** Defer failed: external GitHub issue creation was not authorized. Define and test a Back/Forward strategy for non-cancelable Navigation API events and browser fallback paths.
- **P2 — `src/components/admin/orders-filter.tsx:127` — Filter changes leave a pending search debounce active.** Defer failed: external GitHub issue creation was not authorized. Cancel the pending timer before immediate date/status navigation and assert that only one route transition occurs.
