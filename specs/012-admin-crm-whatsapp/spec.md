# Feature Specification: Customer CRM Module with WhatsApp Messaging

**Spec ID:** 012-admin-crm-whatsapp
**Status:** Draft
**Priority:** P0 (Core Feature)
**Author:** CTO
**Date:** 2026-07-23
**Depends on:** None (leverages existing `customers`, `orders`, `addresses` tables)

---

## Context

### Current State

The admin dashboard has no customer management capability. Customers exist only
as a byproduct of orders --- the `customers` table has basic fields (`id`,
`phone`, `email`, `full_name`, `created_at`) and the only server-side code is
a minimal `findByPhone` / `findOrCreate` flow used during checkout.

There is no way for an admin to:
- Browse or search customers
- View a customer's order history or lifetime value
- Send a WhatsApp message to a customer from the dashboard
- View past WhatsApp conversations

### Existing Infrastructure

| Asset | Status | Notes |
|---|---|---|
| `customers` table | Exists | Basic fields only --- no notes, tags, or metadata |
| `customers.repository.ts` | Exists | Only `findByPhone()` and `create()` |
| `customers.service.ts` | Exists | Only `findOrCreate()` |
| `orders` table | Exists | Has `customer_id` FK with status, total_price, quantity, product_id |
| `addresses` table | Exists | Has `customer_id` FK with zone_id, street_details |
| Evolution API instance | Running | `https://evolution-api-production-2b59.up.railway.app` |
| n8n workflows | Running | Already sending order notifications via WhatsApp |
| Supabase Realtime | Configured | `useRealtime` / `useRealtimeRefresh` hooks available |

### What This Spec Covers

A full Customer CRM module for the admin dashboard with three pillars:

1. **Customer Management** --- list, search, view detail with order history and computed stats
2. **WhatsApp Messaging** --- send messages via Evolution API, log conversations, receive inbound via webhook
3. **Customer Analytics** --- computed metrics (total orders, revenue, AOV, repeat rate) with no data duplication

---

## User Scenarios

### US-1: Admin browses the customer list (Priority: P1)

**Given** an admin is logged in to the dashboard
**When** they navigate to `/admin/customers`
**Then** they see a paginated, searchable table of all customers showing:
name, phone, email, total orders, total spent (EGP), last order date.
They can search by name or phone. Clicking a row navigates to the customer
detail page.

### US-2: Admin views customer detail (Priority: P1)

**Given** an admin clicks a customer in the list
**When** the detail page loads (`/admin/customers/[id]`)
**Then** they see:
- Contact info card (name, phone, email, primary address)
- Stats card (total orders, total spent, average order value, first order date, last order date)
- Order history table (all orders with status badge, amount, date, product, tracking)
- WhatsApp conversation panel (message history + compose area)

### US-3: Admin sends a WhatsApp message (Priority: P1)

**Given** an admin is on a customer detail page
**When** they type a message in the compose area and click send
**Then** the message is sent via Evolution API to the customer's phone number.
The message appears immediately in the conversation panel with a "sending"
indicator, then updates to "sent" / "delivered" / "read" as status webhooks arrive.
The message is logged in the database with the admin's ID for audit.

### US-4: Admin uses a quick-reply template (Priority: P2)

**Given** an admin is composing a message
**When** they click a quick-reply template button (e.g., "Your order is shipped",
"Thank you for your purchase")
**Then** the template text is inserted into the compose area (editable before
sending). Templates are bilingual and stored in the dictionary.

### US-5: Admin receives an inbound WhatsApp message (Priority: P1)

**Given** a customer sends a WhatsApp message to the business number
**When** Evolution API fires a webhook to n8n, which forwards to the app
**Then** the message is persisted in the database. If the admin is viewing that
customer's detail page, the message appears in real-time via Supabase Realtime
(no polling, no page refresh).

### US-6: Admin views customer analytics on the dashboard (Priority: P3)

