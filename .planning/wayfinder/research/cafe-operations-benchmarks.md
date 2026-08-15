# Café operations benchmark decision

Research snapshot: 2026-08-15. The sources below are live product guides from
Toast, Square, and Lightspeed, not marketing mockups. These paid products are
benchmarks only; adopting any of them is not part of the zero-additional-spend
architecture.

## Decision

Use a deliberately small, complementary benchmark set:

1. **Toast Orders Hub** is the primary benchmark for the order control tower:
   status-oriented navigation, queue counts, promised times, compact identity,
   one obvious next action, completed-order lookup, and reopening.
2. **Square KDS, Order Manager, and item availability** are the primary
   benchmarks for service-speed interaction: configurable ticket density,
   age thresholds, new-order acknowledgement, readable modifiers, priority,
   immediate undo/recall, and fast cross-channel sold-out control.
3. **Lightspeed KDS 2.0** is the stress-test benchmark for explicit production
   states and high-volume scanning: FIFO order, New / Preparing / Ready /
   Completed, On hold and Canceled exceptions, delayed/late treatment, notes and
   allergens, status counts, and full versus condensed ticket views.
4. **Square Sales Summary** is the primary benchmark for lean single-café
   reporting, with Toast Sales Summary/Menu Reports used only as a cross-check
   for metric definitions and drill-down patterns.

Mobbin is supplemental for later visual polish, not the source of truth for the
staff workflow. No Mobbin MCP installation is needed for this decision: direct
official documentation exposes the shipped restaurant-specific states and
failure-recovery behavior that a screenshot library cannot establish. In a
future visual-prototype ticket, Mobbin may help compare generic dashboard
navigation, filters, tables, and responsive refinement.

## Why this set

No single product should be copied wholesale. Toast's Orders Hub is a strong
front-of-house control tower but contains delivery and payment machinery Café Le
Den does not need. Square has the clearest small-operator interaction patterns,
but its KDS is a paid, device-oriented product. Lightspeed exposes the best
documented exception-state and density model, but much of its station, table,
and Back Office configuration is enterprise overhead. Together they cover the
real operational risks without turning the admin into a generic POS suite.

## Pattern matrix

| Concern | Benchmark pattern | Café Le Den decision |
| --- | --- | --- |
| Live triage | Toast groups orders by operational state and keeps the due time, customer identity, order number, fulfilment/payment context, and next action together. Lightspeed adds status counts and oldest-first queueing. | The default admin view is a live, chronological ticket board with state-count filters. Due/oldest order is the stable default order; manual priority must be visibly labelled. Do not use drag-and-drop as the only way to progress work. |
| State progression | Toast distinguishes Active, Order Ready, and Completed; Lightspeed documents New > Preparing > Ready to collect > Completed plus On hold and Canceled. | Use the four-stage progression as the benchmark vocabulary. Treat cancel, recall/reopen, and any hold/reject path as explicit exceptions rather than pretending every order only moves forward. The admin-operating-model ticket should decide whether a separate acknowledgement/acceptance step and Hold are actually required. |
| Timer and urgency | Toast shows due and firing times; Square uses configurable yellow/red timer thresholds; Lightspeed flags delayed and late tickets while retaining FIFO order. | Every active ticket shows a large, tabular elapsed timer and promised-pickup time. Thresholds must be configurable, labelled, and expressed with text/icon as well as colour. An overdue order cannot be hidden by filtering or a later manually prioritised ticket. |
| New-order alerts | Square supports a persistent visual alert, a one-time chime, acknowledgement, and a direct path to the new order. Toast uses sound plus visual change cues. | New and cancelled orders need an attention state that persists until acknowledged, plus an optional one-time sound. Do not create alert fatigue for normal status changes. The screen must continue to communicate the alert if browser audio is blocked or muted. |
| Ticket readability | Square lets operators tune columns/text size and assign kitchen names/colours to modifiers. Toast and Lightspeed distinguish items, modifiers, notes, and allergens and support full/dense layouts. | Make the pickup code/order number, due/elapsed time, quantity, item, and exceptional modifier the scan hierarchy. Indent modifiers under their item; distinguish omission, substitution, allergy, and free-text note without a rainbow of colours. Default to the full ticket; only offer compact density if real volume demands it. |
| Completion and recovery | Square supports item or whole-ticket completion, a short immediate undo, then recall from Completed. Toast redisplays recovered work with a `RECALLED` label and preserves original queue time. Lightspeed also gives an immediate undo and completed archive. | One clear next-state action per ticket, an immediate undo, and a searchable recent-completed view are essential. Recall must restore the order with an explicit `Recalled` badge and audit event. Never make accidental completion or cancellation equivalent to deletion. |
| Priority | Square and Toast can move a ticket to the front while visibly marking it as prioritised/rushed. | Priority is an exception action, not a second invisible sort rule. It should require confirmation, remain visibly labelled, and be reversible. It is secondary to preventing overdue orders from being overlooked. |
| Sold-out control | Square separates fast availability from inventory accounting and supports Available, Sold out, or a remaining quantity, with a reset time and channel-wide update. Toast likewise supports In stock, Out of stock, and limited quantity. | Put a fast `Available / Sold out` action in the service workspace for items and modifiers. Allow an optional quantity and reset-at-close/manual reset. Update the customer menu immediately. Keep this rush-time control separate from structural menu editing. |
| Menu administration | Square and Toast distinguish item/menu structure from service-time availability. | The structural editor only needs category, EN/FR name and description, price, image, modifier groups, display order, and active state, with an explicit save/preview path. No purchasing, recipe, vendor, station-routing, or accounting model belongs here. |
| Analytics | Square presents a small set of selectable metrics and comparison periods; Toast uses summary cards with drill-down and top-item reporting. | Provide one lean view: today and recent-period order count, submitted order value, average basket, median time-to-ready, late-order rate, cancellations, hourly demand, and top items. Because guests pay in person, label website totals as **submitted/expected order value**, never settled revenue, unless a later integration establishes payment truth. |

