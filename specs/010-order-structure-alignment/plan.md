# Implementation Plan: Order-Creation Structural Alignment (Funnel + n8n)

**Branch**: `010-order-structure-alignment` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Depends on**: nothing from `008`/`009` — fully disjoint file set (`src/features/orders/orders.service.ts` + `automation/order-notifications-workflow.json`). **Independent of**: `008-store-design-system-alignment`, `009-interactive-lookbook-scroll-hero` — safe to implement in parallel with either or both.

## Summary

This is deliberately the smallest of the three specs, because most of what the user's brief worried about ("does the funnel work with the new DB structure?") turns out to already be true — `007` built a correct read-fallback and a correctly-branching `POST /api/orders`. The actual work is: (1) fix a latent bug in `OrderService.notifyN8n()` that ignores the already-populated `order.items` array and always synthesizes a fake one-item array from legacy columns, and (2) update `automation/order-notifications-workflow.json`'s Set node and five WhatsApp message templates to pass through and render `items[]`. No funnel code changes, no `ecommerce-workflow.json` changes, no Supabase migration.

## Constraints (must NOT change)

- `src/features/checkout/checkout.hooks.ts`, `src/components/landing/CheckoutForm.tsx`, `src/app/(landing)/[slug]/page.tsx` — the funnel's write path is confirmed correct as-is (spec FR-005) and untouched by this plan.
- `automation/ecommerce-workflow.json` — untouched (spec FR-006).
- `src/app/api/orders/route.ts`, `src/app/api/n8n/orders/route.ts`, `src/features/orders/orders.repository.ts` (specifically `mapOrderItems`/`ORDER_SELECT`), `src/features/shared/types.ts` — all already correct from `007`; untouched by this plan.
- The existing top-level `N8nOrderNotification.productName`/`quantity`/`totalPrice` fields keep their exact current values/semantics (spec FR-002) — only the `items[]` array's construction changes.
- No Supabase migration.
- `npx tsc --noEmit` and `npm run build` pass at the end of every phase.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16.2.10; the n8n workflow file is plain JSON (n8n's export format), not TypeScript — edited directly as JSON.
**Primary Dependencies**: none new.
**Storage**: none — no schema change.
**Testing**: `npx tsc --noEmit`, `npm run build`; a multi-item-order dry run driven via direct API calls (`curl`/script against `POST /api/orders` and the status-change endpoint — no browser needed), inspecting the constructed payload from code/logs. Actually placing an order by clicking through the storefront UI, and any live n8n import-and-trigger check, is Human QA — performed by the user post-implementation (see Verification Steps), not an implementer task.
**Target Platform**: server-side (`orders.service.ts`) + external n8n workflow file tracked in this repo.
**Constraints**: zero regression to the single-item case (the only case that has actually shipped real orders so far); repo-vs-deployment split stated explicitly (FR-008).
**Scale/Scope**: 1 method fix, 1 JSON workflow file (6 node edits: 1 Set node + 5 message templates).

## Constitution Check

- **I. Layered Architecture**: PASS — `notifyN8n` already lives in `OrderService` (the correct layer); this plan fixes its internals, doesn't move logic across layers.
- **II. TypeScript Strict**: PASS — the fix uses `order.items` which is already correctly typed as `OrderItem[]` on `OrderWithDetails`; no new `any`.
- **III. RTL/i18n Correctness**: N/A — this plan touches no UI; the WhatsApp message templates are Arabic (matching the existing funnel/store convention) and stay Arabic, no bilingual requirement applies to n8n message text (this is outbound customer messaging, not `(admin)`/`(store)` UI chrome — Constitution III's dictionary requirement doesn't extend here, same boundary `006`/`008` draw for database/message content vs. UI chrome).
- **IV. No Business Logic in Components**: N/A — no component touched.
- **V. Reuse Existing Primitives**: PASS — reuses `order.items` (already computed by the existing `mapOrderItems` read-fallback) instead of introducing a second item-resolution mechanism.
- **VI. State Machine / Factory**: PASS — `notifyN8n` is called by the state-machine-driven status-change methods (`approveOrder`, `confirmOrder`, `cancelOrder`, `changeOrderStatus`) exactly as today; this plan doesn't touch `orderStateMachine.ts` or add a new status concept.

No violations.

## The Fix — concrete before/after

### `src/features/orders/orders.service.ts`, `notifyN8n()`

**Before** (current code, confirmed by direct read):

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

**After**:

```ts
items: order.items.length > 0
  ? order.items.map((item) => ({
      productName: item.product?.name || "طلبك",
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
    }))
  : [
      {
        productName: order.product?.name || "طلبك",
        quantity: order.quantity,
        unitPrice: order.product?.price ?? order.total_price,
        totalPrice: order.total_price,
      },
    ],
```

The `order.items.length > 0` guard preserves today's exact fallback behavior for the theoretical edge case where `order.items` is empty (spec Edge Cases) — in practice `mapOrderItems()` always returns at least one entry when `order.product_id` is set, so this branch is defense-in-depth, not the expected path. The top-level `productName`/`quantity`/`totalPrice`/`trackingId` fields in the payload are untouched — they already read from `order.product`/`order.quantity`/`order.total_price` directly, one level up in the same method, and stay exactly as they are per FR-002.

### `automation/order-notifications-workflow.json`

Two categories of edit, both inside the existing node structure — no new nodes, no new webhook path:

1. **Set node** (the one currently named to build `formattedPhone`/`orderId`/`newStatus`/`customerName`/`productName`/`trackingId`/`totalPrice`/`quantity` — lines ~45–100 in the current file): add one more assignment, `items`, typed as an array/object passthrough: `"value": "={{ $json.body.items }}"`.
2. **Five WhatsApp `httpRequest` nodes** (`WA: Order Approved`, `WA: Order Confirmed`, `WA: Order Shipped`, `WA: Order Delivered`, `WA: Order Cancelled`): each currently builds its `jsonBody.text` with a literal `\n📦 المنتج: {{ $json.productName }}\n📊 الكمية: {{ $json.quantity }}` (the quantity line only appears on the Approved template today; the others show only the product line). Replace the product/quantity line(s) in every template with an n8n expression that joins the `items` array into one line per item, e.g.:

   ```
   {{ $json.items.map(i => '📦 ' + i.productName + ' × ' + i.quantity).join('\\n') }}
   ```

   inserted in place of the old `📦 المنتج: {{ $json.productName }}` (and, where present, the separate `📊 الكمية: {{ $json.quantity }}`) line — one multi-line block instead of two fixed single-item lines. For a 1-item order this expression produces output textually identical to today's single line (SC-002/SC-003's regression requirement), since `.map().join()` over a 1-element array is just that element's line.

