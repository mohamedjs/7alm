# Spec: Order Lifecycle Redesign (Task 1)

> Status: Plan for approval · Author: CTO (Opus) · Date: 2026-07-24
> Touches the core order pipeline — build behind review; additive/guarded, no destructive changes.

## Locked decisions (from product owner)
- **Confirmation is OPTIONAL per order.** Admin chooses at approval time: "Approve & ask customer to
  confirm on WhatsApp" (current double-opt-in) OR "Approve & ship now" (skip the customer reply).
- **On order placement:** instantly notify the **customer** via WhatsApp ("we received your order ✅")
  AND **email the admin** a "new order" alert to `mohamedjs408@gmail.com` (changed from `admin@halm.com`).
- **Ship/deliver is automatic** via the shipping provider webhook — including the **`test` provider**
  (which already self-simulates), so the full cycle is testable end-to-end. Admin manual override stays.
- **Fix the dead-ends:** an `approved` order whose customer never replies must be recoverable
  (admin manual confirm), and the state machine must be **enforced server-side**.

## As-is cycle + gaps (audit)
```
place → pending ──(admin approve)──> approved ──(customer replies تأكيد on WA)──> confirmed(+shipping)
                        │                                                              │
                        └(cancel)                                                (admin ship) → shipped → delivered
```
Gaps found:
1. **Placement is silent** — `processNewOrder`/`processCartOrder` never call `notifyN8n`; no customer or admin message.
2. **`approved` is a dead-end if the customer never replies** — the state machine offers only "Cancel" on
   `approved`; only the WhatsApp webhook (`confirmOrder`) can advance it. No admin manual confirm.
3. **State machine is NOT enforced** — `changeOrderStatus` + the shipping webhook call `updateOrderStatus`
   with any target; illegal jumps (e.g. pending→delivered) are possible. The machine is only used to render buttons.
4. Ship/deliver were treated as manual even though `/api/webhooks/shipping` + the `test` provider already auto-advance.

## To-be cycle
```
place ─▶ pending  ──approve+ask──▶ approved ──(customer تأكيد | admin manual confirm)──▶ confirmed(+shipping)
  │        │  ▲                        │                                                      │
  │   notify customer "received"       └cancel (restock)                             provider webhook (incl. test)
  │   email admin "new order"                                                          │
  └── approve+ship-now ───────────────────────────────────────────────────────▶ confirmed(+shipping)
                                                                     confirmed ─▶ shipped ─▶ delivered ─▶ (review request)
                                                                                     └▶ returned
```

## Changes

