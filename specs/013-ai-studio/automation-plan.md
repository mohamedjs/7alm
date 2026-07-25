# AI Studio — n8n Automation Plan (CTO second pass)

**Spec:** 013-ai-studio
**Supplements:** `plan.md`, `tasks.md`
**Date:** 2026-07-25
**Status:** planning only — no workflow built, no DB touched, no credential created.
**Audience:** the implementation pass that will author the actual n8n workflow JSON.

---

## 0. What changed since `plan.md` / `tasks.md`

`plan.md` listed the Telegram bot token as a hard blocker (Blocker #1) and
`tasks.md` marked **T013 ⛔ blocked**. **That is now wrong.** The repo already
ships a live, working Telegram bot inside
`automation/telegram-fb-post-workflow.json`, wired to real n8n credentials:

| Credential (n8n) | Type | id | name (exact) | Proven by |
|---|---|---|---|---|
| Telegram bot | `telegramApi` | `AsXbM9hYArJ88apL` | **Telegram account** | telegram-fb-post-workflow |
| Google Gemini | `googlePalmApi` | `pj3wNPsZG5Yic3Ho` | **Google Gemini(PaLM) Api account** | telegram-fb-post (voice transcribe) |
| OpenRouter LLM | `openRouterApi` | `EbbUdiq5aCjllGWD` | **OpenRouter account** | telegram-fb-post + whatsapp + ecommerce |
| Supabase Postgres | `postgres` | (in whatsapp wf) | **Postgres account** | whatsapp-ai-workflow (chat memory) |

So Telegram, Gemini, OpenRouter, and Postgres are **all already unblocked**.
The blocker list must be re-derived (see §5), and the Telegram approval loop
(User Story 3) can ship now by **reusing the existing bot**, not provisioning a
new one.

### Non-secret infra facts discovered (hardcoded in existing workflows)

| Fact | Value | Source node |
|---|---|---|
| 7alm API base URL (prod) | `https://7alm-pro.up.railway.app` | whatsapp "Call 7alm API", telegram-fb "Load Active Products" |
| n8n instance base URL | `https://n8n-production-7712.up.railway.app` | `.env.local` `N8N_ORDER_WEBHOOK_URL` |
| n8n→7alm auth header | `x-n8n-access-token: 123456` | whatsapp/telegram-fb HTTP nodes |
| n8n→7alm auth (alt) | `?secret=123456` query param | whatsapp "Call 7alm API" |
| Inbound-webhook secret header | `x-n8n-send-secret: 123456` | whatsapp "Validate Send Secret" |

> ⚠️ **Config mismatch to verify before building.** The workflows send the
> literal string `123456`, but `.env.local` defines
> `N8N_WEBHOOK_SECRET='Ca7x2U72XFdQVt6'` (and there is **no** literal
> `N8N_ACCESS_TOKEN` var in `.env.local`). Either the deployed app validates a
> different value than `.env.local` shows, or these existing workflows are
> running with a placeholder secret. The AI Studio routes must validate against
> **whatever the deployed 7alm app actually checks** — confirm by reading the
> existing `/api/n8n/*` and `/api/webhooks/n8n/*` route handlers before wiring
> the AI Studio route. Do **not** blindly copy `123456`.

---

## 1. Split of responsibility — the single most important decision

**Boundary rule:** *n8n owns the outside world and the LLM loop; Next.js owns
the truth.*

- **n8n** = every external I/O edge and every LLM-agent orchestration:
  scheduling, trend-source HTTP calls, the Gemini/OpenRouter agent nodes with
  tool-calling (exactly the `@n8n/n8n-nodes-langchain.agent` + `httpRequestTool`
  pattern in telegram-fb-post-workflow), Telegram send/receive, image-gen HTTP
  calls, Meta Ads calls (later). This is where the credentials live and where
  the business already trusts automation.
- **Next.js (`src/features/ai-studio/*` + `/api/*`)** = the canonical business
  logic and the *only* writer of domain state: the `designIdeaStateMachine`
  (T010), fingerprint/dedup (`ai-studio.service.ts`, already built for trends;
  same for `concept_fingerprint` on ideas), the **`products` table write on
  publish** (must reuse `products.repository.ts`, never a parallel path),
  `verifyAdmin()`, and RLS-service-role access.
- **Both (n8n → 7alm API route)** = anything that is an LLM/Telegram action but
  mutates domain state. n8n never writes `design_ideas`, `generated_assets`,
  `ad_campaigns`, or `products` **directly**. It calls a 7alm API route that
  runs the state machine + writes the audit row + (on publish) creates the
  product — atomically, server-side. This mirrors the whatsapp
  **"Call 7alm API"** node (`POST /api/webhooks/n8n/order-action`).

### Direct-Postgres vs. 7alm-API — the concrete cut

| Data operation | Who does it | Mechanism | Why |
|---|---|---|---|
| Read trends/ideas as LLM context | n8n | `httpRequest` GET → 7alm API (`x-n8n-access-token`) | Same as "Load Active Products"; keeps auth + shaping in one place |
| Insert a new **design idea** (with dedup) | Next.js | 7alm API route → `design-ideas.service.ts` (`concept_fingerprint`) | Dedup rule (FR) must be server-authoritative |
| **Status transition** (approve/reject/publish/regenerate) | Next.js, called by n8n | n8n `httpRequest` → 7alm API → `designIdeaStateMachine` | Invalid transitions must be rejected in ONE place |
| Write `telegram_approval_logs` | Next.js (inside the action route) | same route, same transaction as the status change | Audit must never drift from the state change |
| **Publish → `products` row** | Next.js | action route → `products.repository.ts` (`is_active:false`) | Backward-compat + single catalog rule |
| LLM conversation memory | n8n | `postgres` credential direct (as whatsapp already does) | Append-only, non-domain, low-risk — matches existing convention |
| Seed a trend manually | Next.js | existing `/admin/ai-studio` "add trend" form → `ai-studio.service.ts` | Already scaffolded; no external cred needed |

**Net:** the only thing n8n writes to Postgres directly is LLM memory. All AI
Studio domain mutations go through **one new 7alm API route** so the state
machine, dedup, audit log, and product creation are enforced exactly once.

---

## 2. The hard constraint that shapes the workflow decomposition

**Telegram allows exactly one webhook URL per bot token.** The n8n
`telegramTrigger` node *sets* that webhook when its workflow is activated.
`telegram-fb-post-workflow.json`'s **"Receive Telegram Messages"** trigger
(`webhookId: f913897a-...`, updates: `["message"]`) **already owns the bot's
single webhook.**

Consequences:
- You **cannot** create a second standalone workflow with its own
  `telegramTrigger` on the **Telegram account** credential — activating it would
  steal the webhook from the FB-post workflow and silently break FB/IG/TikTok
  posting.
- Therefore **all inbound Telegram traffic (including approval button presses)
  must funnel through the one existing trigger.** Button presses arrive as
  `callback_query` updates, which the existing trigger does **not** currently
  subscribe to (it only listens for `message`).
- **Outbound** Telegram messages (sending an idea card) need **no** trigger and
  can live in any workflow or even in the 7alm backend — no conflict.

This constraint is the biggest architectural decision in this pass and it
directly answers §3's "new workflow vs. new branch" question: **the receiver
must be a new branch on the existing workflow; the sender is a separate
workflow.**

---

## 3. Workflow decomposition (modular, matching the existing style)

Three workflows, each following the existing trigger → normalize/set →
route/if/switch → agent-or-httpRequest → 7alm-API/Postgres write → reply shape.

### Workflow A (NEW, safe standalone) — `ai-studio-idea-dispatcher-workflow.json`
Sends design-idea approval cards to the admin on Telegram. **No `telegramTrigger`
— outbound only**, so it cannot conflict with the bot webhook.

| # | Node (name) | Type | Does |
|---|---|---|---|
| A1 | `Dispatch Trigger` | `scheduleTrigger` (or `webhook`) | Fires on a cron (e.g. hourly) or when the app POSTs "new idea ready" |
| A2 | `Load Pending Ideas` | `httpRequest` GET | `GET {BASE}/api/n8n/ai-studio/ideas?status=pending_review` with `x-n8n-access-token` |
| A3 | `Has Any?` | `if` | Stop if none |
| A4 | `Split Ideas` | `splitInBatches`/`itemLists` | One card per idea |
| A5 | `Send Idea Card` | `telegram` (sendMessage) — **Telegram account** cred | Text = title+description+concept; `replyMarkup: inlineKeyboard` with 6 buttons, each `callback_data` = `ais:<action>:<idea_id>` (`ais:approve:<uuid>`, `ais:reject:…`, `ais:edit:…`, `ais:regen:…`, `ais:fav:…`, `ais:publish:…`) |

Chat id: `chatId` = the admin chat id (see §4 config — seed once).

### Workflow B (NEW BRANCH inside existing `telegram-fb-post-workflow.json`) — the receiver
Do **not** create a new trigger. Modify the existing workflow:

1. **Edit "Receive Telegram Messages"** → add `"callback_query"` to
   `parameters.updates` (currently `["message"]` → `["message","callback_query"]`).
2. **Insert a top Switch "Message Kind?"** right after the trigger:
   - route 1 (`callback_query` exists AND `data` starts with `ais:`) → **AI
     Studio approval branch** (below);
   - route 2 (else) → the existing **"Voice or Text?"** switch (FB-post flow,
     unchanged).

AI Studio approval branch nodes:

| # | Node (name) | Type | Does |
|---|---|---|---|
| B1 | `Parse Callback` | `set` | Extract `action` + `ideaId` from `callback_query.data` (`ais:<action>:<id>`), `telegram_user_id` from `callback_query.from.id`, `chatId` from `callback_query.message.chat.id` |
| B2 | `Idea Action → 7alm` | `httpRequest` POST | `POST {BASE}/api/webhooks/n8n/ai-studio/idea-action` header `x-n8n-access-token`; body `{ ideaId, action, telegramUserId }`. Server runs `designIdeaStateMachine`, writes `design_ideas.status` + `telegram_approval_logs`, and on `publish` creates the `products` row. `neverError:true` like whatsapp's "Call 7alm API" |
| B3 | `Action OK?` | `if` | Branch on `$json.success` |
| B4 | `Answer Callback` | `telegram` (answerCallbackQuery) — **Telegram account** | Toast to the admin ("تمت الموافقة ✅" / "تم الرفض") so the button stops spinning |
| B5 | `Edit Card Status` | `telegram` (editMessageText / editMessageReplyMarkup) | Update the original card to show new status / disable buttons |
| B6 (edit/regen) | `Ask For Feedback` or `Kick Regeneration` | `telegram` sendMessage / `httpRequest` | `edit`→prompt admin for free-text (stored as `design_versions.admin_feedback`); `regenerate`→POST to Workflow C |

`edit` and `regenerate` reuse the LLM-agent pattern; the follow-up free-text the
admin types comes back as a **`message`** update (route 2) — so keep a light
`design_ideas` "awaiting_feedback" hint (server-side) to correlate it, or handle
`edit`/`regenerate` fully inside the app UI in v1 and keep the bot to
approve/reject/favorite/publish first (recommended smallest cut — see §6).

### Workflow C (NEW, Phase 2) — `ai-studio-asset-generation-workflow.json`
Kicked off after an idea is `approved`. Not needed for the first ship.

| # | Node | Type | Does |
|---|---|---|---|
| C1 | `Asset Trigger` | `webhook` | App POSTs `{ designVersionId, prompt }` when idea approved |
| C2 | `Prompt Engineer` | `agent` (OpenRouter/Gemini) | Build the 8K/photoreal prompt from the Image Standards checklist |
| C3 | `Generate Image` | `httpRequest` | Call image-gen provider (**blocked — see §5**) |
| C4 | `Persist Asset` | `httpRequest` POST → 7alm API | Insert `generated_assets` (`status:'pending_review'`) |
| C5 | `Notify` | `telegram` sendMessage | Send the mockup to the admin for QA (reuses the same card pattern) |

### Later — Marketing/Ads/Analytics
`marketing_content` + `ad_campaigns` generation are pure LLM-text jobs (Gemini,
no new dependency): fold them into Workflow C's tail or a small
`ai-studio-marketing-workflow.json`. Analytics ingestion (Phase 3) starts as a
manual CSV import in the app, no workflow needed until Meta Ads API exists.

---

## 4. Credential & config plan (per node)

### Credentials

| Node(s) | Decision | Exact name |
|---|---|---|
| Telegram send/answer/edit (A5, B4, B5, C5) | **(a) reuse** | **Telegram account** (`AsXbM9hYArJ88apL`) |
| LLM agent (B6 edit, C2 Prompt Engineer, Design Director) | **(a) reuse** | **OpenRouter account** (`EbbUdiq5aCjllGWD`) — primary, strong tool-calling |
| Voice/text/image via Gemini | **(a) reuse** for text; **(c) undecided** for image | **Google Gemini(PaLM) Api account** (`pj3wNPsZG5Yic3Ho`) |
| LLM memory (optional) | **(a) reuse** | **Postgres account** |
| Trend scraping — Pinterest | **(b) new** | "AI Studio — Pinterest API" (`httpHeaderAuth` / OAuth2) |
| Trend scraping — Etsy | **(b) new** | "AI Studio — Etsy API" (`httpHeaderAuth`) |
| Trend scraping — Reddit | **(b) new** | "AI Studio — Reddit API" (OAuth2) |
| Trend scraping — Google Trends | **(b) new / (c) degrade** | "AI Studio — SerpApi (Google Trends)" (`httpQueryAuth`) — no official API |
| Trend scraping — Amazon | **(b) new / (c) degrade** | "AI Studio — Rainforest/Amazon" (`httpHeaderAuth`) |
| Trend scraping — TikTok/Instagram | **(c) degrade** | placeholder "TikTok API account" exists; IG needs review — manual until then |
| Image generation (dedicated) | **(b) new, if Gemini rejected** | "AI Studio — Image Gen" (provider TBD) |
| Meta Ads publish (later) | **(b) new** | "AI Studio — Meta Ads API" (`httpHeaderAuth`, system-user token) |

### Non-secret config (Set-node fields / hardcoded, **not** `.env`)

Per the discovery that these workflows do **not** read `$env.*`, put these as
literal values in a leading **"Config"** Set node or inline:

| Config key | Value | Notes |
|---|---|---|
| `apiBase` | `https://7alm-pro.up.railway.app` | 7alm prod base |
| `n8nAccessToken` | value the deployed app validates (verify — see §0 warning) | header `x-n8n-access-token` |
| `adminChatId` | **discoverable, seed once** | Not in repo. Capture from any inbound `message.chat.id` / `callback_query.from.id`, then hardcode into Workflow A's `chatId`. Blocks **unsolicited outbound** cards only. |
| Table names | `trends`, `design_ideas`, `design_versions`, `generated_assets`, `marketing_content`, `ad_campaigns`, `analytics`, `ai_memory`, `telegram_approval_logs` | Exactly as in `docs/migrations/20260725120000_ai_studio_core.sql` |
| `callbackPrefix` | `ais:` | namespaces AI-Studio callbacks vs. any future bot callbacks |

---

## 5. Definitive updated blocker list

| Area | Old status | **New status** | Reason |
|---|---|---|---|
| **Telegram approval loop** | ⛔ blocked (no bot) | ✅ **UNBLOCKED** | Reuse **Telegram account** cred + existing bot; add `callback_query` branch |
| Gemini text agents | ⚠️ | ✅ **UNBLOCKED** | **Google Gemini(PaLM) Api account** works today |
| OpenRouter LLM agent | ⚠️ | ✅ **UNBLOCKED** | **OpenRouter account** proven in 3 workflows |
| Postgres access | ⚠️ | ✅ **UNBLOCKED** | **Postgres account** proven (chat memory) |
| Design Director ideation | blocked-by-Telegram | ✅ **UNBLOCKED** | Only needs LLM + 7alm API |
| Admin `chatId` for outbound | not tracked | 🟡 **minor** | Seed once from first inbound update; else outbound cards can't be sent unsolicited |
| n8n↔7alm secret value | assumed `123456` | 🟡 **verify** | `.env.local` shows `N8N_WEBHOOK_SECRET='Ca7x2U72XFdQVt6'`, not `123456` — confirm which the app checks |
| **Trend scraping** (Pinterest/Etsy/TikTok/IG/Google Trends/Reddit/Amazon) | ⛔ | ⛔ **STILL BLOCKED** | No such credential anywhere in repo → **degrade to manual "add trend"** |
| **Image generation** | ⛔ | 🟠 **DECISION, not hard-blocked** | Gemini cred exists, but the used model is text/audio (`gemini-2.5-flash` transcription). Gemini *image* models (e.g. `gemini-2.5-flash-image`) may work on the **same** `googlePalmApi` cred — but the 8K/photoreal Image Standards are a quality decision. Attempt Gemini-image first; escalate to a dedicated provider only if QA fails |
| **Meta Ads publish** | ⛔ | ⛔ **still blocked, but not needed** | v1 is drafts only (`status:'draft'`) — never calls the Ads API |

---

## 6. What ships first — recommendation (confirmed, with one refinement)

**Confirmed:** the smallest useful, credential-free build is the **Telegram
design-idea approval loop, reusing the existing bot**, with ideas **seeded
manually** via the already-scaffolded `/admin/ai-studio` "add trend/idea" flow
(no scraper, no image gen).

**Refinement — scope the first cut to 4 of the 6 buttons.** `edit` and
`regenerate` require a stateful free-text follow-up correlation over Telegram
`message` updates, which is the fiddliest part. Ship
**Approve / Reject / Favorite / Publish** first (pure one-shot callbacks); add
`edit`/`regenerate` in a second increment (or handle them in the dashboard UI
initially). This gets the full **idea → Telegram → approve → publish →
`products`** loop live with zero new credentials.

**Dependencies the first cut still needs (not n8n, but must exist):**
1. Migration `20260725120000_ai_studio_core.sql` applied (creates
   `design_ideas`, `telegram_approval_logs`, etc.) — admin action, T006.
2. Next.js route **`/api/webhooks/n8n/ai-studio/idea-action`** implementing
   `designIdeaStateMachine` (T010) + audit log + publish→products.
3. Next.js route **`/api/n8n/ai-studio/ideas?status=pending_review`** (read for
   the dispatcher) — thin wrapper over `design-ideas.repository.ts`.
4. `adminChatId` seeded once.

---

## 7. Handoff to implementation

Build in this order. Do **not** create a second `telegramTrigger`.

**Step 1 — App side (prereq for the workflows):**
- Apply the migration (admin).
- Add `src/lib/designIdeaStateMachine.ts` (mirror `orderStateMachine.ts`:
  `pending_review→approved|rejected`, `approved→published`, `*→possible_duplicate`).
- Add `src/features/ai-studio/design-ideas.repository.ts` + `.service.ts`
  (dedup via `concept_fingerprint`, same shape as the trend slice).
- Add API routes, each `verifyAdmin()`-free but guarded by the n8n access token
  the deployed app actually checks:
  - `GET /api/n8n/ai-studio/ideas` (list by status).
  - `POST /api/webhooks/n8n/ai-studio/idea-action` — body `{ideaId, action,
    telegramUserId}`; runs the state machine, writes `design_ideas.status` +
    `telegram_approval_logs`, and on `publish` inserts into `products`
    (`is_active:false`) via `products.repository.ts`. Returns `{success:bool}`.

**Step 2 — Build `ai-studio-idea-dispatcher-workflow.json` (Workflow A, standalone):**
scheduleTrigger → `httpRequest` GET pending ideas → `if` any → split → `telegram`
sendMessage with a 4-button (v1) inline keyboard, `callback_data = ais:<action>:<ideaId>`,
using **Telegram account** cred and the seeded `adminChatId`.

**Step 3 — Edit `automation/telegram-fb-post-workflow.json` (Workflow B branch):**
add `"callback_query"` to the trigger's `updates`; insert a top Switch that
routes `callback_query.data` starting with `ais:` into: `Parse Callback` (Set) →
`Idea Action → 7alm` (`httpRequest` POST to the action route, `neverError:true`)
→ `Action OK?` (if) → `Answer Callback` (answerCallbackQuery) + `Edit Card
Status` (editMessageText). Leave the existing voice/text FB-post branch
untouched.

**Step 4 — later:** `ai-studio-asset-generation-workflow.json` (Workflow C)
once the image-gen provider decision is made; then marketing/ads/analytics.

**Reference patterns to copy verbatim from existing workflows:**
`@n8n/n8n-nodes-langchain.agent` + `httpRequestTool` + `$fromAI(...)` tool
arguments (telegram-fb-post "Generate FB Post"); `httpRequest` → 7alm with
`x-n8n-access-token` and `neverError:true` (whatsapp "Call 7alm API"); inbound
secret validation `if` (whatsapp "Validate Send Secret").
