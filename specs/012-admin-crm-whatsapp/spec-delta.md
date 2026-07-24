# Spec Delta: n8n-Mediated WhatsApp Architecture

**Spec ID:** 012-admin-crm-whatsapp (delta)
**Status:** Draft
**Priority:** P0
**Author:** CTO
**Date:** 2026-07-24
**Amends:** spec.md (original 012-admin-crm-whatsapp)

---

## Summary of Architectural Changes

This delta replaces the direct Evolution API integration model with an
n8n-mediated architecture. Two fundamental changes:

1. **CRM outbound sends route through n8n**, not the Evolution API directly.
   The backend POSTs to an n8n webhook; n8n sends via the
   `n8n-nodes-evolution-api` plugin and returns `{messageId, status}`
   synchronously.

2. **Full WhatsApp separation from the ecommerce workflow.** The entire
   WhatsApp path (Evolution webhook trigger, normalize, AI agent, reply) moves
   into a new dedicated "whatsapp" workflow. The ecommerce workflow becomes
   Facebook + Instagram only.

### Why n8n as the send layer

- **Credential consolidation.** The Evolution API key currently appears in
  plaintext in 3 workflow JSON files committed to git. The plugin moves
  credentials into n8n's encrypted credential store -- one place to manage, no
  secrets in version control going forward.
- **Single integration point.** All WhatsApp operations (inbound receive,
  outbound send, status tracking) go through the same n8n workflow. Backend
  code has zero direct dependency on the Evolution API's HTTP contract.
- **Plugin upgrades.** When Evolution API changes endpoints (v2.2 to v3), only
  the n8n plugin version changes. No backend code changes.
- **Observability.** n8n provides execution logs for every WhatsApp message
  sent or received. Debugging does not require application log diving.

---

## Decision Record

### D1: Consolidated Inbound Trigger

**Decision:** A single Evolution API webhook trigger in the new whatsapp
workflow handles ALL inbound WhatsApp events. This trigger fans out to three
branches:

1. **CRM logger branch** -- normalizes the payload and POSTs to
   `/api/webhooks/whatsapp` for database persistence and Supabase Realtime.
2. **AI sales agent branch** -- the existing AI agent pipeline (normalize,
   merge, AI agent, reply via plugin).
3. **Order confirmation branch** -- intent detection, order lookup, confirm/
   cancel action (absorbing the current `order-confirmation-workflow.json`).

**Rationale:** Evolution API supports only one webhook URL per instance per
event type. Multiple workflows listening for the same event would require an
intermediary splitter anyway. Consolidating into one trigger is simpler and
avoids race conditions.

**Impact:** `order-confirmation-workflow.json` is absorbed into the new
whatsapp workflow as a branch. It no longer exists as a separate workflow.

### D2: CRM Sends via n8n Webhook (Synchronous)

**Decision:** The backend sends WhatsApp messages by POSTing to an n8n webhook
endpoint. n8n sends via the Evolution API plugin and returns the result
synchronously using `responseMode: "responseNode"` + a "Respond to Webhook"
node.

**Request contract (backend to n8n):**
```
POST {N8N_WHATSAPP_SEND_WEBHOOK_URL}
Headers:
  Content-Type: application/json
  X-N8n-Send-Secret: {N8N_SEND_WEBHOOK_SECRET}

Body:
{
  "phone": "201012345678",   // normalized digits, no JID suffix
  "body": "Message text"
}
```

**Response contract (n8n to backend):**
```json
{
  "messageId": "3EB0A1B2C3D4E5F6",
  "status": "sent"
}
```

The `messageId` is extracted from the Evolution API plugin's send response
(`key.id`). The `status` is always `"sent"` on the synchronous ack; subsequent
delivery/read updates arrive asynchronously via the status webhook path.

**Failure semantics:** If n8n returns a non-200 or times out (10 second fetch
timeout), the backend persists the message with `status: "failed"` and
re-throws. This preserves the existing behavior from the direct integration.

### D3: CRM Send Webhook Authentication

**Decision:** The CRM send webhook requires a shared secret in the
`X-N8n-Send-Secret` header. The n8n workflow validates this before sending.

