# Tasks (Updated): Customer CRM Module with WhatsApp Messaging

**Spec:** 012-admin-crm-whatsapp + spec-delta
**Date:** 2026-07-24
**Supersedes:** tasks.md (2026-07-23)

---

## Change Summary

This document updates the original 15-task breakdown to reflect the
n8n-mediated WhatsApp architecture (spec-delta.md). Key changes:

- **T01**: New types added (`N8nSendRequest`, `N8nSendResponse`)
- **T05**: Rewritten -- `evolution.service.ts` becomes `n8n-whatsapp.service.ts`
- **T06**: Updated -- uses `n8nWhatsappService` instead of `evolutionService`;
  `normalizePhone()` moves here
- **T12**: Expanded into 7 sub-tasks (T12a through T12g)
- **T16**: New task -- update AGENTS.md env var documentation

Tasks T02, T03, T04, T07, T08, T09, T10, T11, T13, T14, T15a, T15b are
unchanged from the original (only cross-references updated where dependencies
shifted).

---

## Updated Task Dependency Graph

```
T01 (database schema + types) ──────────────────────────────────────────────────┐
    |                                                                            |
    ├──► T02 (repositories) ─────────────────────────────────────────────────┐   |
    │        |                                                               |   |
    │        ├──► T03 (customer service)                                     |   |
    │        │        |                                                      |   |
    │        │        └──► T04 (API routes) ◄── T06                         |   |
    │        │                 |                                              |   |
    │        │                 └──► T07 (RTK Query) ──────────────────────┐  |   |
    │        │                          |                                 |  |   |
    │        │                          ├──► T08 (hooks)                  |  |   |
    │        │                          │        |                        |  |   |
    │        │                          │        ├──► T09 (CustomerList)  |  |   |
    │        │                          │        ├──► T10 (CustomerDetail)|  |   |
    │        │                          │        └──► T11 (WhatsAppChat) |  |   |
    │        │                          │                 |               |  |   |
    │        │                          │                 └──► T13 (pages)|  |   |
    │        │                          │                          |      |  |   |
    │        │                          └──► T15b (analytics UI) ◄─┘     |  |   |
    │        │                                                    |      |  |   |
    │        └──► T05 (n8n-whatsapp service) ◄── T12b             |      |  |   |
    │                 |                                           |      |  |   |
    │                 └──► T06 (whatsapp service)                 |      |  |   |
    │                          |                                  |      |  |   |
    │                          └──► T04                           |      |  |   |
    │                                                             |      |  |   |
    ├──► T15a (analytics backend) ────────────────────────────────┘      |  |   |
    │                                                                    |  |   |
    └──► T12a (plugin inspection) ── PREREQUISITE, blocks T12b-T12g     |  |   |
              |                                                          |  |   |
              └──► T12b (install plugin + credential) ──────────────────┘  |   |
                        |                                                  |   |
                        ├──► T12c (new whatsapp workflow)                  |   |
                        ├──► T12d (update ecommerce workflow)              |   |
                        ├──► T12e (update notifications workflow)          |   |
                        ├──► T12f (absorb confirmation workflow)           |   |
                        └──► T12g (CRM send webhook node)                 |   |
                                                                           |   |
T14 (verification) ◄── T13, T12c-T12g ────────────────────────────────────┘   |
    |                                                                          |
    └──► T16 (docs update) ◄──────────────────────────────────────────────────┘
```

---

## T01 -- Database Schema: Tables, View, and Realtime

**Agent:** @backend
**Priority:** P0 | **Estimate:** 30 min | **Blocked by:** none
**FR:** FR-01, FR-02, FR-03, FR-25
**Status:** UNCHANGED from original, plus type additions below.

All deliverables from the original T01 remain identical.

**DELTA -- Additional types for `src/features/shared/types.ts`:**

Add these types alongside the original T01 types:

```typescript
/** Request body sent from backend to n8n CRM send webhook */
export interface N8nSendRequest {
  phone: string;   // normalized digits (e.g., "201012345678")
  body: string;    // message text
}

/** Synchronous response from n8n CRM send webhook */
export interface N8nSendResponse {
  messageId: string;
  status: string;   // "sent" on success
}
```

**Acceptance Criteria:** Same as original, plus the two new types compile.

---

## T02 -- Repositories: Customer Extension + WhatsApp Messages

**Agent:** @backend
**Priority:** P0 | **Estimate:** 45 min | **Blocked by:** T01
**FR:** FR-04, FR-05
**Status:** UNCHANGED from original.

All deliverables, constraints, and acceptance criteria identical.

---

## T03 -- Customer Service Extension

**Agent:** @backend
**Priority:** P0 | **Estimate:** 30 min | **Blocked by:** T02
**FR:** FR-06
**Status:** UNCHANGED from original.

All deliverables, constraints, and acceptance criteria identical.

---

## T04 -- API Routes: Customers, Messages, and Webhook

**Agent:** @backend
**Priority:** P0 | **Estimate:** 60 min | **Blocked by:** T03, T06
**FR:** FR-09, FR-10, FR-11
**Status:** UNCHANGED from original.

