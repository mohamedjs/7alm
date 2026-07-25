# Spec: Phone-Keyed Review Token (Task 2)

> Status: Plan for approval · Author: CTO (Opus) · Date: 2026-07-24
> Small, contained change to the existing reviews feature (`docs/specs/commerce-growth-phase.md` WS1/WS2).

## Goal
The post-delivery review link's token should be **tied to the customer's phone number** (not the internal
`customerId`), so a review is connected to the phone identity. **Keep the verified-buyer gate** — the
reviewer must still have a `delivered` order for that product.

## Why phone
`customers` are unique by phone in this system; the WhatsApp/order flows already key off phone. Tying the
token to phone makes the review link portable across customer-record churn and aligns reviews with the
same identity the rest of the funnel uses. The token stays an opaque HMAC capability (30-day TTL) — the
phone inside it is signed, not user-supplied at submit time.

## Current state (already built)
- `reviews.service.ts`: `issueReviewToken(customerId, productId, orderId)` signs
  `{ customerId, productId, orderId, exp }`. `submitReview` verifies the token, then
  `reviewRepository.hasDeliveredOrder(customerId, productId)`, then inserts with `customer_id`.
- `orders.service.ts notifyN8n` calls `issueReviewToken(order.customer_id, order.product_id, order.id)`
  on `delivered`.

## Changes

### `src/features/reviews/reviews.service.ts`
- Token payload becomes `{ phone, productId, orderId, exp }` (replace `customerId` with `phone`).
- `issueReviewToken(phone: string, productId: string, orderId: string)` — **sign the exact stored
  `order.customer.phone` value as-is; do NOT re-normalize it.** Both the caller (§orders.service.ts) and
  the lookup (`findByPhone` in `submitReview`) derive from the same `customers.phone` field, so signing the
  stored value and looking it up unchanged guarantees a match. (Do NOT reuse the
  `getOrderAwaitingConfirmation` normalizer here — that one is for *inbound raw* WhatsApp numbers and could
  transform an already-canonical stored phone into a non-matching string, breaking the verified-buyer lookup.)
- `submitReview`:
  1. verify token → get `phone`.
  2. resolve the customer: `customersRepository.findByPhone(phone)` (a `findByPhone` passthrough already
     exists on `customers.service.ts`). If no customer → `{ success:false, error: "no matching customer" }`.
  3. **verified-buyer gate kept**: `reviewRepository.hasDeliveredOrder(customer.id, productId)`.
  4. insert with `customer_id = customer.id` (reviews table FK unchanged — reviews still store customer_id;
     phone is only the token key + resolution path).
- `verifyReviewToken` payload validation updated (`phone` required instead of `customerId`).

### `src/features/orders/orders.service.ts`
- In `notifyN8n` (delivered branch), call `reviewsService.issueReviewToken(order.customer.phone,
  order.product_id, order.id)` (was `order.customer_id`). Stays best-effort/try-catch.

### Types
- Update the internal `ReviewTokenPayload` (phone instead of customerId). No public/DTO or DB change.
- `SubmitReviewInput` unchanged (`{ token, rating, title?, body? }`).

## No migration
`product_reviews` schema is unchanged (still stores `customer_id`, resolved from phone at submit time).
No tokens exist in production yet (feature not live), so no backward-compat handling for old customerId
tokens is needed — clean cutover.

## Acceptance criteria
- `npx tsc --noEmit` + `npm run build` pass.
- A delivered order's review link resolves to the right customer by phone and only accepts the review if
  that phone's customer has a delivered order for the product (verified-buyer preserved).
- Public review DTO still leaks no PII (unchanged).
- Env for links unchanged (`REVIEW_TOKEN_SECRET`/`SOCIAL_TOKEN_ENCRYPTION_KEY`, store base).

## Delegation
- **@backend** only: the two file edits above + type update. No frontend change (the `/review/[token]`
  page and submit form are token-opaque and unaffected).