**Rationale:** This endpoint can send WhatsApp messages as the business. Left
unauthenticated, it would be an open send relay for anyone who discovers the
URL. The secret uses the same pattern as the existing `requireN8nAccess`
middleware but with a separate key so compromise of one does not compromise the
other.

**New env var (backend):** `N8N_WHATSAPP_SEND_WEBHOOK_URL`
**New env var (backend):** `N8N_SEND_WEBHOOK_SECRET`
**New env var (n8n):** `N8N_SEND_WEBHOOK_SECRET` (same value, used for
validation in the workflow)

### D4: Phone Normalization Stays Backend-Side

**Decision:** `normalizePhone()` remains in the backend service. The backend
sends normalized digits (e.g., `201012345678`) to n8n. n8n's plugin node
appends the JID suffix (`@s.whatsapp.net`) when required by the Evolution API.

**Rationale:** The backend needs `normalizePhone` for inbound webhook
processing (matching sender phone to customer) regardless of the send path.
Duplicating normalization logic in n8n would be a maintenance burden.

### D6: Standardized Number Format Across All Send Nodes

**Decision:** ALL plugin sendText nodes -- in every workflow -- use a single
number format. That format (digits like `201012345678`, or JID like
`201012345678@s.whatsapp.net`) is determined by T12a's plugin inspection.
Until T12a is complete, no send node should hardcode either format.

**Verified fact:** The current ecommerce workflow's `Normalize WhatsApp` node
sets `senderId` to **digits** (strips `@s.whatsapp.net` from `remoteJid`).
The order-confirmation workflow does the same (`remoteJid.replace(...)`). All
existing references to `senderId` produce digits, not JIDs.

**Rationale:** The backend sends digits. The notifications workflow formats
phones as digits (`formattedPhone`). Having one send node use digits, another
use JID, and a third use an unverified format would cause runtime failures.
T12a must confirm whether the plugin's sendText node accepts raw digits or
requires JID format, and all T12c/T12e/T12g nodes adopt whichever it is.

### D5: getConnectionStatus Deferred

**Decision:** `getConnectionStatus()` is dropped from the backend service in
this iteration. The admin dashboard will not display WhatsApp connection status.

**Rationale:** Routing a status check through n8n adds latency and complexity
for a non-critical feature. The admin can check connection status directly in
the Evolution API dashboard. This can be re-added via an n8n webhook endpoint
in a future iteration if needed.

---

## Amended Architecture

### Before (original spec)

```
Admin Dashboard → API Route → whatsappService → evolutionService → Evolution API
                                                                        ↑
Evolution API → n8n (forwarder) → /api/webhooks/whatsapp → Supabase → Realtime
```

### After (this delta)

```
Admin Dashboard → API Route → whatsappService → n8nWhatsappService → n8n webhook
                                                                        ↓
                                                              n8n (plugin) → Evolution API
                                                                        ↓
                                                              ← {messageId, status}

Evolution API webhook → n8n (single trigger) ─┬→ CRM logger → /api/webhooks/whatsapp → Supabase → Realtime
                                               ├→ AI sales agent → plugin reply
                                               └→ Order confirm/cancel → app API → status workflow
```

### File Changes from Original Spec

| File | Original Spec | This Delta |
|---|---|---|
| `src/features/whatsapp/evolution.service.ts` | NEW: direct Evolution HTTP client | **RENAMED** to `n8n-whatsapp.service.ts`: thin client that POSTs to n8n webhook |
| `src/features/whatsapp/whatsapp.service.ts` | NEW: calls `evolutionService.sendText()` | **UPDATED**: calls `n8nWhatsappService.send()` instead. `normalizePhone()` moves here (for inbound matching). |
| `automation/whatsapp-ai-workflow.json` | Not planned | **NEW**: consolidated WhatsApp workflow with AI agent, CRM send, CRM inbound logger, order confirmation |
| `automation/ecommerce-workflow.json` | Untouched | **UPDATED**: WhatsApp nodes removed, FB+IG only |
| `automation/order-notifications-workflow.json` | Untouched | **UPDATED**: 5 HTTP Request nodes replaced with plugin Message nodes |
| `automation/order-confirmation-workflow.json` | Untouched | **ABSORBED** into new whatsapp workflow; file kept for reference only |