All deliverables, constraints, and acceptance criteria identical. The API
routes call `whatsappService.sendMessage()` which internally uses the new
`n8nWhatsappService` -- no change to the route layer.

---

## T05 -- n8n WhatsApp Send Service (REWRITTEN)

**Agent:** @backend
**Priority:** P0 | **Estimate:** 30 min | **Blocked by:** T01 (types), T12b (webhook URL)
**FR:** FR-07 (amended)

**REPLACES** the original T05 (Evolution API Integration Service).

### What Changed

The backend no longer calls the Evolution API directly. Instead, it calls an
n8n webhook endpoint that sends via the Evolution API plugin.

- `evolution.service.ts` is **deleted**
- A new `n8n-whatsapp.service.ts` is created in its place
- `normalizePhone()` and `toJid()` move to `whatsapp.service.ts` (T06)
- `getConnectionStatus()` is dropped (see spec-delta D5)

### Deliverables

**A. Delete `src/features/whatsapp/evolution.service.ts`**

**B. Create `src/features/whatsapp/n8n-whatsapp.service.ts`:**

```typescript
class N8nWhatsappService {
  private webhookUrl: string;   // from N8N_WHATSAPP_SEND_WEBHOOK_URL
  private secret: string;       // from N8N_SEND_WEBHOOK_SECRET

  constructor()
  // Reads env vars. Throws descriptive error if either is missing.

  async send(request: N8nSendRequest): Promise<N8nSendResponse>
  // POST to webhookUrl
  // Headers: { "Content-Type": "application/json", "X-N8n-Send-Secret": secret }
  // Body: JSON.stringify(request)
  // Timeout: 10 seconds (AbortController)
  // On success (200): parse JSON response as N8nSendResponse, return it
  // On non-200: throw Error with status code and response text
  // On timeout: throw Error("n8n WhatsApp send timed out after 10s")
}

let _instance: N8nWhatsappService | null = null;
export function getN8nWhatsappService(): N8nWhatsappService
// Lazy singleton, same pattern as the deleted getEvolutionService()
```

### Constraints

- Use native `fetch()` with `AbortController` for timeout -- no axios
- Never log the secret or message body content
- Server-side only -- never import in client components
- The service has NO knowledge of Evolution API, JIDs, or WhatsApp internals.
  It is a thin HTTP client that posts phone + body and receives messageId.

### Acceptance Criteria

- `send({ phone: "201012345678", body: "test" })` makes correct POST to the
  webhook URL with the secret header
- Missing env vars throw immediately on construction
- 10-second timeout fires and throws descriptively
- Non-200 responses throw with status code
- TypeScript passes

---

## T06 -- WhatsApp Business Logic Service (UPDATED)

**Agent:** @backend
**Priority:** P0 | **Estimate:** 45 min | **Blocked by:** T02, T05
**FR:** FR-08
**Status:** UPDATED -- dependency and internal implementation changes.

### What Changed

1. `sendMessage()` calls `n8nWhatsappService.send()` instead of
   `evolutionService.sendText()`
2. `normalizePhone()` moves INTO this service from the deleted evolution
   service (still needed for `processInboundMessage`)
3. Import changes: `getEvolutionService` replaced with `getN8nWhatsappService`
4. `toJid()` is no longer needed (n8n/plugin handles JID formatting)

### Deliverables

**Update `src/features/whatsapp/whatsapp.service.ts`:**

- Change import: `getEvolutionService` to `getN8nWhatsappService` from
  `./n8n-whatsapp.service`
- Add `normalizePhone(phone: string): string` method (move from deleted
  evolution service, same logic: strip non-digits, local 0XX to 20XX)
- Update `sendMessage()`:
  1. Fetch customer by ID (throw if not found)
  2. Validate customer has phone
  3. `const normalizedPhone = this.normalizePhone(customer.phone)`
  4. Call `getN8nWhatsappService().send({ phone: normalizedPhone, body })`
  5. Persist message: `{ customer_id, admin_id, direction: 'outbound', body,
     phone: customer.phone, status: 'sent',
     evolution_message_id: response.messageId }`
  6. Return persisted message
  7. On error: persist with `status: 'failed'`, `evolution_message_id: null`,
     re-throw
- Update `processInboundMessage()`:
  - Replace `getEvolutionService().normalizePhone()` with `this.normalizePhone()`
  - Everything else unchanged
- Remove any reference to `getConnectionStatus()`

### Constraints

- Existing `processStatusUpdate()` and `getMessages()` are UNCHANGED
- The repository imports and patterns remain identical
- `normalizePhone` must handle same formats as before: `01012345678`,
  `+201012345678`, `201012345678`, 10-digit old format

### Acceptance Criteria

- `sendMessage` calls n8n webhook (not Evolution API) and persists with
  returned messageId
- `sendMessage` persists `status: "failed"` and re-throws on n8n error/timeout
- `processInboundMessage` still correctly matches customer by normalized phone
- No references to `evolution.service.ts` remain in the codebase
- TypeScript passes