### 1. DB — one column (migration file, not auto-applied)
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requires_confirmation boolean NOT NULL DEFAULT true;
```
Records, per order, whether the WhatsApp confirmation step was required (audit + UI state).

### 2. Enforce the state machine server-side (`src/lib/orderStateMachine.ts`)
- Add a canonical transition map + `canTransition(from, to): boolean`:
  `pending→{approved,cancelled}`, `approved→{confirmed,cancelled}`, `confirmed→{shipped}`,
  `shipped→{delivered,returned}`, `delivered→{returned}`, `cancelled→{}`, `returned→{}`.
  - **`confirmed→cancelled` is intentionally NOT allowed.** A `confirmed` order already has a created
    shipment + decremented stock, and the current `cancelOrder` only accepts `pending`/`approved` and
    only restores stock for `approved` (and never calls `cancelDelivery`). Allowing cancel here would
    leak a live shipment and mis-count inventory. Keep cancellation to `pending`/`approved` only —
    matches both `cancelOrder` and the existing `confirmed` action set (`[Ship]`).
- Add the missing `confirm` action to the `approved` state's `availableActions` (admin manual confirm)
  alongside `cancel`.
- `orders.service.ts changeOrderStatus` rejects a disallowed transition (`!canTransition(current, next)`)
  with a clear error / 409 — the machine becomes the single source of truth.
- **Shipping-webhook guard is idempotent, NOT an error.** Providers (and the `test` simulator) send
  duplicate/out-of-order events (a late `in_transit` after `delivered` → `canTransition(delivered,shipped)`
  is false). On a disallowed transition the webhook must **log and return `{ success:true }` (no-op)** —
  never a 4xx — so providers don't retry-storm and the test loop doesn't log failures.

### 3. Order-placed notification (`orders.service.ts` + new email service)
- **Customer (WhatsApp, via n8n):** at the end of `processNewOrder` AND `processCartOrder`, after the
  order row is created, fire `notifyN8n(orderWithDetails, 'pending')` (fire-and-forget; fetch
  `getOrderById(order.id)` to build the payload). Never block or fail the order create if the notify fails.
  - **In `processCartOrder`, fire the notify AFTER `createOrderItems`** — `notifyN8n` builds its `items[]`
    from `order.items`, so notifying before the item rows exist yields an empty list. (Single-product
    `processNewOrder` is fine via the legacy `product_id`/`quantity` fallback.)
- **Admin (email, via new backend service):** add `src/features/notifications/email.service.ts` — a thin,
  lazily-configured sender (Resend HTTP API recommended, or nodemailer/SMTP) with
  `sendNewOrderAlert(order)` → emails `ADMIN_ALERT_EMAIL` (mohamedjs408@gmail.com) a plain summary
  (order #, customer name, items, total, a link to `/admin/orders`). Call it from the SAME place as the
  customer notify, **fire-and-forget/try-catch** — a mail failure must never block or fail the order.
  Env read lazily; if the email env isn't configured, log-and-skip (don't throw).

### 4. Optional confirmation (`orders.service.ts approveOrder`)
- New signature `approveOrder(orderId, providerName?, requireConfirmation = true)`:
  - Persist `requires_confirmation` on the order.
  - **requireConfirmation = true** → current behavior: status `approved`, decrement stock,
    `notifyN8n('approved')` (sends the تأكيد/إلغاء text — already fixed to `/send/text`).
  - **requireConfirmation = false** ("ship now") → set `approved` (decrement stock, no 'approved' WA),
    then immediately run the existing `confirmOrder(orderId)` path (creates the shipment, status
    `confirmed`, `notifyN8n('confirmed')` → "confirmed, shipping soon"). No customer reply needed.
- **Thread the flag through `changeOrderStatus`**: its signature becomes
  `changeOrderStatus(orderId, newStatus, providerName?, requireConfirmation?)` and forwards
  `requireConfirmation` to `approveOrder`. Otherwise the admin's "ship now" choice never reaches the service.
- `changeOrderStatus`: route `newStatus==='confirmed'` → `confirmOrder` (already does). Admin manual
  confirm on an `approved` order reuses this — no new logic.
- The admin PATCH `/api/orders/[id]/status` reads `require_confirmation` (bool) from the body for the
  approve action and passes it into `changeOrderStatus`.

### 5. Test-provider auto-progression (verify + harden)
- `test.provider.ts` already POSTs `/api/webhooks/shipping?provider=test` on `picked_up`(+delay) and
  `delivered`(+2×delay) via `setTimeout`. Keep it, but:
  - Ensure `NEXT_PUBLIC_APP_URL` (or `SOCIAL_OAUTH_REDIRECT_BASE`) is the base it calls, and
    `SHIPPING_WEBHOOK_SECRET` is set (document in env).
  - The shipping webhook must run its status updates through the new `canTransition` guard
    (confirmed→shipped→delivered are all legal, so behavior is unchanged; illegal ones are rejected).
- Net: choosing the `test` provider on confirm makes the order walk confirmed→shipped→delivered on its
  own, firing each WhatsApp incl. the post-delivery review request.

### 6. n8n — `automation/order-notifications-workflow.json`
- Add a **`pending`** branch to `Route by Status` with a **customer message only** (`/send/text` to
  `{{ formattedPhone }}`): "استلمنا طلبك ✅ رقم {{orderId8}} … هنراجعه ونتواصل معاك قريب." (natural Arabic,
  mirror the existing text nodes).
- **No admin WhatsApp node** — the admin new-order alert is an **email** sent by the backend (see §3/§8),
  not WhatsApp.
- All other branches unchanged (approved = تأكيد/إلغاء text; confirmed/shipped/delivered/cancelled as-is;
  delivered already fans out to the review-request node).
- Manual re-import into the running n8n instance required (note it).

### 7. Admin UI (`OrdersTable` / `OrderDetailsDrawer` + state machine consumer)
- The `pending` row shows two approve actions: **"موافقة وطلب تأكيد العميل"** (require_confirmation=true)
  and **"موافقة وشحن مباشر"** (require_confirmation=false). Both PATCH `/status` with `status:'approved'` +
  the flag + chosen `shipping_provider`.
- The `approved` row shows **"تأكيد يدوي"** (manual confirm → PATCH `status:'confirmed'`) + Cancel.
- All strings via `t()` (ar+en); logical CSS props; theme-aware.

### 8. Config / env (document in AGENTS.md + `.env.example`)
- **Email (admin alert):** `ADMIN_ALERT_EMAIL=mohamedjs408@gmail.com`, `EMAIL_FROM` (a verified sender),
  plus the provider secret — `RESEND_API_KEY` (recommended) or SMTP creds if using nodemailer.
  ⚠️ Resend/most providers require a **verified sending domain**; until one is set up, send from
  `onboarding@resend.dev` (Resend's sandbox) or an authenticated SMTP account so the alert actually delivers.
- Confirm `NEXT_PUBLIC_APP_URL`, `SHIPPING_WEBHOOK_SECRET`, `N8N_ORDER_WEBHOOK_URL` are set for the
  placement + test-shipping loop.

## Acceptance criteria
- `npx tsc --noEmit` and `npm run build` pass.
- Placing an order sends the customer a "received ✅" WhatsApp (n8n `pending` branch) AND emails the admin
  a "new order" alert to `ADMIN_ALERT_EMAIL` (mohamedjs408@gmail.com) via the backend email service.
- "Approve & ask" → customer gets تأكيد/إلغاء; reply advances to confirmed+shipping. "Approve & ship now"
  → goes straight to confirmed+shipping, no customer reply.
- An `approved` order can be confirmed manually by admin from the dashboard.
- Illegal status jumps are rejected server-side (`canTransition`).
- With the `test` provider, a confirmed order auto-progresses shipped→delivered and the review request fires.
- Migration file created, NOT auto-applied.

## Delegation split
- **@backend**: DB migration, state-machine enforcement, `approveOrder` optional-confirm, order-placed
  notify (customer WhatsApp via n8n + admin **email** via a new backend email service), webhook guard, env docs.
- **@frontend**: OrdersTable/OrderDetailsDrawer approve-mode buttons + manual-confirm action + i18n.
- **@n8n**: `pending` branch — **customer message only** — in `order-notifications-workflow.json`.
- Contract = the transition map (§2) + PATCH `/status` body (`status`, `require_confirmation`, `shipping_provider`).
```
