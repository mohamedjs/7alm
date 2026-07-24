# Tasks: Customer CRM Module with WhatsApp Messaging

**Spec:** 012-admin-crm-whatsapp
**Date:** 2026-07-23

---

## Task Dependency Graph

```
T01 (database schema + types) ───────────────────────────────────┐
    |                                                             |
    ├──► T02 (repositories)                                       |
    │        |                                                    |
    │        ├──► T03 (services — customer)                       |
    │        │        |                                           |
    │        │        └──► T04 (API routes — all)                 |
    │        │                 |                                   |
    │        │                 └──► T07 (RTK Query API)           |
    │        │                          |                          |
    │        │                          ├──► T08 (hooks)          |
    │        │                          │        |                 |
    │        │                          │        ├──► T09 (CustomerList.tsx)
    │        │                          │        ├──► T10 (CustomerDetail.tsx)
    │        │                          │        └──► T11 (WhatsAppChat.tsx)
    │        │                          │                 |
    │        │                          │                 └──► T13 (pages + integration)
    │        │                          │                          |
    │        │                          └──► T15b (analytics UI)  └──► T14 (verification)
    │        │                                   |
    │        └──► T05 (Evolution service)        |
    │                 |                          |
    │                 └──► T06 (WhatsApp svc)    |
    │                          |                 |
    │                          └──► T04          |
    │                                            |
    ├──► T15a (analytics backend) ───────────────┘
    │
    └──► T12 (n8n workflow) ── parallel, only needs webhook URL from T04
```

---

## T01 — Database Schema: Tables, View, and Realtime

**Agent:** @backend
**Priority:** P0 | **Estimate:** 30 min | **Blocked by:** none
**FR:** FR-01, FR-02, FR-03, FR-25

Create the database schema changes in Supabase.

**Deliverables:**
1. Create `whatsapp_messages` table with all columns per spec (id, customer_id, admin_id, direction, body, media_url, media_type, status, evolution_message_id, phone, created_at, updated_at)
2. Create indexes: `idx_whatsapp_messages_customer` (customer_id, created_at DESC), `idx_whatsapp_messages_evolution` (evolution_message_id)
3. Add `notes` column to `customers` table (TEXT, nullable, default NULL)
4. Create `customer_stats` view joining `customers` LEFT JOIN `orders`. The view must include customer identity columns (`customer_id`, `full_name`, `phone`, `email`, `notes`, `created_at`) alongside computed aggregates (`total_orders`, `total_spent`, `avg_order_value`, `first_order_date`, `last_order_date`) so the list page can query a single source without joining
5. Enable Supabase Realtime on `whatsapp_messages` table
6. Add TypeScript types to `src/features/shared/types.ts`:
   - `WhatsAppMessage` interface (maps to `whatsapp_messages` table row)
   - `WhatsAppMessageInput` type (fields needed to create a message row)
   - `WhatsAppMessageDirection` type (`'inbound' | 'outbound'`)
   - `WhatsAppMessageStatus` type (`'pending' | 'sent' | 'delivered' | 'read' | 'failed'`)
   - `CustomerWithStats` interface (Customer identity + computed stats --- mirrors the `customer_stats` view row shape)
   - `CustomerStats` interface (just the aggregate fields: total_orders, total_spent, avg_order_value, first_order_date, last_order_date)
   - `CustomerDetail` interface (customer + stats + orders + address)
   - `PaginatedResponse<T>` generic interface (`{ data: T[]; totalCount: number; page: number; limit: number }`)
   - `InboundWebhookPayload` and `StatusWebhookPayload` interfaces

**Acceptance Criteria:**
- SQL migrations run without errors
- `customer_stats` view returns correct aggregates for existing customers
- `whatsapp_messages` table accepts inserts with all required fields
- Supabase Realtime broadcasts on `whatsapp_messages` INSERT and UPDATE
- All new TypeScript types compile with `npx tsc --noEmit`

---

## T02 — Repositories: Customer Extension + WhatsApp Messages

**Agent:** @backend
**Priority:** P0 | **Estimate:** 45 min | **Blocked by:** T01
**FR:** FR-04, FR-05

Extend the existing `CustomerRepository` and create the new `WhatsAppMessageRepository`.

**Deliverables:**