## Feature-Layer File Inventory

| File | Change | Purpose |
|---|---|---|
| `src/features/orders/orders.service.ts` | MODIFY | Fix `notifyN8n()`'s `items[]` construction to use `order.items` (FR-001). |
| `automation/order-notifications-workflow.json` | MODIFY | Set node: pass through `items[]` (FR-003). Five WhatsApp templates: render one line per item (FR-004). |

No other file changes. Specifically **not** touched: `orders.repository.ts`, `orders.api.ts`, `orders.hooks.ts`, `checkout.hooks.ts`, `CheckoutForm.tsx`, `(landing)/[slug]/page.tsx`, `src/features/shared/types.ts`, `automation/ecommerce-workflow.json`, any Supabase migration.

## Deployment Note (FR-008 — read before marking this "done")

Editing `automation/order-notifications-workflow.json` in this repository does **not** change the behavior of the live n8n workflow already running in the user's n8n instance. n8n workflows are stored/executed server-side once imported; this repo's copy is a tracked source-of-truth artifact, not something n8n polls or re-reads automatically. After this plan's JSON edits are committed, the user must re-import the updated workflow (replace the existing workflow via n8n's UI "Import from File"/"Import from URL," or update it via the n8n API) for User Story 2's customer-visible fix to actually take effect. User Story 1's fix (`orders.service.ts`) takes effect on the next deploy of the Next.js app with no external action needed — that half is fully repo-controlled.