## Essential single-café contract

These are the patterns worth carrying into the later admin operating-model and
prototype decisions:

- A single service home with status counts and the live queue; no dashboard
  detour before staff can see new work.
- Stable ticket identity, customer/pickup identity, requested time, elapsed
  time, items, quantities, modifiers, notes, and one next-state action visible
  without opening a detail page.
- Persistent unacknowledged-new-order state, optional sound, overdue treatment,
  and a visible connectivity/data-freshness indicator.
- Whole-order progression by default. Per-item completion is optional and should
  be added only if observation shows that sandwich/drink preparation genuinely
  needs it.
- Immediate undo, recent-completed archive, recall/reopen, explicit cancellation,
  and an append-only event trail for recovery and accountability.
- A fast service-mode availability control that synchronises the customer menu;
  a separate, calmer structural menu editor.
- A neutral, high-contrast operational canvas. The cream/forest/orange brand can
  frame the admin, but semantic state colours must not compete with decorative
  colour. Every colour state also needs a text label or icon.
- Touch-friendly controls and responsive layouts for an ordinary phone, tablet,
  or laptop browser. The design must not assume a dedicated KDS, bump bar,
  printer, or paid notification service.
- Lean operational reporting whose labels remain honest about pay-in-person
  orders and whose detail can be exported later if needed.

## Useful only after observed need

- Scheduled-order staging or future-order autofire.
- Manual rush priority.
- Per-item completion and a condensed/high-density ticket mode.
- Limited-quantity countdowns instead of a simple sold-out toggle.
- Bulk status actions; they save time at volume but magnify mistakes.
- Staff-specific saved filters or multiple simultaneous service views.

## Enterprise bloat to reject

- Multi-location comparisons, franchise controls, and location-specific menus.
- Prep/expo station graphs, assembly lines, coursing, table/floor/seat/covers
  models, production routing, and device-code administration.
- Delivery marketplace aggregation, dispatch/driver controls, curbside-arrival
  machinery, and third-party channel reconciliation.
- POS payment settlement, tips, cash drawers, tax/accounting reconciliation,
  labour/payroll, loyalty, CRM, and customer accounts.
- Procurement, vendor management, recipes, ingredient-level stock, purchase
  orders, waste/COGS, forecasting, and custom BI/report builders.
- SMS-as-a-required workflow, dedicated KDS hardware, printers, bump bars, or
  any capability whose baseline operation introduces recurring spend.

## Visual benchmark brief

The graphical quality bar should come from operational clarity, not decorative
dashboard chrome:

- Toast: benchmark the compact order summary and state-oriented control-tower
  information architecture.
- Square: benchmark large touch targets, timer prominence, restrained ticket
  density, explicit modifier treatment, and recoverable completion actions.