**Given** an admin is on the main dashboard page
**When** the page loads
**Then** they see a "Customers" stats section showing: total customers,
new customers this period, repeat purchase rate, and top 5 customers by revenue.

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority | Scenario |
|---|---|---|---|
| FR-01 | Create `whatsapp_messages` table in Supabase for message logging | P0 | US-3, US-5 |
| FR-02 | Add `notes` (text, nullable) column to `customers` table | P2 | US-2 |
| FR-03 | Create a Postgres view `customer_stats` that computes total_orders, total_spent, avg_order_value, first_order_date, last_order_date per customer by aggregating the `orders` table --- no data duplication | P0 | US-1, US-2 |
| FR-04 | Extend `CustomerRepository` with: `getAll(page, limit, search?)`, `getById(id)`, `update(id, data)`, `getCustomerStats(id)`, `getAllWithStats(page, limit, search?)` | P0 | US-1, US-2 |
| FR-05 | Create `WhatsAppMessageRepository` with: `create(msg)`, `getByCustomerId(customerId, page, limit)`, `updateStatus(evolutionMessageId, status)`, `getRecentByCustomerId(customerId, limit)` | P0 | US-3, US-5 |
| FR-06 | Create `CustomerService` methods: `getCustomerList(page, limit, search?)`, `getCustomerDetail(id)` returning customer + stats + recent orders + primary address | P0 | US-1, US-2 |
| FR-07 | Create `EvolutionService` as a server-side integration module: `sendText(phone, body)`, `sendMedia(phone, mediaUrl, caption?)`, `getConnectionStatus()`. Phone normalization (local Egyptian to E.164 JID format). Config from env vars. | P0 | US-3 |
| FR-08 | Create `WhatsAppService` orchestrating message send: validate phone, normalize, call EvolutionService, persist via repository, return message with status | P0 | US-3 |
| FR-09 | Create admin API routes: `GET /api/admin/customers` (paginated list with stats), `GET /api/admin/customers/[id]` (detail), `PATCH /api/admin/customers/[id]` (update notes/email) | P0 | US-1, US-2 |
| FR-10 | Create admin API routes: `GET /api/admin/customers/[id]/messages` (paginated message history), `POST /api/admin/customers/[id]/messages` (send message) | P0 | US-3 |
| FR-11 | Create webhook route: `POST /api/webhooks/whatsapp` (receives inbound messages and status updates from n8n, authenticated via shared secret) | P0 | US-5 |
| FR-12 | Create RTK Query API: `customersApi` with endpoints for list, detail, messages, send message | P0 | US-1, US-2, US-3 |
| FR-13 | Create `useCustomersManager` hook for list page (search, pagination, navigation) | P1 | US-1 |
| FR-14 | Create `useCustomerDetail` hook for detail page (customer data, orders, stats) | P1 | US-2 |
| FR-15 | Create `useWhatsAppChat` hook for messaging panel (messages, send, real-time updates via `useRealtime` with `onEvent` callback triggering RTK Query refetch) | P1 | US-3, US-5 |
| FR-16 | Build `CustomerList.tsx` component: paginated table, search input, stats columns, row click navigation | P1 | US-1 |
| FR-17 | Build `CustomerDetail.tsx` component: contact card, stats card, order history table, WhatsApp panel | P1 | US-2 |
| FR-18 | Build `WhatsAppChat.tsx` component: conversation bubble UI, compose area, send button, quick-reply templates, message status indicators, real-time incoming messages | P1 | US-3, US-4, US-5 |
| FR-19 | Admin customer list page at `/admin/customers/page.tsx` | P1 | US-1 |
| FR-20 | Admin customer detail page at `/admin/customers/[id]/page.tsx` | P1 | US-2 |
| FR-21 | Quick-reply message templates stored in i18n dictionary (bilingual AR/EN) | P2 | US-4 |
| FR-22 | Customer analytics widgets on the main dashboard (total customers, new this period, repeat rate, top 5 by revenue) | P3 | US-6 |
| FR-23 | Register `customersApi` in the Redux store (`store.ts`) | P0 | All |
| FR-24 | Add all new UI strings to `dictionary.ts` under `crm.*` namespace | P1 | All UI |
| FR-25 | Enable Supabase Realtime on the `whatsapp_messages` table | P0 | US-5 |
| FR-26 | Add sidebar navigation link for "Customers" in the admin layout | P1 | US-1 |

### Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | Customer list must be paginated (server-side) --- customers scale unlike categories; never load-all |
| NFR-02 | Message history must be paginated with infinite scroll (load older on scroll-up) |
| NFR-03 | All UI must be bilingual (AR/EN) via `t(key)` and RTL-aware via logical CSS properties |
| NFR-04 | All Evolution API credentials stored as server-side env vars --- never exposed to client |
| NFR-05 | Webhook endpoint authenticated via shared secret header --- reject requests without valid secret |
| NFR-06 | Message body must be sanitized/escaped on render --- inbound content is attacker-controlled (stored XSS prevention) |
| NFR-07 | TypeScript strict: `npx tsc --noEmit` must pass |
| NFR-08 | Production build: `npm run build` must pass |
| NFR-09 | WhatsApp send rate-limited to prevent abuse (max 10 messages/min per admin) |

---

## Database Schema Changes

### New Table: `whatsapp_messages`

```sql
CREATE TABLE whatsapp_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  admin_id        UUID REFERENCES admins(id) ON DELETE SET NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body            TEXT NOT NULL,
  media_url       TEXT,
  media_type      TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  evolution_message_id TEXT,
  phone           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_messages_customer ON whatsapp_messages(customer_id, created_at DESC);
CREATE INDEX idx_whatsapp_messages_evolution ON whatsapp_messages(evolution_message_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
```

**Column rationale:**