## Phased Implementation Order

Each phase leaves the app in a shippable, `tsc`/`build`-clean state.

**Phase 0 — Backend payload fix (repo-controlled, independently shippable)**
- Apply the `notifyN8n()` fix in `orders.service.ts`.
- Verify: `npx tsc --noEmit`, `npm run build`.
- Dry run via direct API calls (no browser needed): `POST /api/orders` with a legacy `{ product_id, quantity }` body, then trigger a status change, confirm the outbound payload's `items[]` has exactly 1 entry matching today's output exactly (regression check, SC-002). Repeat with a `{ items: [...] }` body containing 2 items, confirm the outbound payload's `items[]` has exactly 2 correctly-valued entries (SC-001).
- This phase can ship independently of Phase 1 — a correct payload with an unupdated n8n workflow just means n8n keeps ignoring the new field (today's behavior), which is strictly no worse than before.

**Phase 1 — n8n workflow update (repo-controlled edit; external deployment is user-controlled)**
- Edit the Set node + five message templates in `automation/order-notifications-workflow.json` per the concrete before/after above.
- Verify within the repo: the JSON remains valid (parses), diff reviewed line-by-line against the before/after in this plan.
- Document the required user action (re-import into the live n8n instance) explicitly in the PR/commit description — this plan's Deployment Note is the source text for that.
- If a reachable n8n test instance is available to whoever implements this: import the updated workflow there and trigger a real test webhook (1-item and 2-item cases) to confirm SC-003 end-to-end. If not available, this verification step is explicitly deferred to the user post-merge — state that rather than silently skipping it.

## Risks / Open Questions

(See spec.md's "Open Questions" — both are non-blocking scope decisions, not implementation risks.)

1. **The n8n re-import step is outside this repo's control** — the single biggest risk to this spec being perceived as "done" when it isn't yet customer-visible. Mitigated by making the Deployment Note unmissable in both this plan and the PR description.
2. **`.map()`/`.join()` support in the n8n expression editor** — n8n's expression language is JS-subset-compatible and commonly supports array `.map()`/`.join()` in recent versions (the workflow already uses `.substring()` on `orderId` elsewhere in the same file, confirming JS-string-method support is available); if the specific n8n version in use rejects `.map()` on an object array, the fallback is an n8n **Code node** inserted between the Set node and the message nodes that pre-computes an `itemsSummary` string, referenced as `{{ $json.itemsSummary }}` in the templates instead — a slightly larger but still repo-contained change if the inline-expression approach fails in practice.

## Verification Steps (every phase)

```bash
npx tsc --noEmit   # must pass
npm run build      # must succeed
```

Regression checklist (each item tagged — [API] implementer-checkable via direct API/log calls, no browser; [Human QA] performed by the user post-implementation):
- [ ] [API] Legacy single-product funnel order → status change → outbound payload's `items[]` has exactly 1 entry, values unchanged from pre-fix behavior.
- [ ] [API] Multi-item cart order (2+ items) → status change → outbound payload's `items[]` has one entry per line item with correct quantity/unit price/line total.
- [ ] [API] Top-level `productName`/`quantity`/`totalPrice`/`trackingId` fields in the payload are unchanged in both cases.
- [ ] [API] `automation/order-notifications-workflow.json` remains valid JSON; diff matches the documented before/after.
- [ ] [Human QA] (If n8n test instance available) imported workflow renders a correct multi-line WhatsApp message for a 2-item order and an unchanged single-line message for a 1-item order.
- [ ] [Human QA] `(landing)` funnel and `(admin)` order management are otherwise completely unaffected.
