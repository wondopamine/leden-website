## Agent-Native Architecture Review

### Summary

Café Le Den is a human-first Next.js 16 and Supabase ordering application. Repository-wide runtime searches found no LLM SDK, tool registry, function-calling route, system-prompt construction, agent identity, or agent session; the Codex/DX planning artifacts are development workflow only and are not product integration. This incremental branch therefore does not regress an existing agent contract, but under the agent-native rubric every new non-human lifecycle and café-operation capability remains unavailable to agents. Turnstile completion, password/session authentication, and explicit terminal/ordering confirmations are intentionally human-only and must not be bypassed by a future tool surface.

### Capability Map

| UI Action | Location | Agent Tool | In Prompt? | Priority | Status |
|-----------|----------|------------|------------|----------|--------|
| Prepare and submit a customer order | src/components/order/order-content.tsx; src/app/api/order/route.ts:25 | None | No prompt exists | Core, with a human-only final gate | Agent-assisted preparation/handoff is absent; Turnstile completion must remain human-only |
| Recover a receipt and read private order status | src/app/api/order/recover/route.ts:19; src/app/api/order/status/route.ts:20 | None | No prompt exists | Must | Orphan capability; a future agent would need the user-supplied bearer and the same rate/privacy boundary |
| Read and reconcile the staff order board | src/app/api/admin/orders/route.ts:14; src/lib/orders/admin.server.ts:346 | None | No prompt exists | Must | Orphan capability; staff password/session ceremony is intentionally human-only |
| Advance or cancel an order with expected state/version | src/app/admin/(dashboard)/actions.ts:13; src/lib/orders/admin.server.ts:520 | None | No prompt exists | Must | Orphan capability; cancellation/picked-up confirmation must remain human approval |
| Pause or resume online ordering | src/app/admin/(dashboard)/actions.ts:23; src/lib/orders/admin.server.ts:527 | None | No prompt exists | Must | Orphan capability; the explicit operational confirmation must not be silently automated |
| Create or replace a menu/modifier graph | src/app/admin/(dashboard)/menu/actions.ts:159; src/lib/orders/admin.server.ts:565 | None | No prompt exists | Must | Orphan capability |
| Update café hours/contact/lead-time settings | src/app/admin/(dashboard)/settings/actions.ts:24 | None | No prompt exists | Should | Orphan capability |

### Findings

#### Critical (Must Fix)

1. **No product agent boundary exists for lifecycle actions** — package.json:28-61, src/app/api/order/route.ts:25, src/app/admin/(dashboard)/actions.ts:13 — The runtime has human UI, Route Handlers, Server Actions, and Supabase RPCs but no registered agent tools or dynamically constructed prompt. Consequently an in-product agent cannot discover the menu/order/settings nouns, read the same authorized state, or perform any non-human staff/customer lifecycle action. If agent support is a product requirement, introduce a server-only agent boundary with a separately scoped principal and composable tools over the existing DAL: token-scoped status/recovery, authorized order listing, compare-and-set transition, ordering pause/resume, menu-graph mutation, and café-setting mutation. Do not expose the service key or raw tables, and do not let a tool bypass Turnstile, password login, or explicit human approval for terminal/operational actions.

#### Warnings (Should Fix)

1. **No runtime context or capability discovery exists** — src/lib/orders/admin.server.ts:346-385, src/lib/orders/contracts.ts:1 — Even if an agent caller were added around the existing endpoints, there is no system prompt or runtime context describing current menu resources, order-state vocabulary, freshness state, expected-version semantics, private tracking credentials, or which tools are authorized. Add dynamic context only when an agent runtime is introduced: inject the current scoped resources and safe domain vocabulary, while fetching volatile order/menu state through tools instead of copying PII or bearer secrets into a static prompt.

#### Observations

1. **Human-only boundaries are correctly separable** — Turnstile verification at src/app/api/order/route.ts:47-60, staff authorization at src/lib/supabase/admin.server.ts:42-67, and the terminal/ordering confirmation dialogs are not missing agent tools. A future agent may prepare an action and request approval, but the human must complete the challenge/authentication/confirmation.
2. **The branch creates strong future tool seams** — src/lib/orders/repository.server.ts, src/lib/orders/admin.server.ts, and the versioned Supabase RPCs centralize validation, authorization, idempotency, and rich success/error results. These are preferable tool backends to calling React Server Actions or granting direct database access.
3. **Safety-critical workflow encapsulation is justified** — Atomic order creation, modifier-graph replacement, and compare-and-set status transitions intentionally wrap multi-row invariants. They fit the reviewer’s exception for workflow tools that must remain atomic rather than being decomposed into unsafe row-level primitives.
4. **Shared workspace can reuse canonical Postgres state** — Staff reconciliation and customer polling already read the same database state the UI uses, so a future authorized agent can share the workspace without an agent-only store. Realtime/poll reconciliation should continue to make agent mutations visible to humans.
5. **Cosmetic and browser-local controls are out of scope** — Sound toggling, responsive navigation, copy-link presentation, and local session cleanup do not require agent parity.

### What's Working Well

- Authorization and data access are separated from presentation, so future tools can reuse the same staff allowlist and token-scoped customer boundaries.
- Mutations return structured domain outcomes and optimistic versions that an agent could use to verify success and recover from conflicts.
- The order board reconciles canonical state after mutations, allowing future agent changes to become visible without a separate synchronization layer.
- CAPTCHA, staff authentication, and irreversible-action confirmations remain explicit human safety gates.

### Score

- **0/6 non-human high-priority capabilities are agent-accessible**
- **Verdict:** NEEDS WORK if product-level agent integration is intended; otherwise this branch is internally consistent as an intentionally human-only café product.