**A. Extend `src/features/customers/customers.repository.ts`:**
- `getAllWithStats(page: number, limit: number, search?: string): Promise<{ data: CustomerWithStats[]; totalCount: number }>` --- Queries `customer_stats` view directly (single-table, no join needed --- the view already includes identity columns). Search filters on `full_name ILIKE` or `phone ILIKE` via `.or()`. Uses `.range()` for pagination and `{ count: "exact" }` for total count.
- `getById(id: string): Promise<Customer | null>` --- Single customer by ID
- `getCustomerOrders(id: string): Promise<OrderWithDetails[]>` --- All orders for this customer with product, address, zone joins (reuse the same select shape as `orders.repository.ts` `getAllOrders` but filtered by customer_id)
- `getCustomerStats(id: string): Promise<CustomerStats | null>` --- Query `customer_stats` view for single customer
- `getCustomerAddress(id: string): Promise<Address & { zone: Zone & { city: City } } | null>` --- Most recent address with zone/city join
- `update(id: string, data: Partial<Pick<Customer, 'notes' | 'email'>>): Promise<Customer | null>` --- Update mutable fields

**B. Create `src/features/whatsapp/whatsapp-message.repository.ts`:**
- `create(msg: WhatsAppMessageInput): Promise<WhatsAppMessage>` --- Insert a new message row
- `getByCustomerId(customerId: string, page: number, limit: number): Promise<{ data: WhatsAppMessage[]; totalCount: number }>` --- Paginated, ordered by created_at DESC
- `updateStatus(evolutionMessageId: string, status: WhatsAppMessageStatus): Promise<void>` --- Update status by Evolution message ID
- `findByEvolutionId(evolutionMessageId: string): Promise<WhatsAppMessage | null>` --- Lookup for webhook processing
- `getRecentByCustomerId(customerId: string, limit: number): Promise<WhatsAppMessage[]>` --- Latest N messages for quick preview

**Constraints:**
- Follow the existing class-based repository pattern (see `categories.repository.ts`)
- Use `supabase` import from `@/lib/supabase`
- All methods are async, return typed results
- Error handling matches existing pattern (console.error + throw or return null)

**Acceptance Criteria:**
- `getAllWithStats` returns paginated customers with computed stats from the view
- Search by name or phone works case-insensitively
- `getByCustomerId` returns messages in reverse chronological order with correct pagination
- `updateStatus` successfully updates a message found by its Evolution ID
- TypeScript passes

---

## T03 — Customer Service Extension

**Agent:** @backend
**Priority:** P0 | **Estimate:** 30 min | **Blocked by:** T02
**FR:** FR-06

Extend the existing `CustomerService` with methods for the CRM list and detail views.

**Deliverables:**

Add to `src/features/customers/customers.service.ts`:
- `getCustomerList(page: number, limit: number, search?: string): Promise<PaginatedResponse<CustomerWithStats>>` --- Delegates to repository.getAllWithStats, returns structured paginated response
- `getCustomerDetail(id: string): Promise<CustomerDetail>` --- Fetches customer + stats + orders + primary address in parallel (Promise.all), assembles the full detail DTO. Throws if customer not found.
- `updateCustomer(id: string, data: Partial<Pick<Customer, 'notes' | 'email'>>): Promise<Customer>` --- Validates input, delegates to repository.update

**Constraints:**
- Existing `findOrCreate` method must remain unchanged
- Use Promise.all for parallel fetches in `getCustomerDetail` (stats + orders + address are independent queries)
- Never import or call the orders service --- query orders through the customer repository

**Acceptance Criteria:**
- `getCustomerDetail` returns a complete DTO with customer, stats, orders, and address
- `getCustomerList` returns paginated results matching search criteria
- Existing `findOrCreate` still works for the checkout flow
- TypeScript passes

---

## T04 — API Routes: Customers, Messages, and Webhook

**Agent:** @backend
**Priority:** P0 | **Estimate:** 60 min | **Blocked by:** T03, T06
**FR:** FR-09, FR-10, FR-11

Create all admin API routes and the webhook route.

**Deliverables:**

**A. `src/app/api/admin/customers/route.ts`:**
- `GET` --- Paginated customer list with stats
  - Query params: `page` (default 1), `limit` (default 20), `search` (optional)
  - Auth: `extractToken()` + `verifyAdmin()` pattern (match categories route)
  - Response: `{ success: true, data: { customers: [...], totalCount, page, limit } }`