---

## T07 -- RTK Query API: customersApi

**Agent:** @frontend
**Priority:** P0 | **Estimate:** 45 min | **Blocked by:** T04
**FR:** FR-12, FR-23
**Status:** UNCHANGED from original.

All deliverables, constraints, and acceptance criteria identical.

---

## T08 -- UI Hooks: Customer Manager, Detail, and Chat

**Agent:** @frontend
**Priority:** P1 | **Estimate:** 45 min | **Blocked by:** T07
**FR:** FR-13, FR-14, FR-15
**Status:** UNCHANGED from original.

All deliverables, constraints, and acceptance criteria identical.

---

## T09 -- Component: CustomerList.tsx

**Agent:** @frontend
**Priority:** P1 | **Estimate:** 60 min | **Blocked by:** T08
**FR:** FR-16
**Status:** UNCHANGED from original.

All deliverables, constraints, and acceptance criteria identical.

---

## T10 -- Component: CustomerDetail.tsx

**Agent:** @frontend
**Priority:** P1 | **Estimate:** 60 min | **Blocked by:** T08
**FR:** FR-17
**Status:** UNCHANGED from original.

All deliverables, constraints, and acceptance criteria identical.

---

## T11 -- Component: WhatsAppChat.tsx

**Agent:** @frontend
**Priority:** P1 | **Estimate:** 90 min | **Blocked by:** T08
**FR:** FR-18, FR-21
**Status:** UPDATED -- minor delta below.

All deliverables, constraints, and acceptance criteria from the original, with
this delta:

**DELTA:** Drop the "connection status indicator" from the chat header. D5
defers `getConnectionStatus` and no RTK endpoint feeds this element. The chat
header should show the customer name and phone only -- no live/offline badge.

---

## T12a -- Plugin Inspection: Node Type Identifiers (PREREQUISITE)

**Agent:** @n8n
**Priority:** P0 | **Estimate:** 30 min | **Blocked by:** none
**FR:** (prerequisite for all n8n work)
**Status:** NEW

### Context

The `n8n-nodes-evolution-api` plugin (v1.0.4, npm package
`n8n-nodes-evolution-api`, GitHub
`github.com/oriondesign2015/n8n-nodes-evolution-api`) must be inspected at
source to extract exact node identifiers before any workflow JSON can be
authored.

### Deliverables

Inspect the plugin GitHub repository and document:

1. **Node `type` string:** Read `package.json` > `n8n.nodes` array to find
   the node class file paths. Open each node class file and record the
   `description.name` property. This becomes the `type` field in workflow
   JSON. Expected pattern: `n8n-nodes-evolution-api.someNodeName` or similar.

2. **Node `typeVersion`:** The `description.version` property from each node
   class. This becomes the `typeVersion` field in workflow JSON.

3. **Credential type name:** Read `package.json` > `n8n.credentials` array.
   Open the credential class file and record the `name` property. This
   becomes the credential reference in node parameters.

4. **Operation parameter values:** For the Message node, document the exact
   string values for the `operation` parameter dropdown: `sendText`,
   `sendMedia`, etc.

5. **Instance parameter:** How the instance name is specified in node
   parameters (field name, expected value format).

6. **Number format for sendText:** Whether the `number` parameter accepts
   raw digits (`201012345678`) or requires JID format
   (`201012345678@s.whatsapp.net`). This determines the expression used in
   ALL send nodes across T12c, T12e, and T12g (see spec-delta D6). All three
   tasks MUST use the single format T12a determines.

### Recipe

```
1. Go to github.com/oriondesign2015/n8n-nodes-evolution-api
2. Read package.json → n8n.nodes array → file paths
3. For each node file: read description.name, description.version
4. Read package.json → n8n.credentials array → file path
5. For credential file: read name property
6. For message node: read operations array/enum values
```

### Output

A reference document (can be inline in the task completion report) listing:

```
Plugin: n8n-nodes-evolution-api@1.0.4
Node type: <exact string>
Node typeVersion: <exact number>
Credential type: <exact string>
Message operations: [<list of operation strings>]
Instance parameter: <field name and format>
```

### Acceptance Criteria

- All identifiers are confirmed from source code (not guessed)
- Identifiers match what n8n expects when the plugin is installed
- Document is available for T12b-T12g to reference

---

## T12b -- Install Plugin + Create Credential

**Agent:** @n8n
**Priority:** P0 | **Estimate:** 20 min | **Blocked by:** T12a
**FR:** (infrastructure setup)
**Status:** NEW

### Deliverables

1. Install `n8n-nodes-evolution-api` in the n8n instance:
   - Via n8n community nodes UI, or
   - Via `npm install n8n-nodes-evolution-api` in the n8n modules directory
   - Restart n8n if needed

2. Create an Evolution API credential in n8n's credential store:
   - Credential type: `<from T12a>`
   - Server URL: `https://evolution-api-production-2b59.up.railway.app`
   - API Key: `<current or rotated key -- user's decision>`
   - Name the credential: `"7alm Evolution API"`

