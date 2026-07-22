# Feature Specification: Order-Creation Structural Alignment (Funnel + n8n)

**Feature Branch**: `010-order-structure-alignment`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "The `[slug]` landing-page funnel's order creation must work with the new DB structure (multi-item `order_items`), and the n8n ecommerce workflow's create-order path must follow the new structure." Independent of `008`/`009` — no file overlap; safe to implement in parallel with either.

## Context — what already exists (read before assuming this needs a migration)

`007-b2c-ecommerce-storefront` already built the full multi-item order structure and it is already applied to the database (`order_items` table exists, `theme_color`/`is_featured` columns exist, 0 rows in `order_items` currently — no cart order has been placed yet). Direct inspection of the current (uncommitted) code shows:

- **`POST /api/orders`** (`src/app/api/orders/route.ts`) already branches: if the request body has a non-empty `items[]`, it calls `orderService.processCartOrder`; otherwise it calls `orderService.processNewOrder` (the legacy single-product path). Both paths already exist and both work.
- **`POST /api/n8n/orders`** (used by the AI WhatsApp/FB/IG sales agent workflow) already delegates straight to the same `POST /api/orders` handler — so it already inherits the same branching for free.
- **The read side is already fully unified**: `orderRepository`'s `mapOrderItems()` (in `orders.repository.ts`) synthesizes a single-entry `OrderItem[]` from the legacy `product_id`/`quantity`/`total_price` columns whenever `order_items` has no rows for that order, and uses the real `order_items` rows when present. Every reader of `OrderWithDetails.items` (admin `OrdersTable`, order detail views) already sees a uniform shape regardless of which path created the order.
- **The funnel's write path is, and should remain, unchanged**: `useCheckoutForm`/`useCheckout` (`src/features/checkout/checkout.hooks.ts`) submit `{ product_id, quantity, ... }` — no `items[]` — which is exactly what routes it through the legacy `processNewOrder` path, which the read-side fallback already renders correctly everywhere. **This is not a gap to close; it is the correct, already-working design**, per the read-fallback rule 007 documented and implemented.

**The actual gap** is narrower than "the funnel needs to write `order_items`": it is a bug in the *notification* path that both the funnel and the store's cart checkout share, plus the external n8n workflow's message templates never having been updated to describe more than one item.

### The real bug: `OrderService.notifyN8n()` ignores `order.items`

`src/features/orders/orders.service.ts`'s private `notifyN8n(order, newStatus)` method builds the outbound webhook payload's `items` array like this today:

```ts
items: [
  {
    productName: order.product?.name || "طلبك",
    quantity: order.quantity,
    unitPrice: order.product?.price ?? (order.quantity ? order.total_price / order.quantity : order.total_price),
    totalPrice: order.total_price,
  },
],
```

This **always** synthesizes exactly one item from the legacy `order.product`/`order.quantity`/`order.total_price` columns — even though `order` (an `OrderWithDetails`, populated by `orderRepository.getOrderById`) already has a correctly-populated `order.items: OrderItem[]` array (via the same `mapOrderItems()` read-fallback used everywhere else). For today's single-product orders this coincidentally produces the right one-item array. The moment a customer places a multi-item cart order (via `(store)/checkout`) and its status changes (approved/confirmed/shipped/delivered/cancelled), this method will report only the *first* item's name/quantity alongside the *full* order total — a WhatsApp message that names one product but quotes the total price of several, with the other items silently missing from the customer-facing message entirely.

### The real gap: `order-notifications-workflow.json` has no multi-item awareness