---

## New Service Contract: N8nWhatsappService

**File:** `src/features/whatsapp/n8n-whatsapp.service.ts`

Replaces `evolution.service.ts`. A thin HTTP client that calls the n8n CRM
send webhook.

### Interface

```typescript
interface N8nSendRequest {
  phone: string;  // normalized digits (e.g., "201012345678")
  body: string;   // message text
}

interface N8nSendResponse {
  messageId: string;
  status: string;  // "sent" on success
}

class N8nWhatsappService {
  private webhookUrl: string;   // from N8N_WHATSAPP_SEND_WEBHOOK_URL
  private secret: string;       // from N8N_SEND_WEBHOOK_SECRET

  constructor();
  // Throws if env vars are missing

  async send(request: N8nSendRequest): Promise<N8nSendResponse>;
  // POST to webhookUrl with X-N8n-Send-Secret header
  // Timeout: 10 seconds
  // Throws on non-200 or timeout
}

export const n8nWhatsappService: N8nWhatsappService;
```

### Environment Variables

```env
# Replaces EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE
N8N_WHATSAPP_SEND_WEBHOOK_URL=https://your-n8n-domain/webhook/whatsapp-crm-send
N8N_SEND_WEBHOOK_SECRET=<strong-random-secret>
```

The `EVOLUTION_*` env vars are no longer read by the backend. They remain
configured in n8n's Evolution API credential store only.

---

## Updated WhatsApp Service Contract

**File:** `src/features/whatsapp/whatsapp.service.ts`

### Changes from Original Spec

1. `sendMessage()` calls `n8nWhatsappService.send()` instead of
   `evolutionService.sendText()`.
2. `normalizePhone()` moves from the deleted evolution service into this
   service (it is still needed for inbound webhook processing to match sender
   phone to customer).
3. `getConnectionStatus()` method is removed (see D5).
4. Phone sent to n8n is normalized digits only (no JID suffix).

### Updated sendMessage Flow

```
1. Fetch customer by ID (throw if not found)
2. Validate customer has phone
3. normalizePhone(customer.phone)
4. Call n8nWhatsappService.send({ phone: normalizedPhone, body })
5. Persist message via repository with:
   - status: "sent"
   - evolution_message_id: response.messageId
6. Return persisted message
7. On n8n error/timeout:
   - Persist with status: "failed", evolution_message_id: null
   - Re-throw
```

---

## New Workflow: whatsapp-ai-workflow.json

**Name:** "7alm -- WhatsApp AI Agent + CRM (Evolution Plugin)"

A single consolidated workflow replacing the WhatsApp branch of the ecommerce
workflow and absorbing the order-confirmation workflow. Uses
`n8n-nodes-evolution-api` plugin nodes instead of raw HTTP Request nodes.

### Trigger

Single Evolution API webhook trigger (or n8n Webhook trigger receiving
Evolution events). Listens for `MESSAGES_UPSERT` and `MESSAGES_UPDATE` events.

### Node Graph (Logical)

```
                                    ┌→ [CRM Logger] → POST /api/webhooks/whatsapp
                                    │
[Evo Trigger] → [Skip Own] → [Is Status Update?]
                                    │ No (is message)
                                    └→ [Normalize WA] → [Detect Intent] → [Is Confirm/Cancel + Order?]
                                           │ Yes                            │ No
                                           └→ [Find Order] → [Call API]     └→ [AI Sales Agent] → [Reply via Plugin]

[CRM Send Webhook] → [Validate Secret] → [Send via Plugin] → [Respond with messageId]
```

### Key Design Points

1. **"Skip Own Messages" must remain.** CRM sends via the plugin emit
   `MESSAGES_UPSERT` with `fromMe=true`. Without this filter, admin sends
   would loop into the AI agent.