3. Verify the credential works:
   - Create a test workflow with a plugin node
   - Select the credential
   - Attempt a `getConnectionStatus` or similar read-only operation
   - Confirm 200 response

4. Set n8n environment variables:
   - `N8N_SEND_WEBHOOK_SECRET`: generate a strong random secret (min 32 chars)
   - `WHATSAPP_WEBHOOK_SECRET`: same value as the backend's env var
   - `APP_BASE_URL`: `https://7alm-pro.up.railway.app`

### Acceptance Criteria

- Plugin appears in n8n's node palette
- Credential test passes
- Environment variables are set
- Backend `N8N_SEND_WEBHOOK_SECRET` matches n8n's value

---

## T12c -- New Workflow: WhatsApp AI Agent + CRM

**Agent:** @n8n
**Priority:** P0 | **Estimate:** 120 min | **Blocked by:** T12b, T04 (webhook URL)
**FR:** FR-11 (webhook consumer), spec-delta D1
**Status:** NEW

### Context

Create the consolidated WhatsApp workflow that replaces the WhatsApp branch
of the ecommerce workflow and absorbs the order-confirmation workflow.

**File:** `automation/whatsapp-ai-workflow.json`
**Name:** `"7alm -- WhatsApp AI Agent + CRM (Evolution Plugin)"`

### Deliverables

**A. Inbound Message Pipeline:**

1. **Evolution Webhook Trigger** (or n8n Webhook for Evolution events)
   - Path: `evolution-whatsapp-webhook` (same path as current ecommerce
     workflow trigger, so Evolution API config does not need to change)
   - Events: `MESSAGES_UPSERT`, `MESSAGES_UPDATE`

2. **Skip Own Messages** filter
   - Same logic as current: `fromMe !== true`
   - Critical: CRM sends via plugin emit `MESSAGES_UPSERT` with `fromMe=true`

3. **Event Type Router**
   - Branch on event type:
     - `MESSAGES_UPDATE` (status update) -> Status Logger branch
     - `MESSAGES_UPSERT` (new message) -> Message Processing branches

4. **Status Logger Branch** (for `MESSAGES_UPDATE`):
   - Extract `evolutionMessageId` from `key.id`
   - Map Evolution status to app status (`DELIVERY_ACK` -> `delivered`,
     `READ` -> `read`, `PLAYED` -> `read`)
   - POST to `{APP_BASE_URL}/api/webhooks/whatsapp` with:
     - Header: `X-Webhook-Secret: {WHATSAPP_WEBHOOK_SECRET}`
     - Body: `{ "type": "status", "evolutionMessageId": "...", "status": "...", "timestamp": "..." }`

5. **Message Normalize** node:
   - Extract from Evolution payload:
     - `senderId`: `key.remoteJid` stripped of `@s.whatsapp.net` (digits)
     - `phone`: same as `senderId` (digits only, e.g., `201012345678`)
     - `messageText`: `message.conversation` or
       `message.extendedTextMessage.text`
     - `evolutionMessageId`: `key.id`
     - `platform`: `"whatsapp"` (for AI agent compatibility)
     - `messageType`: `"message"` (for AI agent compatibility)

6. **CRM Logger Branch** (fire-and-forget, parallel with intent check):
   - POST to `{APP_BASE_URL}/api/webhooks/whatsapp` with:
     - Header: `X-Webhook-Secret: {WHATSAPP_WEBHOOK_SECRET}`
     - Body: `{ "type": "message", "phone": "...", "body": "...", "mediaUrl": null, "mediaType": null, "evolutionMessageId": "...", "timestamp": "..." }`
   - Fire-and-forget (do not block AI agent response)

7. **Order Confirmation Branch** (sequential If-chain, NOT parallel with AI):
   - Detect Intent node (same regex logic from current confirmation workflow)
   - If intent is `confirm` or `cancel`:
     - Find Awaiting Order: `GET {APP_BASE_URL}/api/n8n/orders/awaiting-confirmation?phone={localPhone}`
       - Header: `x-n8n-access-token: {{ $env.N8N_API_ACCESS_TOKEN }}`
       - NOTE: Replace the hardcoded `123456` token with env var
     - If order found: Call `POST {APP_BASE_URL}/api/webhooks/n8n/order-action`
       to confirm/cancel. Do NOT send AI reply (the order-notifications
       workflow handles customer messaging). STOP here.
     - If no order found: fall through to AI agent branch
   - If intent is `none`: fall through to AI agent branch
   - **NOTE:** This is a deliberate behavior improvement. Today, the
     confirmation and AI workflows are independent with no cross-suppression.
     The If-chain eliminates duplicate replies.

8. **AI Sales Agent Branch** (only if confirmation branch did not handle):
   - Same AI agent node config as current ecommerce workflow:
     - Same system prompt
     - Same OpenRouter Chat Model config
     - Same tools: Create Order, Load Active Product Context, Load Zones Context
   - Reply via Evolution Plugin sendText node (replaces HTTP Request):
     - Use `<credential from T12b>`
     - Instance: `mypersonal` (or from env var)
     - Operation: `sendText`
     - Number: `{{ senderId }}` (digits -- use the format T12a determines;
       if plugin requires JID, use `{{ senderId + "@s.whatsapp.net" }}`)
     - Text: `{{ $json.output }}`
   - Classify AI Failure handler (same as current)

