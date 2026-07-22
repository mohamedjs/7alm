# Tasks: Order-Creation Structural Alignment (Funnel + n8n)

**Input**: `specs/010-order-structure-alignment/{spec.md,plan.md}`
**Prerequisites**: none from `008`/`009` — fully independent.
**Tests**: Not requested — implementer-owned verification is `npx tsc --noEmit`, `npm run build`, and API/log-level dry-run checks (direct `curl`/script calls, no browser). Actually clicking through the storefront and any live n8n import-and-trigger check is Human QA, performed by the user post-implementation.

## Phase 1: User Story 1 - Backend payload fix (Priority: P1)

- [] T001 [US1] In `src/features/orders/orders.service.ts`, fix `notifyN8n()`'s `items` construction: replace the hardcoded single-entry array (built from `order.product`/`order.quantity`/`order.total_price`) with `order.items.map(...)` (falling back to the current single-entry construction only if `order.items` is empty). See plan.md's "Before/After" for the exact diff.
- [] T002 [US1] Verify: `npx tsc --noEmit`, `npm run build`.
- [] T003 [US1] [API] Dry run — legacy path: `POST /api/orders` directly (`curl`/script, no browser) with a legacy `{ product_id, quantity, ... }` body, trigger a status change via the admin API/DB, inspect (log/intercept) the outbound `N8nOrderNotification` payload; confirm `items[]` has exactly 1 entry, values matching pre-fix output exactly. Depends on: T001.
- [] T004 [US1] [API] Dry run — cart path: `POST /api/orders` directly (`curl`/script, no browser) with a `{ items: [...] }` body containing 2+ items, trigger a status change, inspect the outbound payload; confirm `items[]` has one correctly-valued entry per line item and the top-level `productName`/`quantity`/`totalPrice` fields are unchanged in meaning (first item / order total). Depends on: T001.

**Checkpoint**: The backend payload is correct for both order types; independently shippable regardless of Phase 2's progress.

---

## Phase 2: User Story 2 - n8n workflow update (Priority: P1)

- [] T005 [US2] In `automation/order-notifications-workflow.json`'s Set node (the node building `formattedPhone`/`orderId`/`newStatus`/`customerName`/`productName`/`trackingId`/`totalPrice`/`quantity`), add an `items` passthrough assignment: `{{ $json.body.items }}`.
- [] T006 [P] [US2] Update the "WA: Order Approved" message template's `jsonBody.text` to replace the single `📦 المنتج: {{ $json.productName }}` / `📊 الكمية: {{ $json.quantity }}` lines with an `items.map(...).join('\n')` expression rendering one line per item.
- [] T007 [P] [US2] Same update for "WA: Order Confirmed".
- [] T008 [P] [US2] Same update for "WA: Order Shipped".
- [] T009 [P] [US2] Same update for "WA: Order Delivered".
- [] T010 [P] [US2] Same update for "WA: Order Cancelled".
- [] T011 [US2] Verify the JSON file remains valid (parses); diff-review all six node edits against plan.md's documented before/after. Depends on: T005–T010.
- [ ] T012 [US2] [Human QA] If a reachable n8n test instance is available: import the updated workflow, trigger a test webhook for a 1-item order (confirm message text unchanged from today) and a 2-item order (confirm both items listed). If no test instance is available, this check is deferred to the user post-merge — not silently skipped, just not an implementer task. Depends on: T011.

**Checkpoint**: The workflow file, once re-imported into the live n8n instance by the user, renders correct multi-item messages.

---

## Phase 3: Polish

- [] T013 Add the Deployment Note (from plan.md) to the PR/commit description verbatim or by close paraphrase: editing the JSON in-repo does not update the live n8n instance; the user must re-import it for User Story 2's fix to take customer-visible effect.
- [] T014 Run `npx tsc --noEmit` and `npm run build`; fix any errors.
- [ ] T015 [Human QA] Confirm `(landing)` funnel, `(admin)` order management, and `automation/ecommerce-workflow.json`'s AI sales-agent order creation are completely unaffected by both phases' changes — user-performed post-implementation, not an implementer task.

---

## Dependencies & Execution Order

- Phase 1 and Phase 2 touch disjoint files (`orders.service.ts` vs. the JSON workflow) and have no code dependency on each other — either can start first, or both in parallel.
- Within Phase 2, T006–T010 (the five message templates) are parallelizable; T005 (Set node passthrough) should land first since all five templates' new expressions read `$json.items`, which only exists after T005.
- Phase 3 depends on both Phase 1 and Phase 2 being complete.
- This spec has no dependency on, and is not depended on by, `008-store-design-system-alignment` or `009-interactive-lookbook-scroll-hero` — safe to implement in parallel with either or both.