`automation/order-notifications-workflow.json` (the live webhook consumer that sends the WhatsApp messages) has a `Set` node that passes through `productName`/`quantity`/`totalPrice`/etc. from the webhook body, and five message templates (`WA: Order Approved`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`) that each render exactly one `📦 المنتج: {{ productName }}` / `📊 الكمية: {{ quantity }}` line. None of them read `items[]` at all, even though `N8nOrderNotification.items[]` has existed in the payload's type (`src/features/shared/types.ts`) since `007`.

`automation/ecommerce-workflow.json` (the separate AI sales-agent workflow that *creates* orders conversationally over WhatsApp/Facebook/Instagram) already posts single-product `{ product_id, quantity, ... }` bodies to `/api/n8n/orders` — this is correctly scoped to single-product conversational sales and needs no change; multi-item AI-driven ordering is out of scope (see below).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A multi-item cart order's status-change notification correctly lists every item (Priority: P1)

As a customer who ordered 3 different products via the store's cart checkout, when the admin approves my order, my WhatsApp message names all 3 products with their individual quantities, not just the first one — while the total price shown already matches (it always has).

**Why this priority**: This is the concrete, verifiable bug; everything else in this spec is either already correct or a downstream consequence of fixing this.

**Independent Test**: Place a 2+ item cart order via `/checkout`, approve it in `/admin/orders`, inspect the outbound webhook payload (or the resulting WhatsApp message if the n8n instance is reachable in the test environment) — every item appears, with correct per-item quantity, and the existing top-level `productName`/`quantity`/`totalPrice` fields remain populated exactly as before (no regression to the single-item case).

**Acceptance Scenarios**:

1. **Given** a cart order with 2 items (2× Product A, 1× Product B), **When** its status changes to `approved`, **Then** the outbound `N8nOrderNotification.items[]` contains exactly 2 entries — `{productName: "Product A", quantity: 2, ...}` and `{productName: "Product B", quantity: 1, ...}` — with correct `unitPrice`/`totalPrice` per entry.
2. **Given** a legacy single-product funnel order (created via `/[slug]`, no `order_items` rows), **When** its status changes, **Then** the outbound `items[]` contains exactly 1 entry, identical in shape/values to what it produces today (zero regression).
3. **Given** the fix is deployed, **When** any existing admin order-status-change flow (`approveOrder`/`confirmOrder`/`cancelOrder`/`changeOrderStatus`) triggers a notification, **Then** no code path outside `notifyN8n()`'s internal item-array construction changes.

---

### User Story 2 - The WhatsApp message itself lists every item for multi-item orders (Priority: P1)

As a customer with a multi-item order, the WhatsApp message I receive lists every product I ordered, not just one — the external n8n workflow, not just the backend payload, needs to change for this to be customer-visible.

**Why this priority**: User Story 1 fixes the payload; without this, the correct data arrives at n8n and is still discarded by templates that only read the old single-item fields.

**Independent Test**: With User Story 1's fix deployed and the updated `automation/order-notifications-workflow.json` imported into a running n8n instance, trigger a multi-item order's status change and confirm the WhatsApp message text enumerates every item.

**Acceptance Scenarios**:

1. **Given** the updated workflow is imported into n8n, **When** a status-change webhook fires for a 2-item order, **Then** the "WA: Order Approved" (and Confirmed/Shipped/Delivered/Cancelled) message text lists both items, each with its own quantity, instead of a single `productName`/`quantity` line.
2. **Given** the updated workflow processes a legacy 1-item order, **When** the webhook fires, **Then** the message text is unchanged from today's wording (zero regression for the common case).

### Edge Cases

- An order with zero resolvable items (shouldn't happen — `processCartOrder` rejects empty `items[]`, and the legacy path always has a `product_id`) — `notifyN8n`'s fix must not crash if `order.items` is ever empty; fall back to the existing `"طلبك"` placeholder text, matching today's `order.product?.name || "طلبك"` guard.
- `order.items[].product` can be `null` if a referenced product was hard-deleted after the order was placed (the FK is `ON DELETE RESTRICT` for `order_items.product_id`, so this is prevented at the DB level today — noted as defense-in-depth, not an active bug).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `OrderService.notifyN8n()` MUST build the payload's `items[]` array from `order.items` (already correctly populated by the existing read-fallback) instead of synthesizing a single entry from `order.product`/`order.quantity`/`order.total_price`.
- **FR-002**: The existing top-level `N8nOrderNotification.productName`/`quantity`/`totalPrice` fields MUST remain populated exactly as today (from the first item / order-level total) — no consumer of those legacy fields (including `order-notifications-workflow.json` until it's updated) may break.
- **FR-003**: `automation/order-notifications-workflow.json`'s webhook-intake `Set` node MUST pass through the incoming `items[]` array.
- **FR-004**: All five WhatsApp message templates in `order-notifications-workflow.json` (Approved, Confirmed, Shipped, Delivered, Cancelled) MUST render one line per item (product name + quantity) instead of a single `productName`/`quantity` line, while preserving the rest of each message's wording/emoji/structure.
- **FR-005**: No change is made to the funnel's order-creation write path (`checkout.hooks.ts`, `(landing)/[slug]/page.tsx`, `CheckoutForm.tsx`) — the existing legacy `product_id`/`quantity` submission plus the read-side fallback is confirmed correct and left as-is.
- **FR-006**: No change is made to `automation/ecommerce-workflow.json` (the AI sales-agent order-creation workflow) — it remains single-product-per-conversation by design; multi-item AI-driven ordering is explicitly out of scope.
- **FR-007**: No Supabase migration is introduced — `order_items` and all referenced columns already exist.
- **FR-008**: The repo-controlled half of this work (FR-001, FR-003, FR-004 as files in `automation/`) MUST be distinguished from the deployment step the user controls: editing the JSON file in this repo does not update the *running* n8n instance — that requires the user to re-import the workflow (or use the n8n UI/API to update it) after this spec's changes land. This spec's plan MUST say so explicitly, not imply an automatic deploy.

### Key Entities

- No new entities — this spec operates entirely on the existing `Order`/`OrderItem`/`OrderWithDetails`/`N8nOrderNotification` types from `007`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A multi-item cart order's status-change webhook payload contains one `items[]` entry per actual line item, each with correct product name/quantity/unit price/line total.
- **SC-002**: A legacy single-product funnel order's webhook payload is byte-for-byte identical in shape to today's output (regression check).
- **SC-003**: The updated `order-notifications-workflow.json`, once imported into n8n, produces a WhatsApp message listing every item for a multi-item order and an unchanged message for a single-item order.
- **SC-004**: `npx tsc --noEmit` and `npm run build` both pass.
- **SC-005**: Zero behavior change to `(landing)`'s funnel, `(admin)`'s order management UI, and `automation/ecommerce-workflow.json`.

## Out of Scope

- Any change to the funnel's write path — confirmed correct as-is (FR-005).
- Any change to `automation/ecommerce-workflow.json` / the AI sales agent's single-product conversational ordering (FR-006) — flagged as a possible future enhancement (multi-item AI-driven cart building) in Open Questions, not built here.
- Any Supabase schema change (FR-007).
- Deploying/re-importing the updated workflow JSON into the live n8n instance — that is a user action this spec's plan documents but cannot perform (FR-008).
- Anything owned by `008`/`009` (theme, i18n, hero) — fully disjoint file set.

## Assumptions

- The n8n instance referenced by `N8N_ORDER_WEBHOOK_URL` and the Evolution API WhatsApp integration are already correctly configured and reachable in production; this spec does not touch connection/auth configuration, only payload shape and message templates.
- The user (not this repo) owns re-importing the updated `order-notifications-workflow.json` into their running n8n instance after this spec ships — the repo change is necessary but not sufficient for the customer-visible fix (User Story 2) to take effect.
- No cart order has been placed yet (`order_items` has 0 rows today), so this fix ships ahead of the first real-world multi-item order rather than patching a live bug already affecting customers.

## Open Questions

1. **RESOLVED (2026-07-22 — user decision): no, keep `ecommerce-workflow.json` single-item/one-order-at-a-time.** The AI sales-agent workflow stays exactly as it is — single-product-per-conversation ordering only, no multi-item conversational cart building. FR-006 is confirmed as written, no longer a follow-up candidate.
2. **Should `notifyN8n`'s top-level `quantity` field become a sum-of-all-items total instead of "first item's quantity"** for multi-item orders, now that `items[]` carries the full breakdown? Recommended: leave it as first-item quantity (FR-002, zero change) since `order.quantity`/`order.total_price` are already defined that way at the database-write level (`processCartOrder` writes `firstItem.quantity` to `orders.quantity` by design, per `007`) — changing the notification-level meaning without changing the underlying column would create a second inconsistency. Not blocking, but worth a deliberate "no" rather than silence.