2. **CRM logger branch fires for ALL inbound messages** (not just those that
   match customers). The app's webhook route handles unknown-phone gracefully
   (logs warning, returns 200). This forwards the message for potential CRM
   logging; note that `processInboundMessage` on the backend skips persistence
   for phones that do not match an existing customer (by design in v1).

3. **Order confirmation takes priority over AI agent** (sequential If-chain,
   not parallel). After normalize, messages go through a sequential check:
   detect intent first; if intent is `confirm`/`cancel` AND an awaiting order
   exists, handle it and stop. Otherwise, route to the AI agent. This is
   implemented as an If-node chain, not parallel branches.

   **NOTE:** This is a deliberate behavior improvement over the current setup.
   Today, the confirmation workflow and AI workflow are independent triggers
   with no cross-suppression -- both can reply to the same message. The
   consolidated If-chain eliminates duplicate replies.

4. **CRM send webhook** is a separate trigger node within the same workflow
   (n8n supports multiple triggers per workflow). It receives backend CRM sends,
   validates the secret, sends via plugin, and returns the messageId
   synchronously.

5. **Status update path.** `MESSAGES_UPDATE` events are normalized and
   forwarded to `/api/webhooks/whatsapp` as `type: "status"` payloads. Same
   path as the CRM logger branch but with a different payload shape.

---

## Migration Plan: Existing Workflows

### 1. ecommerce-workflow.json

**Action:** Remove WhatsApp nodes, keep FB+IG only.

**Nodes to REMOVE:**
- `Evolution API Webhook` (trigger)
- `Skip Own Messages` (filter)
- `Normalize WhatsApp` (transform)
- `Reply via WhatsApp` (HTTP Request send)

**Nodes to UPDATE:**
- `Merge All Channels`: Remove the WhatsApp input connection. Now merges only
  Facebook + Instagram normalized outputs.
- `Route by Platform`: Remove the "WhatsApp" output branch. Now routes to
  Facebook or Instagram only. The fallback output can remain for error
  logging.

**Nodes UNCHANGED:**
- `Facebook Webhook`, `Facebook Verify Webhook`, `Is Verification?`
- `Instagram Webhook`, `Instagram Verify Webhook`, `IG Is Verification?`
- `Normalize Facebook`, `Normalize Instagram`
- `7alm AI Sales Agent` (stays -- FB/IG still need the AI agent)
- `OpenRouter Chat Model`
- `Create Order`, `Load Active Product Context`, `Load Zones Context`
  (AI agent tools -- stay for FB/IG)
- `Route by Platform` (updated, not removed)
- `FB: DM or Comment?`, `FB: Private Reply`, `Reply via Facebook`
- `IG: DM or Comment?`, `IG: Private Reply`, `Reply via Instagram`
- `Classify AI Failure`

**Shared nodes DUPLICATED into new whatsapp workflow:**
- `7alm AI Sales Agent` (same system prompt, same model)
- `OpenRouter Chat Model` (same config)
- `Create Order` tool
- `Load Active Product Context` tool
- `Load Zones Context` tool
- `Classify AI Failure` handler

### 2. order-notifications-workflow.json

**Action:** Replace 5 HTTP Request nodes with plugin Message (sendText) nodes.

| Current Node | New Node Type | Change |
|---|---|---|
| `WA: Order Approved (Text)` | Evolution API plugin sendText | Same message template, plugin credential |
| `WA: Order Confirmed` | Evolution API plugin sendText | Same message template, plugin credential |
| `WA: Order Shipped` | Evolution API plugin sendText | Same message template, plugin credential |
| `WA: Order Delivered` | Evolution API plugin sendText | Same message template, plugin credential |
| `WA: Order Cancelled` | Evolution API plugin sendText | Same message template, plugin credential |

**Critical:** Preserve the EXACT Arabic message templates. These are
customer-facing copy. The plugin node's `text` parameter receives the same
template expression; only the node type and credential mechanism change.

**Unchanged nodes:** `Order Status Changed` (webhook trigger), `Has Phone
Number?` (filter), `Format Notification Data` (transform), `Route by Status`
(switch), `No Notification Needed`, `No Phone -- Skip`.

### 3. order-confirmation-workflow.json

