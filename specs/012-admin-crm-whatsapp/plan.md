# Implementation Plan: Customer CRM Module with WhatsApp Messaging

**Spec:** 012-admin-crm-whatsapp
**Date:** 2026-07-23

---

## Architecture Approach

This feature spans all four layers of the application architecture. Unlike
chart-only specs that touch only components, this spec introduces a new bounded
context (`whatsapp`) alongside extending the existing `customers` context,
adds new API routes, and integrates an external service (Evolution API).

```
┌──────────────────────────────────────────────────────────────────┐
│ Pages                                                            │
│ ├── /admin/customers/page.tsx          (NEW — customer list)     │
│ └── /admin/customers/[id]/page.tsx     (NEW — customer detail)   │
├──────────────────────────────────────────────────────────────────┤
│ Components                                                       │
│ ├── CustomerList.tsx                   (NEW — paginated table)   │
│ ├── CustomerDetail.tsx                 (NEW — profile + panels)  │
│ └── WhatsAppChat.tsx                   (NEW — messaging panel)   │
├──────────────────────────────────────────────────────────────────┤
│ Features (Client)                                                │
│ ├── customers.api.ts                   (NEW — RTK Query)        │
│ ├── customers.hooks.ts                 (NEW — manager + detail) │
│ └── whatsapp/whatsapp.hooks.ts         (NEW — chat hook)        │
├──────────────────────────────────────────────────────────────────┤
│ Features (Server)                                                │
│ ├── customers.repository.ts            (EXTENDED)               │
│ ├── customers.service.ts               (EXTENDED)               │
│ ├── whatsapp/whatsapp-message.repository.ts  (NEW)              │
│ ├── whatsapp/whatsapp.service.ts             (NEW)              │
│ └── whatsapp/evolution.service.ts            (NEW)              │
├──────────────────────────────────────────────────────────────────┤
│ API Routes                                                       │
│ ├── /api/admin/customers/route.ts            (NEW)              │
│ ├── /api/admin/customers/[id]/route.ts       (NEW)              │
│ ├── /api/admin/customers/[id]/messages/route.ts  (NEW)          │
│ └── /api/webhooks/whatsapp/route.ts          (NEW)              │
├──────────────────────────────────────────────────────────────────┤
│ Database                                                         │
│ ├── whatsapp_messages table                  (NEW)              │
│ ├── customer_stats view                      (NEW)              │
│ └── customers.notes column                   (NEW)              │
├──────────────────────────────────────────────────────────────────┤
│ n8n                                                              │
│ └── WhatsApp inbound webhook workflow        (NEW)              │
└──────────────────────────────────────────────────────────────────┘
```

---

## File Change Map

### New Files

| File | Layer | Purpose | FR |
|---|---|---|---|
| `src/features/whatsapp/evolution.service.ts` | Server | Evolution API HTTP client: sendText, sendMedia, getConnectionStatus, normalizePhone | FR-07 |
| `src/features/whatsapp/whatsapp-message.repository.ts` | Server | Supabase CRUD for `whatsapp_messages` table | FR-05 |
| `src/features/whatsapp/whatsapp.service.ts` | Server | Orchestrates message send (validate, normalize, call Evolution, persist) and inbound processing | FR-08 |
| `src/features/whatsapp/whatsapp.hooks.ts` | Client | `useWhatsAppChat` hook: messages query, send mutation, Realtime via `useRealtime` `onEvent` callback triggering RTK Query refetch | FR-15 |
| `src/features/customers/customers.api.ts` | Client | RTK Query API: getCustomers (paginated), getCustomerDetail, updateCustomer, getMessages, sendMessage | FR-12 |
| `src/features/customers/customers.hooks.ts` | Client | `useCustomersManager` (list), `useCustomerDetail` (detail page) | FR-13, FR-14 |
| `src/app/api/admin/customers/route.ts` | API | `GET` paginated customer list with stats | FR-09 |
| `src/app/api/admin/customers/[id]/route.ts` | API | `GET` customer detail, `PATCH` update notes/email | FR-09 |
| `src/app/api/admin/customers/[id]/messages/route.ts` | API | `GET` paginated message history, `POST` send message | FR-10 |
| `src/app/api/webhooks/whatsapp/route.ts` | API | `POST` receive inbound messages + status updates from n8n | FR-11 |
| `src/components/admin/customers/CustomerList.tsx` | UI | Paginated table with search, stats columns, row navigation | FR-16 |
| `src/components/admin/customers/CustomerDetail.tsx` | UI | Contact card, stats card, order history table | FR-17 |
| `src/components/admin/customers/WhatsAppChat.tsx` | UI | Chat bubble UI, compose, templates, status indicators | FR-18 |
| `src/app/(admin)/admin/customers/page.tsx` | Page | Customer list page | FR-19 |
| `src/app/(admin)/admin/customers/[id]/page.tsx` | Page | Customer detail page | FR-20 |