**B. `src/app/api/admin/customers/[id]/route.ts`:**
- `GET` --- Customer detail (customer + stats + orders + address)
  - Auth: same pattern
  - Response: `{ success: true, data: { customer, stats, orders, address } }`
- `PATCH` --- Update customer notes/email
  - Auth: same pattern
  - Body: `{ notes?: string, email?: string }`
  - Response: `{ success: true, data: customer }`

**C. `src/app/api/admin/customers/[id]/messages/route.ts`:**
- `GET` --- Paginated message history
  - Query params: `page` (default 1), `limit` (default 50)
  - Auth: same pattern
  - Response: `{ success: true, data: { messages: [...], totalCount, page, limit } }`
- `POST` --- Send a WhatsApp message
  - Auth: same pattern (extract admin user ID for audit)
  - Body: `{ body: string }`
  - Validation: body must be non-empty string, max 4096 chars
  - Rate limit: in-memory counter, max 10 sends per admin per minute
  - Calls `whatsappService.sendMessage(customerId, adminId, body)`
  - Response: `{ success: true, data: message }`

**D. `src/app/api/webhooks/whatsapp/route.ts`:**
- `POST` --- Receive inbound messages and status updates from n8n
  - Auth: `X-Webhook-Secret` header must match `WHATSAPP_WEBHOOK_SECRET` env var
  - Distinguishes payload by `type` field: `"message"` or `"status"`
  - For `"message"`: calls `whatsappService.processInboundMessage(payload)`
  - For `"status"`: calls `whatsappService.processStatusUpdate(payload)`
  - Response: `{ success: true }` (always 200 on valid secret, even if processing fails internally --- webhook callers expect 200)

**Constraints:**
- Follow the exact auth pattern from `src/app/api/admin/categories/route.ts` (inline supabase.auth.getUser + admins table check)
- All routes return `{ success: boolean, data?: ..., error?: string }` envelope
- Webhook route does NOT use Bearer token auth --- uses shared secret header instead

**Acceptance Criteria:**
- Customer list returns paginated results with stats from the view
- Customer detail returns the full DTO
- Message send calls Evolution API and persists the message
- Webhook correctly processes both inbound messages and status updates
- Rate limiter blocks the 11th message within a minute
- Invalid webhook secret returns 401
- TypeScript passes

---

## T05 — Evolution API Integration Service

**Agent:** @backend
**Priority:** P0 | **Estimate:** 45 min | **Blocked by:** T01 (types only)
**FR:** FR-07

Create the Evolution API HTTP client as a server-side service module.

**File:** `src/features/whatsapp/evolution.service.ts`

**Deliverables:**
- Class `EvolutionService` with constructor reading from env:
  - `EVOLUTION_API_URL` (base URL)
  - `EVOLUTION_API_KEY` (API key)
  - `EVOLUTION_INSTANCE` (instance name)
  - Throws descriptive error if any env var is missing
- `normalizePhone(phone: string): string` --- strips non-digits, handles Egyptian local (0XX -> 20XX), returns digits-only
- `toJid(phone: string): string` --- `normalizePhone(phone) + "@s.whatsapp.net"`
- `async sendText(phone: string, body: string): Promise<{ messageId: string }>`:
  - POST to `{baseUrl}/message/sendText/{instance}`
  - Headers: `{ "apikey": apiKey, "Content-Type": "application/json" }`
  - Body: `{ "number": toJid(phone), "text": body }`
  - Extracts and returns the message ID from Evolution response
  - Throws on HTTP error with descriptive message
- `async getConnectionStatus(): Promise<{ connected: boolean; state: string }>`:
  - GET `{baseUrl}/instance/connectionState/{instance}`
  - Returns connection state
- Export a singleton: `export const evolutionService = new EvolutionService()`

**Constraints:**
- Use native `fetch()` (no axios) --- Next.js extends fetch with caching control
- Never log the API key or full message bodies (PII)
- Phone normalization must handle: `01012345678`, `+201012345678`, `201012345678`, `2012345678` (8-digit old format)
- Server-side only --- never import in client components

**Acceptance Criteria:**
- `normalizePhone("01012345678")` returns `"201012345678"`
- `normalizePhone("+201012345678")` returns `"201012345678"`
- `toJid("01012345678")` returns `"201012345678@s.whatsapp.net"`
- `sendText` makes correct HTTP request to Evolution API
- Missing env vars throw immediately on service construction
- TypeScript passes