**Action:** Absorb into the new whatsapp workflow. The standalone workflow
is deactivated (kept for reference).

All logic moves into the whatsapp workflow's order-confirmation branch:
- `Skip Own Messages` -- shared with the main inbound filter
- `Extract Message Data` -- part of normalize
- `Detect Intent` -- regex-based intent classification
- `Is Order Action?` -- intent filter
- `Find Awaiting Order` -- HTTP call to app API
- `Order Found?` -- conditional
- `Call 7alm API` -- HTTP call to confirm/cancel endpoint
- `API Success?` -- conditional
- `WA: Error Reply` -- replaced with plugin sendText node

---

## Updated Environment Variables

### Backend (.env.local)

```env
# REMOVED (no longer read by backend):
# EVOLUTION_API_URL
# EVOLUTION_API_KEY
# EVOLUTION_INSTANCE

# NEW:
N8N_WHATSAPP_SEND_WEBHOOK_URL=https://your-n8n-domain/webhook/whatsapp-crm-send
N8N_SEND_WEBHOOK_SECRET=<strong-random-secret>

# UNCHANGED:
WHATSAPP_WEBHOOK_SECRET=<shared-secret-for-inbound-webhook-verification>
```

### n8n

```
# In n8n credential store (encrypted):
Evolution API credential:
  - serverUrl: https://evolution-api-production-2b59.up.railway.app
  - apiKey: <rotated-api-key>

# In n8n environment variables:
N8N_SEND_WEBHOOK_SECRET=<same-value-as-backend>
WHATSAPP_WEBHOOK_SECRET=<same-value-as-backend>
APP_BASE_URL=https://7alm-pro.up.railway.app
```

---

## Updated Security Considerations

All security requirements from the original spec remain. Additionally:

| Concern | Mitigation |
|---|---|
| CRM send webhook is an open send relay | Authenticated via `X-N8n-Send-Secret` header with a strong random secret. n8n workflow validates before sending. |
| Evolution API key in git history | The key `8e7c...8537` is committed in 3 workflow JSON files. Plugin credential store prevents future exposure. Key rotation is recommended (user's decision). |
| n8n access token `123456` | The order-confirmation workflow uses a weak placeholder `x-n8n-access-token: "123456"`. This should be replaced with the existing `N8N_API_ACCESS_TOKEN` env var and `requireN8nAccess` middleware. |
| n8n availability coupling | Backend now depends on n8n being available for sends. 10-second fetch timeout prevents indefinite hangs. Failed sends are persisted with `status: "failed"` for admin visibility. |
| JID formatting | Backend sends normalized digits only. n8n/plugin handles JID construction. No risk of malformed JIDs from backend. |

---

## Plugin Prerequisite: Node Type Identifiers

The `n8n-nodes-evolution-api` plugin (v1.0.4) must be inspected at source
(`github.com/oriondesign2015/n8n-nodes-evolution-api`) before authoring any
workflow JSON. The following identifiers must be confirmed:

1. **Node `type` string** -- the `description.name` property from the node
   class (e.g., `n8n-nodes-evolution-api.evolutionApi` or similar).
2. **Node `typeVersion`** -- the `description.version` property.
3. **Credential type name** -- the `name` property from the credential class
   (e.g., `evolutionApi` or `EvolutionApi`).
4. **Operation parameter values** -- the exact string values for the
   `operation` parameter (e.g., `"sendText"`, `"sendMedia"`).
5. **Number format for sendText** -- whether the `number` parameter accepts
   raw digits (`201012345678`) or requires JID format
   (`201012345678@s.whatsapp.net`). This determines the expression used in
   ALL send nodes across T12c, T12e, and T12g (see D6).

These MUST NOT be guessed. T12a is a hard prerequisite that blocks all n8n
plugin node authoring.

---

## Out of Scope (Unchanged)

All items from the original spec's "Out of Scope" section remain out of scope.
Additionally:

- WhatsApp connection status display in admin dashboard (deferred, see D5)
- Key rotation for the committed Evolution API key (user's decision)
- Redis-backed rate limiting for n8n send webhook (in-memory per-instance is
  sufficient for v1)