### Modified Files

| File | Change | FR |
|---|---|---|
| `src/features/customers/customers.repository.ts` | Add `getAll(page, limit, search?)`, `getById(id)`, `update(id, data)`, `getCustomerOrders(id)`, `getCustomerStats(id)`, `getAllWithStats(page, limit, search?)` | FR-04 |
| `src/features/customers/customers.service.ts` | Add `getCustomerList(page, limit, search?)`, `getCustomerDetail(id)` | FR-06 |
| `src/features/shared/types.ts` | Add `WhatsAppMessage`, `WhatsAppMessageInput`, `CustomerWithStats`, `CustomerDetail`, `PaginatedResponse<T>`, `WhatsAppWebhookPayload` types | FR-01 thru FR-12 |
| `src/lib/redux/store.ts` | Register `customersApi` reducer and middleware | FR-23 |
| `src/features/i18n/dictionary.ts` | Add `crm.*` namespace with all customer/messaging strings (AR + EN) | FR-24 |
| `src/components/admin/AdminLayoutClient.tsx` | Add "Customers" sidebar navigation link with Users icon | FR-26 |

### New Files (Analytics --- P3)

| File | Layer | Purpose | FR |
|---|---|---|---|
| `src/app/api/admin/customers/analytics/route.ts` | API | `GET` customer analytics (total, new, repeat rate, top 5) from `customer_stats` view | FR-22 |

### Modified Files (Analytics --- P3)

| File | Change | FR |
|---|---|---|
| `src/app/(admin)/admin/page.tsx` | Add customer analytics widgets (total customers, new this period, repeat rate, top 5 by revenue) | FR-22 |
| `src/features/orders/orders.analytics.ts` | Add `customerAnalytics()` function computing customer-level metrics | FR-22 |
| `src/features/shared/types.ts` | Add `CustomerAnalytics` type | FR-22 |

### Unchanged Files

| File | Reason |
|---|---|
| `src/features/orders/orders.repository.ts` | Customer order history queries are added to `customers.repository.ts` (joins orders table) --- orders repo stays focused on order lifecycle |
| `src/features/orders/orders.service.ts` | Not modified --- customer detail service fetches orders via customer repo |
| All existing API routes | No changes to existing order/product/category routes |
| `src/lib/auth.ts` | Reused as-is via `extractToken()` + `verifyAdmin()` |
| `src/lib/redux/api/baseQuery.ts` | Reused as-is --- new API uses same auth pattern |

---

## Component Design Details

### 1. CustomerList.tsx

A paginated table following the existing admin list pattern (similar to
`CategoryList.tsx` but with server-side pagination since customers scale).

**Props:**
```typescript
interface CustomerListProps {
  customers: CustomerWithStats[];
  totalCount: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  searchQuery: string;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
  onRowClick: (customerId: string) => void;
}
```

**Layout:**
- Search input (neu-input) at top --- debounced, searches name and phone
- Table with columns: Name, Phone, Email, Orders, Total Spent (EGP), Last Order
- Pagination controls at bottom (Previous / Page X of Y / Next)
- Empty state when no customers match search
- Loading skeleton while fetching

### 2. CustomerDetail.tsx

A multi-panel detail view for a single customer.