**B. CRM Send Endpoint** (separate trigger in same workflow):

See T12g (broken out for clarity).

### Constraints

- Use plugin nodes (type from T12a) for ALL Evolution API calls -- no HTTP
  Request nodes for Evolution endpoints
- All plugin nodes reference the `"7alm Evolution API"` credential from T12b
- The webhook path `evolution-whatsapp-webhook` must match the current
  Evolution API instance configuration (no config change needed)
- Arabic message templates in the AI agent system prompt must be preserved
  verbatim
- Priority routing for order confirmation: confirmation branch must complete
  (or fall through) BEFORE the AI agent branch sends a reply. Use an If node
  chain, not parallel execution for the confirm vs AI decision.

### Acceptance Criteria

- Inbound WhatsApp messages trigger the workflow
- Own messages (fromMe=true) are skipped
- Status updates are forwarded to `/api/webhooks/whatsapp`
- Inbound messages are forwarded to `/api/webhooks/whatsapp` (CRM logging)
- Order confirmation intents are detected and handled
- Non-confirmation messages get AI agent replies via plugin
- AI agent tools (Create Order, Load Product, Load Zones) work correctly
- No duplicate replies (confirmation branch and AI branch never both reply)

---

## T12d -- Update Ecommerce Workflow: Remove WhatsApp

**Agent:** @n8n
**Priority:** P1 | **Estimate:** 45 min | **Blocked by:** T12c
**FR:** spec-delta migration plan
**Status:** NEW

### Context

After the new whatsapp workflow is active, remove all WhatsApp nodes from the
ecommerce workflow, leaving it as FB+IG only.

**File:** `automation/ecommerce-workflow.json`

### Deliverables

1. **Remove nodes:**
   - `Evolution API Webhook` (trigger node)
   - `Skip Own Messages` (If node)
   - `Normalize WhatsApp` (Set node)
   - `Reply via WhatsApp` (HTTP Request node)

2. **Update `Merge All Channels` node:**
   - Remove the WhatsApp input connection
   - Should now have 2 inputs: Normalize Facebook, Normalize Instagram
   - Verify `mode` and `clashHandling` settings are preserved

3. **Update `Route by Platform` switch node:**
   - Remove the `"WhatsApp"` output branch
   - Keep `"Facebook"` and `"Instagram"` branches
   - Keep the fallback output for unrecognized platforms

4. **Remove connections:**
   - All connections from/to the 4 removed nodes
   - The WhatsApp branch from Route by Platform to Reply via WhatsApp

5. **Verify remaining flow:**
   - Facebook Webhook -> Is Verification? -> Normalize Facebook -> Merge All Channels -> AI Agent -> Route by Platform -> FB reply
   - Instagram Webhook -> IG Is Verification? -> Normalize Instagram -> Merge All Channels -> AI Agent -> Route by Platform -> IG reply

### Constraints

- Do NOT change any Facebook or Instagram node configurations
- Do NOT change the AI agent system prompt or tools
- Do NOT remove the AI agent tools (Create Order, Load Product, Load Zones) --
  they are still used for FB/IG
- The API key in `Reply via WhatsApp` is being removed from this file, which
  is a security improvement

### Acceptance Criteria

- Workflow JSON is valid (imports into n8n without errors)
- No WhatsApp-related nodes remain
- Facebook flow works end-to-end
- Instagram flow works end-to-end
- No dangling connections or orphaned nodes
- The committed file no longer contains the Evolution API key

---

## T12e -- Update Order Notifications Workflow: Plugin Nodes

**Agent:** @n8n
**Priority:** P1 | **Estimate:** 60 min | **Blocked by:** T12b
**FR:** spec-delta migration plan
**Status:** NEW

### Context

Replace the 5 HTTP Request nodes that send order status notifications with
Evolution API plugin sendText nodes.

**File:** `automation/order-notifications-workflow.json`

### Deliverables

Replace each of these nodes:

| Current Node (HTTP Request) | New Node (Plugin) | Template |
|---|---|---|
| `WA: Order Approved (Text)` | `WA: Order Approved` | Same Arabic template |
| `WA: Order Confirmed` | `WA: Order Confirmed` | Same Arabic template |
| `WA: Order Shipped` | `WA: Order Shipped` | Same Arabic template |
| `WA: Order Delivered` | `WA: Order Delivered` | Same Arabic template |
| `WA: Order Cancelled` | `WA: Order Cancelled` | Same Arabic template |

For each replacement:
1. Change node `type` to `<plugin node type from T12a>`
2. Set `typeVersion` to `<from T12a>`
3. Set credential to `"7alm Evolution API"` (from T12b)
4. Set operation to `sendText` (or equivalent from T12a)
5. Set instance to `mypersonal`
6. Set number to `{{ $json.formattedPhone }}` (digits -- use the format
   T12a determines; if plugin requires JID, use
   `{{ $json.formattedPhone + "@s.whatsapp.net" }}`)