| Column | Purpose |
|---|---|
| `customer_id` | Links message to customer for conversation view |
| `admin_id` | Audit trail: which admin sent the outbound message. NULL for inbound. |
| `direction` | `inbound` (customer to business) or `outbound` (admin to customer) |
| `body` | Message text content |
| `media_url` / `media_type` | For future media message support (images, documents) |
| `status` | Message delivery status. `pending` -> `sent` -> `delivered` -> `read` (or `failed`). Updated via webhook. |
| `evolution_message_id` | The message ID returned by Evolution API. Critical for correlating status webhooks back to the correct row. |
| `phone` | Denormalized phone number for the message (customer's phone at send time) |

### Altered Table: `customers`

```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
```

### New View: `customer_stats`

```sql
CREATE OR REPLACE VIEW customer_stats AS
SELECT
  c.id AS customer_id,
  c.full_name,
  c.phone,
  c.email,
  c.notes,
  c.created_at,
  COUNT(o.id)::INTEGER AS total_orders,
  COALESCE(SUM(o.total_price), 0)::NUMERIC AS total_spent,
  COALESCE(AVG(o.total_price), 0)::NUMERIC AS avg_order_value,
  MIN(o.created_at) AS first_order_date,
  MAX(o.created_at) AS last_order_date
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.full_name, c.phone, c.email, c.notes, c.created_at;
```

This view includes customer identity columns (`full_name`, `phone`, `email`,
`notes`, `created_at`) alongside aggregates so the list page can query a single
source --- `.from("customer_stats")` with `.ilike` search and `.range()`
pagination --- instead of joining `customers` to the view. This prevents N+1
queries and ensures stats are always consistent with the orders table --- no
data duplication.

---

## Evolution API Integration Design

### Service Module: `EvolutionService`

A server-side service (`src/features/whatsapp/evolution.service.ts`) that wraps
the Evolution API HTTP endpoints. Mirrors the shipping provider pattern:
config from env, clean interface, never imported client-side.

### Environment Variables

```env
EVOLUTION_API_URL=https://evolution-api-production-2b59.up.railway.app
EVOLUTION_API_KEY=<api-key>
EVOLUTION_INSTANCE=<instance-name>
WHATSAPP_WEBHOOK_SECRET=<shared-secret-for-webhook-verification>
```

### Phone Normalization

Egyptian phone numbers in the `customers` table may be stored as:
- `01012345678` (local, 11 digits)
- `+201012345678` (international with +)
- `201012345678` (international without +)

Evolution API requires the WhatsApp JID format: `201012345678@s.whatsapp.net`

The `EvolutionService.normalizePhone(phone)` method must:
1. Strip all non-digit characters
2. If starts with `0` and is 11 digits, prepend `20` (Egypt country code)
3. Ensure result is digits-only, no `+` prefix
4. Append `@s.whatsapp.net` for the JID

### Webhook Flow (Inbound Messages + Status Updates)

```
Customer sends WhatsApp message
    |
    v
Evolution API receives it
    |
    v
Evolution webhook -> n8n workflow
    |
    v
n8n normalizes payload, adds shared secret header
    |
    v
POST /api/webhooks/whatsapp (Next.js API route)
    |
    v
Verify shared secret -> whatsappService.processInbound(payload)
    |
    v
whatsappMessageRepository.create() or .updateStatus()
    |
    v
Supabase Realtime broadcasts INSERT/UPDATE on whatsapp_messages
    |
    v
Admin's browser receives real-time update via useRealtimeRefresh()
```

**Boundary rule:** n8n is responsible for receiving the Evolution webhook,
normalizing the payload shape, and forwarding to the app route. The app route
owns all database writes via the repository pattern. n8n never writes to
Supabase directly for messages --- this keeps the repository pattern intact
and avoids logic duplication.

### Webhook Payload (n8n -> App)

**Inbound message:**
```json
{
  "type": "message",
  "phone": "201012345678",
  "body": "Message text from customer",
  "mediaUrl": null,
  "mediaType": null,
  "evolutionMessageId": "3EB0A1B2C3D4E5F6",
  "timestamp": "2026-07-23T12:00:00Z"
}
```

**Status update:**
```json
{
  "type": "status",
  "evolutionMessageId": "3EB0A1B2C3D4E5F6",
  "status": "delivered",
  "timestamp": "2026-07-23T12:00:05Z"
}
```

---

## Security Considerations

| Concern | Mitigation |
|---|---|
| Evolution API key exposure | Stored as server-side env var (`EVOLUTION_API_KEY`). Never in client code, never in API responses. |
| Webhook spoofing | Shared secret in `X-Webhook-Secret` header. Route rejects requests without valid secret. |
| Stored XSS via inbound messages | All message body content must be escaped/sanitized on render in the chat UI. Use React's default JSX escaping (no `dangerouslySetInnerHTML`). |
| Admin authorization | All `/api/admin/customers/*` routes use the existing `extractToken()` + `verifyAdmin()` pattern. |
| Message send abuse | Rate limit: max 10 outbound messages per admin per minute. Enforced server-side in the API route. |
| Phone validation | Validate phone format before attempting Evolution API call. Reject invalid/empty phones with a clear error. |
| Audit trail | Every outbound message records `admin_id`. Query-able for compliance. |
| PII in messages | Message content is stored in Supabase (already encrypted at rest). No message content in server logs. |

---

## Success Criteria

| Metric | Target |
|---|---|
| Customer list loads with stats | Paginated list showing computed metrics from the view, searchable by name/phone |
| Customer detail shows full profile | Contact info, stats, order history, and WhatsApp panel all render correctly |
| WhatsApp send works end-to-end | Admin sends message -> Evolution API delivers -> message logged in DB with status updates |
| Inbound messages appear in real-time | Customer reply arrives in the chat panel within 3 seconds via Realtime |
| Message status updates | Status webhooks update message rows -> UI reflects sent/delivered/read |
| RTL + bilingual | All pages render correctly in AR (RTL) and EN (LTR) modes |
| Theme | All pages render correctly in dark and light modes |
| TypeScript | `npx tsc --noEmit` passes with zero errors |
| Build | `npm run build` passes |
| No data duplication | Customer stats come from the `customer_stats` view, not stored columns |

---

## Out of Scope

- WhatsApp template messages (Meta-approved templates with variables) --- future spec
- Bulk messaging / broadcast to multiple customers
- WhatsApp media sending from admin (text only in v1; media columns reserved for future)
- Customer segmentation / tagging system (beyond simple notes field)
- Customer export (CSV/Excel)
- WhatsApp chatbot / auto-reply
- Multi-instance Evolution API support (single instance for now)

---

## Assumptions

1. The Evolution API instance is already connected to a WhatsApp Business number and operational.
2. The n8n instance has network access to the Next.js API routes for webhook forwarding.
3. Egyptian phone numbers are the primary format, but the normalization handles international formats.
4. The existing `orders` table has sufficient data to compute meaningful customer stats.
5. Supabase Realtime is enabled on the project and working (already used for orders).