**Layout (responsive grid):**
```
Desktop (lg+):
┌────────────────────────┬────────────────────────┐
│ Contact Info Card       │ Stats Card             │
├────────────────────────┴────────────────────────┤
│ Order History Table                              │
├─────────────────────────────────────────────────┤
│ WhatsApp Chat Panel                              │
└─────────────────────────────────────────────────┘

Mobile:
[Contact Info] → [Stats] → [Orders] → [Chat] (stacked)
```

**Contact Info Card (neu-raised):**
- Full name, phone (with WhatsApp icon), email, primary address
- Edit button for notes field (inline textarea)

**Stats Card (neu-raised):**
- Total orders, total spent, AOV, first/last order date
- Values formatted with EGP currency and Arabic numerals when in AR mode

**Order History Table:**
- Compact table showing: Order ID (short), Date, Product(s), Quantity, Amount, Status badge
- Sorted by date descending
- Status badges use existing `badgeColorFor` styling

### 3. WhatsAppChat.tsx

A chat-style messaging panel embedded in the customer detail page.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Chat Header (customer name, connection status)   │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Inbound bubble - aligned start]                │
│                 [Outbound bubble - aligned end]   │
│  [Inbound bubble - aligned start]                │
│                                                  │
│  --- Load older messages ---                     │
│                                                  │
├─────────────────────────────────────────────────┤
│ Quick Reply Templates (horizontal scroll chips)  │
├─────────────────────────────────────────────────┤
│ [Compose input ............] [Send button]       │
└─────────────────────────────────────────────────┘
```

**Key behaviors:**
- Messages displayed as chat bubbles: inbound (start-aligned, muted bg), outbound (end-aligned, brand bg)
- Each bubble shows: body text, timestamp, status indicator (outbound only: clock/check/double-check/blue-check)
- Compose area: `neu-input` textarea + send button (disabled when empty or sending)
- Quick-reply template chips above compose area (horizontal scrollable row)
- Real-time: subscribes to `whatsapp_messages` table via `useRealtimeRefresh` for this customer_id
- Infinite scroll up for older messages (paginated via cursor/offset)
- Auto-scroll to bottom on new messages
- Message body escaped via React JSX (no dangerouslySetInnerHTML) to prevent XSS

**Status indicators (outbound messages):**
| Status | Icon | Description |
|---|---|---|
| `pending` | Clock | Message queued |
| `sent` | Single check | Delivered to WhatsApp servers |
| `delivered` | Double check | Delivered to recipient's phone |
| `read` | Blue double check | Recipient opened the message |
| `failed` | Red X | Send failed |

---

## API Route Design

### GET /api/admin/customers

**Auth:** Bearer token + admin check
**Query params:** `page` (default 1), `limit` (default 20), `search` (optional)
**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "uuid",
        "full_name": "...",
        "phone": "...",
        "email": "...",
        "created_at": "...",
        "total_orders": 5,
        "total_spent": 2500.00,
        "avg_order_value": 500.00,
        "first_order_date": "...",
        "last_order_date": "..."
      }
    ],
    "totalCount": 150,
    "page": 1,
    "limit": 20
  }
}
```

### GET /api/admin/customers/[id]

**Auth:** Bearer token + admin check
**Response:**
```json
{
  "success": true,
  "data": {
    "customer": { "id": "...", "full_name": "...", "phone": "...", "email": "...", "notes": "...", "created_at": "..." },
    "stats": { "total_orders": 5, "total_spent": 2500, "avg_order_value": 500, "first_order_date": "...", "last_order_date": "..." },
    "orders": [ { "id": "...", "status": "delivered", "total_price": 500, "quantity": 2, "product": { "name": "..." }, "created_at": "..." } ],
    "address": { "street_details": "...", "zone": { "arabic_name": "...", "city": { "name": "..." } } }
  }
}
```

### POST /api/admin/customers/[id]/messages