- Lightspeed: benchmark the full versus condensed comparison, FIFO rhythm,
  labelled status colours, delayed/late escalation, and separate note/allergen
  emphasis.
- For Café Le Den: use generous spacing at normal volume, large tabular numerals,
  a dominant pickup identifier, calm neutral ticket surfaces, and a narrow
  semantic palette. Avoid gradients, ornamental charts, glass effects, and
  colour-only state communication in the service surface.

## Official source record

All links were accessed on 2026-08-15.

### Toast

- [Using Orders Hub](https://doc.toasttab.com/doc/platformguide/platformUsingOrdersHub.html) — statuses, due-time/order information, filters, completion, reopening, and bulk actions.
- [Kitchen display system overview](https://doc.toasttab.com/doc/platformguide/platformKDSOverview.html) — live ticket updates, sound/visual changes, ticket hierarchy, and fulfilment indicators.
- [Interpreting ticket times and fire times](https://doc.toasttab.com/doc/platformguide/adminInterpretingTicketTimes.html) — elapsed ticket and fire timers.
- [Redisplaying tickets with recall and unfulfill](https://doc.toasttab.com/doc/platformguide/adminRedisplayingTickets.html) — recent-completed recovery and explicit recalled state.
- [Configuring tickets](https://doc.toasttab.com/doc/platformguide/platformKitchenConfiguringTickets.html) — item/modifier ordering and high-signal colour treatment.
- [Setting the stock status and count for menu items](https://doc.toasttab.com/doc/platformguide/adminSettingInventoryStatusForMenuItems.html) — in-stock, out-of-stock, and limited-quantity behaviour.
- [Sales Reports Overview](https://central.toasttab.com/articles/Knowledge/Sales-Reports-Overview) and [Menu Report Overview](https://central.toasttab.com/articles/Knowledge/Menu-Report-Overview-1492794696577) — summary-card, order, top-item, and drill-down patterns. These legacy support URLs may redirect, so they are secondary evidence.

### Square

- [Set up Square KDS](https://squareup.com/help/us/en/article/7944-get-started-with-square-kds-android) — layout, columns, text size, yellow/red timers, new-ticket sound, modifier colour/naming, and sorting.
- [Set up order ticket settings](https://squareup.com/help/us/en/article/8322-set-up-order-manager-on-your-point-of-sale) — persistent new-order and cancellation alerts, acknowledgement, and ticket identity.
- [Complete and recall orders with Square KDS](https://squareup.com/help/us/en/article/8171-complete-orders-with-square-kds) — item/ticket completion, immediate undo, completed view, and recall. The page also confirms Square KDS requires a paid subscription, so it is not an adoption candidate.
- [Prioritize orders with Square KDS](https://squareup.com/help/us/en/article/8168-prioritize-orders-with-square-kds) — visible queue priority and a cancellation window.
- [Manage item availability](https://squareup.com/help/us/en/article/8495-beta-item-availability) — available, sold-out, quantity, reset, and cross-channel synchronisation.
- [View sales summary, sales trends and payment methods reports](https://squareup.com/help/us/en/article/5381-in-app-summaries-and-reports) — summary metrics, time comparison, top items/categories, and metric filters.

### Lightspeed

- [Using the Kitchen Display System 2.0](https://k-series-support.lightspeedhq.com/hc/en-us/articles/22708154090267-Using-the-Kitchen-Display-System-2-0) — FIFO tickets, state and type counts, New/Preparing/Ready/Completed progression, Hold/Cancel, full/condensed views, notes/allergens, undo, and delayed/late thresholds.
- [Understanding the Sales Report dashboard](https://k-series-support.lightspeedhq.com/hc/en-us/articles/35539237853467-Understanding-the-Sales-Report-dashboard) — a useful negative benchmark showing how quickly single-location reporting can expand into accounting groups, devices, floor plans, shifts, and other dimensions Café Le Den should omit.

## Handoff to the admin operating-model decision

The benchmark question is resolved, but it intentionally does not decide how
Café Le Den staffs a shift. The next decision should validate: the actual device
and viewing distance; whether staff explicitly accept an order before preparing
it; whether whole-order progression is sufficient; the promised pickup-time
policy and urgency thresholds; who may cancel/recall or structurally edit a menu;
and whether submitted web orders are reconciled with any separate POS record.