7. Set text to the EXACT Arabic template from the current node's `jsonBody`
   - Extract the template text carefully from the JSON body expression
   - Preserve all emoji, line breaks, and template expressions
   - Preserve the `$json.items.map(...)` expressions
   - Preserve the `$json.trackingId` conditional in the shipped template

**CRITICAL:** The Arabic message templates are customer-facing copy. Do NOT
modify, rephrase, or lose any text. Copy them character-for-character from the
current HTTP Request node's `jsonBody` field.

### Unchanged Nodes

- `Order Status Changed` (webhook trigger) -- no change
- `Has Phone Number?` (If filter) -- no change
- `Format Notification Data` (Set) -- no change
- `Route by Status` (Switch) -- no change (connections stay the same)
- `No Notification Needed` (Set) -- no change
- `No Phone -- Skip` (Set) -- no change

### Constraints

- Do NOT change the webhook trigger path or configuration
- Do NOT change the status routing logic
- Do NOT change the phone formatting logic
- All 5 plugin nodes use the same credential
- Verify that the plugin sendText node's number parameter accepts the
  `{{ $json.formattedPhone }}` expression format (with Egypt country code
  prefix, no JID suffix -- the plugin should handle JID formatting)

### Acceptance Criteria

- Workflow JSON is valid
- All 5 status notifications send via plugin (not HTTP Request)
- Arabic message templates are identical to current
- The committed file no longer contains the plaintext API key
- Each status notification sends to the correct phone with the correct template
- Test: trigger each status change and verify WhatsApp message arrives

---

## T12f -- Absorb Order Confirmation Workflow

**Agent:** @n8n
**Priority:** P1 | **Estimate:** 30 min | **Blocked by:** T12c
**FR:** spec-delta D1
**Status:** NEW

### Context

The order-confirmation-workflow.json is absorbed into T12c's whatsapp workflow.
This task handles the cleanup.

### Deliverables

1. **Deactivate** `automation/order-confirmation-workflow.json` in n8n
   (set to inactive, do not delete)

2. **Replace the error reply node** in the new whatsapp workflow's
   confirmation branch:
   - Current: HTTP Request node `WA: Error Reply` with hardcoded API key
   - New: Plugin sendText node with credential reference
   - Same Arabic error message text

3. **Fix the weak access token:**
   - The current confirmation workflow uses `x-n8n-access-token: "123456"` for
     the `Find Awaiting Order` HTTP call
   - In the new whatsapp workflow, this must use the `N8N_API_ACCESS_TOKEN`
     env var instead: `{{ $env.N8N_API_ACCESS_TOKEN }}`
   - The backend's `requireN8nAccess` middleware already validates against this
     env var with timing-safe comparison

4. **Add a note** to the top of `order-confirmation-workflow.json` indicating
   it is superseded by the whatsapp workflow (for anyone who finds it later)

### Acceptance Criteria

- Old workflow is deactivated in n8n
- Confirmation logic works in the new whatsapp workflow
- Error reply uses plugin (no hardcoded API key)
- Access token uses env var (not hardcoded "123456")

---

## T12g -- CRM Send Webhook Node

**Agent:** @n8n
**Priority:** P0 | **Estimate:** 45 min | **Blocked by:** T12b, T12c (edits same file)
**FR:** spec-delta D2, D3
**Status:** NEW

### Context

Add a second trigger to the whatsapp workflow (or create a small dedicated
workflow) that receives CRM send requests from the backend and sends via
the Evolution API plugin.

### Deliverables

1. **Webhook Trigger Node:**
   - Type: `n8n-nodes-base.webhook`
   - Path: `whatsapp-crm-send`
   - Method: POST
   - **`responseMode: "responseNode"`** (critical -- enables synchronous
     response with custom body)

2. **Validate Secret Node** (If node):
   - Check `{{ $json.headers['x-n8n-send-secret'] }}` equals
     `{{ $env.N8N_SEND_WEBHOOK_SECRET }}`
   - On failure: Respond with 401 `{ "error": "Unauthorized" }`

3. **Send via Plugin Node:**
   - Type: `<plugin node type from T12a>`
   - Operation: `sendText`
   - Credential: `"7alm Evolution API"` (from T12b)
   - Instance: `mypersonal`
   - Number: `{{ $json.body.phone }}` (digits -- use the format T12a
     determines; if plugin requires JID, use
     `{{ $json.body.phone + "@s.whatsapp.net" }}`)
   - Text: `{{ $json.body.body }}`

4. **Respond to Webhook Node:**
   - Type: `n8n-nodes-base.respondToWebhook`
   - Response body:
     ```json
     {
       "messageId": "{{ $json.key?.id || $json.messageId || $json.id || '' }}",
       "status": "sent"
     }
     ```
   - Note: The exact path to the message ID in the plugin's response must be
     confirmed during T12a/T12b. The expression above covers common Evolution
     API response shapes.