---

## T06 — WhatsApp Business Logic Service

**Agent:** @backend
**Priority:** P0 | **Estimate:** 45 min | **Blocked by:** T02, T05
**FR:** FR-08

Create the WhatsApp orchestration service that coordinates Evolution API calls
with database persistence.

**File:** `src/features/whatsapp/whatsapp.service.ts`

**Deliverables:**
- Class `WhatsAppService` with injected dependencies (evolution service + message repository + customer repository)
- `async sendMessage(customerId: string, adminId: string, body: string): Promise<WhatsAppMessage>`:
  1. Fetch customer by ID (throw if not found)
  2. Validate customer has a phone number
  3. Call `evolutionService.sendText(customer.phone, body)`
  4. Persist message via `whatsappMessageRepository.create({ customer_id, admin_id, direction: 'outbound', body, phone: customer.phone, status: 'sent', evolution_message_id: result.messageId })`
  5. Return the persisted message
  6. If Evolution API call fails, persist with status `'failed'` and re-throw
- `async processInboundMessage(payload: InboundWebhookPayload): Promise<void>`:
  1. Normalize phone from payload
  2. Find customer by normalized phone (via `customerRepository.findByPhone`)
  3. If no customer found, log warning and return (don't create --- v1 decision)
  4. Persist message: `{ customer_id, direction: 'inbound', body: payload.body, phone: payload.phone, status: 'delivered', evolution_message_id: payload.evolutionMessageId }`
- `async processStatusUpdate(payload: StatusWebhookPayload): Promise<void>`:
  1. Find message by `payload.evolutionMessageId`
  2. If found, update status to `payload.status`
  3. If not found, log warning (webhook for a message not in our system)
- `async getMessages(customerId: string, page: number, limit: number): Promise<PaginatedResponse<WhatsAppMessage>>`:
  - Delegates to repository
- Export singleton: `export const whatsappService = new WhatsAppService()`

**Constraints:**
- Follow the service pattern from `orders.service.ts` (class-based, clear method signatures)
- Never call Supabase directly --- always through repositories
- Failed sends must still be logged (with status `'failed'`) for admin visibility

**Acceptance Criteria:**
- `sendMessage` calls Evolution API and persists the message on success
- `sendMessage` persists a failed message and re-throws on Evolution API error
- `processInboundMessage` correctly matches customer by phone and persists
- `processStatusUpdate` finds and updates the correct message row
- Unknown phones are gracefully skipped (logged, not crashed)
- TypeScript passes

---

## T07 — RTK Query API: customersApi

**Agent:** @frontend
**Priority:** P0 | **Estimate:** 45 min | **Blocked by:** T04
**FR:** FR-12, FR-23

Create the client-side RTK Query API for customers and messaging.

**Deliverables:**

**A. Create `src/features/customers/customers.api.ts`:**
- Uses `createApi` with `baseQueryWithAuth`, `reducerPath: "customersApi"`
- Tag types: `["Customer", "CustomerDetail", "WhatsAppMessage"]`
- Endpoints:
  - `getCustomers`: query, paginated (`{ page, limit, search? }` -> `PaginatedResponse<CustomerWithStats>`)
  - `getCustomerDetail`: query by ID -> `CustomerDetail`
  - `updateCustomer`: mutation (`{ id, notes?, email? }` -> `Customer`)
  - `getMessages`: query (`{ customerId, page, limit }` -> `PaginatedResponse<WhatsAppMessage>`)
  - `sendMessage`: mutation (`{ customerId, body }` -> `WhatsAppMessage`)
- Tag invalidation:
  - `getCustomers` provides `[{ type: "Customer", id: "LIST" }]`
  - `getCustomerDetail` provides `[{ type: "CustomerDetail", id }]`
  - `getMessages` provides `[{ type: "WhatsAppMessage", id: customerId }]`
  - `sendMessage` invalidates `[{ type: "WhatsAppMessage", id: customerId }]`
  - `updateCustomer` invalidates `[{ type: "CustomerDetail", id }, { type: "Customer", id: "LIST" }]`
- All responses use `transformResponse` to unwrap the `ApiEnvelope`

**B. Register in `src/lib/redux/store.ts`:**
- Import `customersApi`
- Add reducer and middleware

**Constraints:**
- Follow the exact pattern from `categories.api.ts` (ApiEnvelope, transformResponse, tag types)
- Export generated hooks: `useGetCustomersQuery`, `useGetCustomerDetailQuery`, `useSendMessageMutation`, etc.

**Acceptance Criteria:**
- All endpoints correctly call the matching API routes
- Tag invalidation triggers re-fetch after mutations
- Generated hooks are properly typed
- Store registration doesn't break existing state
- TypeScript passes

---

## T08 — UI Hooks: Customer Manager, Detail, and Chat

**Agent:** @frontend
**Priority:** P1 | **Estimate:** 45 min | **Blocked by:** T07
**FR:** FR-13, FR-14, FR-15

Create the client-side hooks for the CRM UI.

**Deliverables:**

**A. Create `src/features/customers/customers.hooks.ts`:**

`useCustomersManager()`:
- Wraps `useGetCustomersQuery` with local state for `page`, `searchQuery`
- Debounced search (300ms) --- search triggers page reset to 1
- Returns: `{ customers, totalCount, page, pageSize, isLoading, searchQuery, setSearchQuery, setPage }`

`useCustomerDetail(id: string)`:
- Wraps `useGetCustomerDetailQuery(id)`
- Wraps `useUpdateCustomerMutation`
- Returns: `{ customer, stats, orders, address, isLoading, updateCustomer }`

**B. Create `src/features/whatsapp/whatsapp.hooks.ts`:**

`useWhatsAppChat(customerId: string)`:
- Wraps `useGetMessagesQuery({ customerId, page, limit })` for initial load
- Wraps `useSendMessageMutation`
- Uses `useRealtime("whatsapp_messages", { event: "*", filter: \`customer_id=eq.${customerId}\`, onEvent: () => refetch() })` where `refetch` is the RTK Query refetch function from `useGetMessagesQuery`. The `useRealtime` hook subscribes to Supabase Realtime postgres_changes; the `onEvent` callback triggers the RTK Query re-fetch so the message list stays current without polling.
- Manages compose text state
- Handles send: calls mutation, clears compose on success
- Returns: `{ messages, isLoading, isSending, composeText, setComposeText, sendMessage, loadMore }`

**Constraints:**
- Follow the hook pattern from `categories.hooks.ts`
- Debounce via `useCallback` + `setTimeout` (or a small utility) --- no external debounce library
- Real-time uses `useRealtime` from `@/features/realtime/realtime.hooks` with an `onEvent` callback --- do not use `useRealtimeRefresh` (it only calls `router.refresh()`, which does not trigger RTK Query re-fetches). Do not create a new subscription mechanism.

**Acceptance Criteria:**
- Search debounce works (typing fast doesn't fire multiple requests)
- Page changes trigger new API calls
- Chat hook refetches on real-time events (new inbound message or status update)
- Send mutation clears compose text on success
- TypeScript passes

---

## T09 — Component: CustomerList.tsx

**Agent:** @frontend
**Priority:** P1 | **Estimate:** 60 min | **Blocked by:** T08
**FR:** FR-16

Build the customer list table component.

**File:** `src/components/admin/customers/CustomerList.tsx`

**Deliverables:**
- Search input at top (neu-input, placeholder via `t("crm.searchPlaceholder")`)
- Table with columns: Name, Phone, Email, Orders, Total Spent, Last Order
  - Total Spent formatted as EGP currency
  - Last Order formatted as relative date or formatted date
  - Orders column shows integer count
- Row click navigates to `/admin/customers/{id}` via Next.js `useRouter`
- Pagination controls at bottom: Previous / "Page X of Y" / Next
- Loading state: skeleton rows
- Empty state: "No customers found" message (via `t()`)
- All text via `t("crm.*")` keys
- RTL-aware: use logical CSS properties (ms/me/ps/pe/start/end)
- Neumorphic design: `neu-raised` card wrapper, `neu-btn` for pagination buttons

**Constraints:**
- Component is `"use client"`
- Follow the layout pattern from `CategoryList.tsx` (table inside a neu-raised card)
- No `dangerouslySetInnerHTML`
- Phone numbers displayed as-is (no formatting --- Egyptian phones vary)

**Acceptance Criteria:**
- Table renders with correct data and formatting
- Search filters by name and phone
- Pagination works (page changes, boundary handling)
- Row click navigates correctly
- Renders correctly in AR (RTL) and EN (LTR)
- Renders correctly in dark and light themes
- TypeScript passes

---

## T10 — Component: CustomerDetail.tsx

**Agent:** @frontend
**Priority:** P1 | **Estimate:** 60 min | **Blocked by:** T08
**FR:** FR-17

Build the customer detail component with contact info, stats, and order history.

**File:** `src/components/admin/customers/CustomerDetail.tsx`

**Deliverables:**
- **Contact Info Card** (neu-raised):
  - Full name (heading), phone (with phone icon), email, primary address (zone + city)
  - Notes field: editable textarea with save button (calls `updateCustomer`)
  - Back button to `/admin/customers`
- **Stats Card** (neu-raised, grid of stat items):
  - Total Orders, Total Spent (EGP), Avg Order Value (EGP), First Order, Last Order
  - Each stat as a labeled value pair
- **Order History Table** (neu-raised):
  - Columns: Order # (short ID), Date, Product, Qty, Amount (EGP), Status (badge)
  - Sorted by date descending
  - Status badges with appropriate colors (reuse existing order status styling)
  - Empty state if no orders

**Layout:**
- Desktop: 2-column grid for contact + stats at top, full-width order table below
- Mobile: stacked single column
- Uses responsive grid (`grid-cols-1 lg:grid-cols-2`)

**Constraints:**
- All text via `t("crm.*")` keys
- RTL-aware layout with logical properties
- Status badge colors should match the existing orders page styling
- No business logic in the component --- data comes from props/hooks

**Acceptance Criteria:**
- Contact info displays correctly
- Notes field saves on button click
- Stats show computed values from the view (not calculated client-side)
- Order history table shows all orders with correct formatting
- Responsive layout works at all breakpoints
- RTL + theme aware
- TypeScript passes

---

## T11 — Component: WhatsAppChat.tsx

**Agent:** @frontend
**Priority:** P1 | **Estimate:** 90 min | **Blocked by:** T08
**FR:** FR-18, FR-21

Build the WhatsApp messaging panel component.

**File:** `src/components/admin/customers/WhatsAppChat.tsx`

**Deliverables:**
- **Chat header**: Customer name, WhatsApp icon, connection status indicator
- **Message list**:
  - Chat bubble layout: inbound messages start-aligned (muted bg), outbound end-aligned (brand-500 bg, white text)
  - Each bubble shows: body text, timestamp (HH:mm format), status icon (outbound only)
  - Status icons: clock (pending), single check (sent), double check (delivered), blue double check (read), red X (failed)
  - Auto-scroll to bottom on new messages
  - "Load older" button at top for pagination
- **Quick-reply templates** (horizontal scroll row of chips):
  - Templates from dictionary: "Your order has been shipped", "Thank you for your order", "Your order is being prepared", "Please confirm your address"
  - Clicking a chip inserts its text into the compose area (not auto-sends)
  - Bilingual: templates switch with locale
- **Compose area**:
  - Textarea (neu-input, auto-resize, max 4 lines)
  - Send button (neu-btn, brand color, disabled when empty or sending)
  - Enter to send (Shift+Enter for newline)
  - Loading spinner on send button while sending
- **Empty state**: "No messages yet" centered in the message area

**Constraints:**
- Message body rendered via JSX text content only --- NO `dangerouslySetInnerHTML` (XSS prevention)
- All text via `t("crm.*")` keys
- RTL-aware: bubbles align correctly in RTL (inbound = end in RTL? No --- inbound is always start, outbound is always end, which flips correctly with logical properties)
- Neumorphic card wrapper for the entire panel
- Max height with overflow scroll on the message list

**Acceptance Criteria:**
- Messages render as chat bubbles with correct alignment
- Outbound messages show status indicators
- Quick-reply templates insert text into compose area
- Send button works and clears compose on success
- Real-time inbound messages appear without refresh
- Auto-scroll works on new messages
- No XSS possible from inbound message content
- RTL + theme aware
- TypeScript passes

---

## T12 — n8n Workflow: WhatsApp Inbound Webhook Forwarder

**Agent:** @n8n
**Priority:** P1 | **Estimate:** 60 min | **Blocked by:** T04 (needs webhook URL)
**FR:** FR-11 (webhook consumer side)

Create an n8n workflow that receives Evolution API webhooks for inbound messages
and status updates, normalizes them, and forwards to the app's webhook route.

**Deliverables:**
- **Trigger node**: Webhook node receiving POST from Evolution API
  - Evolution API configured to send webhooks to this n8n webhook URL
  - Events: `MESSAGES_UPSERT` (new messages), `MESSAGES_UPDATE` (status changes)
- **Processing nodes**:
  - Parse the Evolution API webhook payload
  - Determine event type: new message vs status update
  - For new messages: extract phone (from `key.remoteJid`, strip `@s.whatsapp.net`), body (from `message.conversation` or `message.extendedTextMessage.text`), evolutionMessageId (from `key.id`)
  - For status updates: extract evolutionMessageId (from `key.id`), map Evolution status to app status (`DELIVERY_ACK` -> `delivered`, `READ` -> `read`, `PLAYED` -> `read`)
- **Forward node**: HTTP Request to `POST {APP_URL}/api/webhooks/whatsapp`
  - Headers: `{ "Content-Type": "application/json", "X-Webhook-Secret": "<secret>" }`
  - Body: normalized payload matching the spec's webhook payload format
- **Error handling**: If the app returns non-200, log the error but don't retry (avoid message duplication)

**Configuration needed:**
- Evolution API instance webhook URL set to the n8n webhook trigger URL
- Evolution API webhook events enabled: `MESSAGES_UPSERT`, `MESSAGES_UPDATE`
- n8n environment variable or credential for the webhook secret

**Acceptance Criteria:**
- Inbound WhatsApp messages arrive at the app webhook with correct payload format
- Status updates (delivered, read) arrive at the app webhook with correct format
- Non-text messages (images, stickers) are either forwarded with mediaUrl or gracefully skipped
- Error in app route does not crash the n8n workflow

---

## T13 — Pages + Navigation Integration

**Agent:** @frontend
**Priority:** P1 | **Estimate:** 45 min | **Blocked by:** T09, T10, T11
**FR:** FR-19, FR-20, FR-24, FR-26

Create the admin pages and integrate into navigation.

**Deliverables:**

**A. `src/app/(admin)/admin/customers/page.tsx`:**
- Client component
- Uses `useCustomersManager()` hook
- Renders `<CustomerList>` with all necessary props
- Page title via `t("crm.title")`
- Follow the pattern from `src/app/(admin)/admin/categories/page.tsx`

**B. `src/app/(admin)/admin/customers/[id]/page.tsx`:**
- Client component
- Uses `useCustomerDetail(id)` hook (id from route params)
- Uses `useWhatsAppChat(id)` hook
- Renders `<CustomerDetail>` and `<WhatsAppChat>` in a stacked layout
- Loading state while data fetches
- Error state if customer not found

**C. Add i18n dictionary keys** to `src/features/i18n/dictionary.ts`:
- Add `crm.*` namespace with all needed keys (both AR and EN):
  - `crm.title`, `crm.searchPlaceholder`, `crm.noCustomers`, `crm.noMessages`
  - `crm.totalOrders`, `crm.totalSpent`, `crm.avgOrderValue`, `crm.firstOrder`, `crm.lastOrder`
  - `crm.sendMessage`, `crm.composePlaceholder`, `crm.loadOlder`
  - `crm.notes`, `crm.saveNotes`, `crm.contactInfo`, `crm.stats`, `crm.orderHistory`, `crm.whatsapp`
  - Quick-reply templates: `crm.template.shipped`, `crm.template.thankYou`, `crm.template.preparing`, `crm.template.confirmAddress`
  - Column headers: `crm.col.name`, `crm.col.phone`, `crm.col.email`, `crm.col.orders`, `crm.col.spent`, `crm.col.lastOrder`

**D. Add sidebar link** in `src/components/admin/AdminLayoutClient.tsx`:
- Add "Customers" / "العملاء" nav item with Users icon (from lucide-react)
- Position after "Orders" in the nav list
- Link to `/admin/customers`

**Constraints:**
- Follow the existing page patterns exactly (same layout, same auth behavior)
- All strings via `t()` --- no hardcoded text
- Pages are `"use client"` (following existing admin page pattern)

**Acceptance Criteria:**
- `/admin/customers` shows the customer list page
- `/admin/customers/[id]` shows the customer detail with chat
- Sidebar has the Customers link in the correct position
- All strings are bilingual
- Navigation works correctly (list -> detail -> back to list)
- TypeScript passes
- Build passes

---

## T14 — Verification and Cleanup

**Agent:** @backend + @frontend
**Priority:** P1 | **Estimate:** 30 min | **Blocked by:** T13
**FR:** All

Final verification pass.

**Deliverables:**
- Run `npx tsc --noEmit` --- must pass with zero errors
- Run `npm run build` --- must succeed
- Manual end-to-end test:
  1. Navigate to `/admin/customers` --- list loads with stats
  2. Search by name --- results filter correctly
  3. Click a customer --- detail page loads with stats + orders
  4. Send a WhatsApp message --- message appears in chat, Evolution API receives it
  5. Simulate inbound message via webhook --- message appears in real-time
  6. Verify status updates flow through
- Visual check in all 4 mode combinations (AR+dark, AR+light, EN+dark, EN+light)
- Verify no console errors or warnings
- Verify all new env vars documented in AGENTS.md

**Acceptance Criteria:**
- Zero TypeScript errors
- Clean production build
- End-to-end messaging flow works
- All four mode combinations render correctly
- No unused imports or dead code

---

## T15a --- Customer Analytics: Backend (API Route + Analytics Function)

**Agent:** @backend
**Priority:** P3 | **Estimate:** 30 min | **Blocked by:** T01
**FR:** FR-22

Create the server-side analytics endpoint and function.

**Deliverables:**

**A. Create `src/app/api/admin/customers/analytics/route.ts`:**
- `GET` --- Customer analytics from the `customer_stats` view
  - Auth: `extractToken()` + `verifyAdmin()` pattern
  - Queries:
    - Total customers: `COUNT(*)` from `customer_stats`
    - New customers this month: `COUNT(*)` WHERE `created_at > start of current month`
    - Repeat purchase rate: `COUNT(*) WHERE total_orders > 1` / `COUNT(*)` (as percentage)
    - Top 5 customers by revenue: `ORDER BY total_spent DESC LIMIT 5` returning `{ full_name, total_spent }`
  - Response: `{ success: true, data: { totalCustomers, newCustomers, repeatRate, topCustomers } }`

**B. Add `customerAnalytics()` function to `src/features/orders/orders.analytics.ts`:**
- Accepts raw customer stats data
- Returns typed `CustomerAnalytics` object: `{ totalCustomers: number, newCustomers: number, repeatRate: number, topCustomers: { full_name: string, total_spent: number }[] }`

**C. Add `CustomerAnalytics` type to `src/features/shared/types.ts`**

**Constraints:**
- Follow the auth and envelope pattern from existing admin API routes
- All computations happen server-side from the `customer_stats` view

**Acceptance Criteria:**
- API route returns correct analytics data
- Auth required (401 without valid token)
- `CustomerAnalytics` type compiles
- TypeScript passes

---

## T15b --- Customer Analytics: Dashboard Widgets (Frontend)

**Agent:** @frontend
**Priority:** P3 | **Estimate:** 45 min | **Blocked by:** T07, T15a
**FR:** FR-22

Add customer analytics widgets to the main admin dashboard page.

**Deliverables:**

**A. Add `getCustomerAnalytics` query endpoint to `customersApi` (RTK Query):**
- Calls `GET /api/admin/customers/analytics`
- Returns `CustomerAnalytics`
- Provides tag `[{ type: "Customer", id: "ANALYTICS" }]`

**B. Update `src/app/(admin)/admin/page.tsx`:**
- Add a "Customers" section in the bento grid (below existing sections)
- StatTile widgets: Total Customers, New This Month, Repeat Rate (%)
- Compact top-5 list showing customer name + total spent (EGP)
- Use existing StatTile and neumorphic card components
- All strings via `t("crm.analytics.*")` keys

**C. Add i18n keys** for analytics labels:
- `crm.analytics.title`, `crm.analytics.totalCustomers`, `crm.analytics.newThisMonth`, `crm.analytics.repeatRate`, `crm.analytics.topCustomers`

**Constraints:**
- Reuse existing StatTile component and bento grid layout patterns
- Customer analytics data comes from the API endpoint, not computed client-side
- Do not modify existing dashboard widgets --- additive only

**Acceptance Criteria:**
- Dashboard shows customer analytics section with correct data
- StatTiles render with correct values
- Top 5 list shows customer names and revenue
- RTL + theme aware
- TypeScript passes