**Auth:** Bearer token + admin check
**Body:** `{ "body": "Message text" }`
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "direction": "outbound",
    "body": "Message text",
    "status": "sent",
    "evolution_message_id": "3EB0...",
    "created_at": "..."
  }
}
```

### POST /api/webhooks/whatsapp

**Auth:** `X-Webhook-Secret` header matching `WHATSAPP_WEBHOOK_SECRET` env var
**Body:** See webhook payload format in spec.md
**Response:** `{ "success": true }` (200) or `{ "success": false, "error": "..." }` (401/500)

---

## Evolution API Integration Layer Design

### Module structure

```
src/features/whatsapp/
├── evolution.service.ts              # HTTP client for Evolution API
├── whatsapp-message.repository.ts    # Supabase CRUD for whatsapp_messages
├── whatsapp.service.ts               # Business orchestration
└── whatsapp.hooks.ts                 # Client-side chat hook
```

### EvolutionService API

```typescript
class EvolutionService {
  private baseUrl: string;    // from EVOLUTION_API_URL
  private apiKey: string;     // from EVOLUTION_API_KEY
  private instance: string;   // from EVOLUTION_INSTANCE

  normalizePhone(phone: string): string;
  // Strips non-digits, prepends 20 if local format, returns digits-only

  toJid(phone: string): string;
  // normalizePhone(phone) + "@s.whatsapp.net"

  async sendText(phone: string, body: string): Promise<{ messageId: string }>;
  // POST /message/sendText/{instance}
  // Body: { number: jid, text: body }
  // Returns Evolution's message ID for status tracking

  async getConnectionStatus(): Promise<{ connected: boolean; state: string }>;
  // GET /instance/connectionState/{instance}
}
```

### WhatsAppService API

```typescript
class WhatsAppService {
  async sendMessage(customerId: string, adminId: string, body: string): Promise<WhatsAppMessage>;
  // 1. Look up customer phone
  // 2. Validate phone format
  // 3. Call evolutionService.sendText()
  // 4. Persist message via whatsappMessageRepository.create()
  // 5. Return the persisted message

  async processInboundMessage(payload: InboundWebhookPayload): Promise<void>;
  // 1. Find customer by normalized phone
  // 2. If not found, skip (or create?) --- design decision: skip for v1
  // 3. Persist message as inbound via repository

  async processStatusUpdate(payload: StatusWebhookPayload): Promise<void>;
  // 1. Find message by evolution_message_id
  // 2. Update status via repository
}
```

---

## Dependency Map

```
Database Schema (T01)
    |
    ├──► CustomerRepository extension (T02)
    │        |
    │        └──► CustomerService extension (T03)
    │                 |
    │                 └──► Customer API Routes (T04)
    │                          |
    │                          └──► RTK Query API (T07)
    │                                   |
    │                                   └──► Hooks (T08)
    │                                            |
    │                                            └──► UI Components (T09, T10)
    │                                                     |
    │                                                     └──► Pages (T11)
    |
    ├──► WhatsApp Message Repository (T02)
    │        |
    │        └──► Evolution Service (T05)
    │                 |
    │                 └──► WhatsApp Service (T06)
    │                          |
    │                          ├──► Message API Routes (T04)
    │                          └──► Webhook Route (T04)
    │
    └──► n8n Workflow (T12) --- parallel, only needs webhook URL
```

---

## Security Considerations

- All admin customer routes reuse the existing `extractToken()` + `verifyAdmin()` auth pattern (inline in each route handler, matching the categories route pattern).
- The webhook route uses a different auth mechanism: shared secret header, not Bearer token. This is because the caller is n8n, not an admin browser session.
- Evolution API key is server-side only. The `EvolutionService` class reads env vars in its constructor. If env vars are missing, the service throws on construction with a clear error message.
- Message body XSS prevention: React's JSX escaping handles this by default. The spec explicitly prohibits `dangerouslySetInnerHTML` in the chat component.
- Rate limiting on message send: implemented as an in-memory counter per admin ID in the API route (resets per minute). For v1, this is sufficient. A Redis-backed limiter can be added if needed.

---

## Testing Strategy

1. **API routes**: Manual testing via curl / Postman with valid admin token
2. **Evolution integration**: Test with actual Evolution API instance (already running)
3. **Webhook**: Test via n8n workflow trigger or curl with shared secret
4. **Real-time**: Verify Supabase Realtime broadcasts on `whatsapp_messages` INSERT/UPDATE
5. **UI**: Manual visual testing in all 4 mode combinations (AR+dark, AR+light, EN+dark, EN+light)
6. **TypeScript**: `npx tsc --noEmit` passes
7. **Build**: `npm run build` passes