5. **Error Handler:**
   - If the plugin send fails, respond with:
     ```json
     {
       "messageId": "",
       "status": "failed"
     }
     ```
   - HTTP status: 500

### Backend Configuration

After this webhook is deployed, set in the backend's `.env.local`:

```env
N8N_WHATSAPP_SEND_WEBHOOK_URL=https://your-n8n-domain/webhook/whatsapp-crm-send
N8N_SEND_WEBHOOK_SECRET=<same-value-as-n8n-env>
```

### Acceptance Criteria

- `POST /webhook/whatsapp-crm-send` with valid secret + phone + body sends a
  WhatsApp message and returns `{ messageId: "...", status: "sent" }`
- Invalid secret returns 401
- Plugin send failure returns 500 with `status: "failed"`
- Response is synchronous (backend receives it as the fetch response)
- The webhook URL is stable (does not change on n8n restart)

---

## T13 -- Pages + Navigation Integration

**Agent:** @frontend
**Priority:** P1 | **Estimate:** 45 min | **Blocked by:** T09, T10, T11
**FR:** FR-19, FR-20, FR-24, FR-26
**Status:** UNCHANGED from original.

All deliverables, constraints, and acceptance criteria identical.

---

## T14 -- Verification and Cleanup

**Agent:** @backend + @frontend + @n8n
**Priority:** P1 | **Estimate:** 45 min | **Blocked by:** T13, T12c-T12g
**FR:** All
**Status:** UPDATED -- expanded verification scope.

### Deliverables

All original T14 deliverables remain. Additionally:

**Backend verification:**
- Verify no imports of `evolution.service.ts` remain anywhere in the codebase
- Verify `N8N_WHATSAPP_SEND_WEBHOOK_URL` and `N8N_SEND_WEBHOOK_SECRET` are set
- Run `npx tsc --noEmit` -- must pass
- Run `npm run build` -- must pass

**n8n verification:**
- Verify the ecommerce workflow has no WhatsApp nodes
- Verify the notifications workflow uses plugin nodes (no HTTP Request to
  Evolution API)
- Verify the confirmation workflow is deactivated
- Verify the new whatsapp workflow handles all WhatsApp paths

**End-to-end message flow test:**
1. Admin sends a message from CRM UI
2. Backend POSTs to n8n webhook
3. n8n sends via plugin, returns messageId
4. Backend persists message with messageId
5. Message appears in UI with "sent" status
6. Customer receives WhatsApp message
7. Status webhook arrives: delivered -> read
8. UI updates status indicators in real-time

**End-to-end inbound flow test:**
1. Customer sends WhatsApp message
2. Evolution webhook fires to n8n
3. n8n CRM logger branch forwards to `/api/webhooks/whatsapp`
4. App persists inbound message
5. Supabase Realtime broadcasts INSERT
6. Admin sees message appear in chat UI without refresh

**Security verification:**
- Grep committed workflow JSON files for the API key `8e7c` -- should not
  appear in any current file
- Verify `x-n8n-access-token` uses env var, not hardcoded `123456`
- Verify CRM send webhook rejects requests without valid secret

### Acceptance Criteria

- All original T14 criteria
- No Evolution API key in any committed workflow JSON
- No hardcoded access tokens
- Both send and receive flows work end-to-end through n8n

---

## T15a -- Customer Analytics: Backend

**Agent:** @backend
**Priority:** P3 | **Estimate:** 30 min | **Blocked by:** T01
**FR:** FR-22
**Status:** UNCHANGED from original.

All deliverables, constraints, and acceptance criteria identical.

---

## T15b -- Customer Analytics: Dashboard Widgets

**Agent:** @frontend
**Priority:** P3 | **Estimate:** 45 min | **Blocked by:** T07, T15a
**FR:** FR-22
**Status:** UNCHANGED from original.

All deliverables, constraints, and acceptance criteria identical.

---

## T16 -- Documentation Update (NEW)

**Agent:** @backend
**Priority:** P2 | **Estimate:** 15 min | **Blocked by:** T14
**FR:** (documentation)
**Status:** NEW

### Deliverables

Update `AGENTS.md` environment variables section:

1. **Add** under "Environment Variables":
   ```env
   N8N_WHATSAPP_SEND_WEBHOOK_URL=https://...  # n8n webhook for CRM WhatsApp sends
   N8N_SEND_WEBHOOK_SECRET=xxx                 # Shared secret for CRM send webhook auth
   WHATSAPP_WEBHOOK_SECRET=xxx                 # Shared secret for inbound webhook verification
   ```

2. **Remove** (or mark as n8n-only):
   ```env
   # These are no longer read by the backend (configured in n8n credential store):
   # EVOLUTION_API_URL
   # EVOLUTION_API_KEY
   # EVOLUTION_INSTANCE
   ```

3. **Update** the architecture diagram in AGENTS.md if the WhatsApp
   integration section exists.

### Acceptance Criteria

- AGENTS.md reflects the current env var requirements
- No references to removed backend env vars (EVOLUTION_*)
- New env vars are documented with descriptions

---

## Agent Delegation Summary

### @backend Tasks

| Task | Files to Create/Modify | Key Contract |
|---|---|---|
| T01 | `src/features/shared/types.ts` (add types) | Add `N8nSendRequest`, `N8nSendResponse` alongside original types |
| T02 | `src/features/customers/customers.repository.ts`, `src/features/whatsapp/whatsapp-message.repository.ts` | Unchanged from original |
| T03 | `src/features/customers/customers.service.ts` | Unchanged from original |
| T04 | `src/app/api/admin/customers/route.ts`, `[id]/route.ts`, `[id]/messages/route.ts`, `src/app/api/webhooks/whatsapp/route.ts` | Unchanged from original |
| T05 | **DELETE** `src/features/whatsapp/evolution.service.ts`, **CREATE** `src/features/whatsapp/n8n-whatsapp.service.ts` | Thin HTTP client: `send(N8nSendRequest): N8nSendResponse`, env vars: `N8N_WHATSAPP_SEND_WEBHOOK_URL`, `N8N_SEND_WEBHOOK_SECRET` |
| T06 | `src/features/whatsapp/whatsapp.service.ts` | Change import to `n8n-whatsapp.service`, move `normalizePhone()` here, update `sendMessage()` to call `getN8nWhatsappService().send()` |
| T14 | Verification | `npx tsc --noEmit`, `npm run build`, no `evolution.service` references |
| T15a | `src/app/api/admin/customers/analytics/route.ts` | Unchanged from original |
| T16 | `AGENTS.md` | Update env var docs |

**Execution order:** T01 -> T02 -> T03 + T05 (parallel) -> T06 -> T04 -> T14 -> T16

### @frontend Tasks

| Task | Files to Create/Modify | Key Contract |
|---|---|---|
| T07 | `src/features/customers/customers.api.ts`, `src/lib/redux/store.ts` | RTK Query API, unchanged from original |
| T08 | `src/features/customers/customers.hooks.ts`, `src/features/whatsapp/whatsapp.hooks.ts` | Hooks, unchanged from original |
| T09 | `src/components/admin/customers/CustomerList.tsx` | Component, unchanged from original |
| T10 | `src/components/admin/customers/CustomerDetail.tsx` | Component, unchanged from original |
| T11 | `src/components/admin/customers/WhatsAppChat.tsx` | Component, drop connection status indicator (D5) |
| T13 | `src/app/(admin)/admin/customers/page.tsx`, `[id]/page.tsx`, `src/features/i18n/dictionary.ts`, `src/components/admin/AdminLayoutClient.tsx` | Pages + nav + i18n, unchanged from original |
| T14 | Verification | Visual check, all 4 mode combos |
| T15b | `src/app/(admin)/admin/page.tsx` | Dashboard widgets, unchanged from original |

**Execution order:** T07 -> T08 -> T09 + T10 + T11 (parallel) -> T13 -> T14

**Blocked by backend:** T07 waits for T04 (API routes must exist for RTK Query to target)

### @n8n Tasks

| Task | Workflows to Create/Modify | Key Prerequisite |
|---|---|---|
| T12a | None (inspection only) | Access to GitHub repo |
| T12b | None (n8n admin setup) | T12a results |
| T12c | **CREATE** `automation/whatsapp-ai-workflow.json` | T12b (plugin installed), T04 (webhook URL) |
| T12d | **UPDATE** `automation/ecommerce-workflow.json` | T12c (new workflow active first) |
| T12e | **UPDATE** `automation/order-notifications-workflow.json` | T12b (plugin + credential) |
| T12f | **DEACTIVATE** `automation/order-confirmation-workflow.json` | T12c (logic absorbed) |
| T12g | **UPDATE** `automation/whatsapp-ai-workflow.json` (add CRM send trigger) | T12b + T12c (edits file T12c creates), T05 (backend needs webhook URL) |
| T14 | Verification | All n8n tasks complete |

**Execution order:** T12a -> T12b -> T12e (can start immediately) + T12c (needs T04) -> T12g (after T12c creates file) + T12d + T12f (after T12c is active) -> T14

**Critical path:** T12a is the first thing the n8n agent should do. T12e can run in parallel with T12c since it targets a different workflow file. T12g, T12d, and T12f must wait until T12c is complete (T12g edits the file T12c creates; T12d and T12f depend on the new workflow being active to avoid a gap where WhatsApp messages are not handled).

### Cross-Team Dependencies

```
@backend T04 (API routes) ──────────► @n8n T12c (needs webhook URL)
@n8n T12b (plugin installed) ───────► @backend T05 (needs webhook URL from T12g)
@backend T04 (API routes) ──────────► @frontend T07 (needs API to target)
@n8n T12g (CRM send webhook URL) ──► @backend T05 (env var value)
```

**Recommended startup:** All three agents can begin in parallel:
- @backend starts T01 (database + types)
- @frontend can prepare component scaffolding while waiting for T04
- @n8n starts T12a (plugin inspection) immediately -- blocks nothing else
