# AI Studio — n8n Automation Plan

**Spec:** 013-ai-studio
**Supplements:** `spec.md`, `plan.md`, `tasks.md`
**Date:** 2026-07-25
**Rewritten:** 2026-07-26 for the conversational-campaign pivot
**Audience:** whoever edits `automation/telegram-fb-post-workflow.json`

---

## 0. Existing credentials and infra facts *(unchanged, still accurate)*

The repo already ships a live, working Telegram bot inside
`automation/telegram-fb-post-workflow.json`, wired to real n8n credentials.
Nothing new needs provisioning for this feature.

| Credential (n8n) | Type | id | name (exact) | Proven by |
|---|---|---|---|---|
| Telegram bot | `telegramApi` | `AsXbM9hYArJ88apL` | **Telegram account** | telegram-fb-post-workflow |
| Google Gemini | `googlePalmApi` | `pj3wNPsZG5Yic3Ho` | **Google Gemini(PaLM) Api account** | telegram-fb-post (voice transcribe) |
| OpenRouter LLM | `openRouterApi` | `EbbUdiq5aCjllGWD` | **OpenRouter account** | telegram-fb-post + whatsapp + ecommerce |
| Supabase Postgres | `postgres` | (in whatsapp wf) | **Postgres account** | whatsapp-ai-workflow (chat memory) |

### Non-secret infra facts (hardcoded in existing workflows)

| Fact | Value | Source node |
|---|---|---|
| 7alm API base URL (prod) | `https://7alm-pro.up.railway.app` | whatsapp "Call 7alm API", telegram-fb "Load Active Products" |
| n8n instance base URL | `https://n8n-production-7712.up.railway.app` | `.env.local` `N8N_ORDER_WEBHOOK_URL` |
| n8n→7alm auth header | `x-n8n-access-token: 123456` | whatsapp/telegram-fb HTTP nodes |
| Inbound-webhook secret header | `x-n8n-send-secret: 123456` | whatsapp "Validate Send Secret" |

> **Config status update (2026-07-26).** The earlier warning here said the
> workflows send `123456` while `.env.local` had no matching variable.
> `.env.local` now defines `N8N_API_ACCESS_TOKEN='123456'`, so **locally the
> values agree.** What remains unverified is the **deployed Railway
> environment** — `requireN8nAccess` returns **503** when the variable is
> unset, which would make `save_campaign` fail silently while the Telegram
> conversation still looks healthy. See `tasks.md` **T052**. Also note
> `AGENTS.md` documents the name as `N8N_ACCESS_TOKEN` while the code reads
> `N8N_API_ACCESS_TOKEN` — verify before renaming either.

---

## 1. Split of responsibility

**Boundary rule (unchanged):** *n8n owns the outside world and the LLM loop;
Next.js owns the truth.*

- **n8n** — the Telegram conversation, the LLM agent, the web search, per-chat
  conversation memory, and the Facebook/Instagram/TikTok publish calls. This is
  where the credentials live.
- **Next.js** — the only writer of `ad_campaigns`: field validation, the
  `status` default, and the dashboard read/update surface.
- **The seam** — n8n never writes `ad_campaigns` directly. Its `save_campaign`
  tool calls `POST /api/n8n/ai-studio/campaigns`, mirroring the WhatsApp
  workflow's "Call 7alm API" node.

| Data operation | Who | Mechanism |
|---|---|---|
| Web research for a niche | n8n | OpenRouter online model (`search_web` tool) |
| Campaign negotiation state | n8n | `memoryBufferWindow`, keyed per Telegram chat |
| Persist an approved campaign | Next.js, called by n8n | `httpRequestTool` → `POST /api/n8n/ai-studio/campaigns` (`x-n8n-access-token`) |
| Read campaigns for the dashboard | Next.js | `GET /api/admin/ai-studio/campaigns` (`verifyAdmin`) |
| Mark published / archived | Next.js | `PATCH /api/admin/ai-studio/campaigns/[id]` (`verifyAdmin`) |
| Publish organic FB/IG post | n8n | the five existing publish tools, unchanged |

---

## 2. The hard constraint that shapes the decomposition *(unchanged — and now the reason for the whole shape)*

**Telegram allows exactly one webhook URL per bot token.** The n8n
`telegramTrigger` node *sets* that webhook when its workflow is activated.
`telegram-fb-post-workflow.json`'s **"Receive Telegram Messages"** trigger
already owns the bot's single webhook.

Consequences:

- You **cannot** create a second standalone workflow with its own
  `telegramTrigger` on the **Telegram account** credential — activating it would
  steal the webhook from the FB-post workflow and silently break FB/IG/TikTok
  posting.
- Therefore **all inbound Telegram traffic must funnel through the one existing
  trigger** — including every message in a campaign negotiation.

This is why the campaign agent is **an extension of the existing
`Generate FB Post` agent inside the existing workflow**, not a new workflow. It
was already the reason the old approval branch had to live there; under the
pivot it becomes the reason the entire feature does.

---

## 3. Workflow decomposition — one workflow, one agent, two new tools

> **Collapsed 2026-07-26.** This section previously specified four workflows:
> **A** (`ai-studio-idea-dispatcher-workflow.json`, sending 4-button approval
> cards), **B** (an `ais:` `callback_query` branch inside the FB-post
> workflow), **C** (`ai-studio-asset-generation-workflow.json`, image
> generation), and **D** (`ai-studio-design-director-workflow.json`, scheduled
> LLM ideation). **A and D are deleted files. B has been removed from the
> workflow JSON (`tasks.md` T046). C was never built and is out of scope.**
> The campaign flow needs none
> of them: research, negotiation, approval, and publishing all happen inside a
> single conversation, so they belong to the single agent that owns it.

### The only change: extend `Generate FB Post`

`automation/telegram-fb-post-workflow.json` →
`@n8n/n8n-nodes-langchain.agent` node **"Generate FB Post"**, which already has
`OpenRouter Chat Model`, `Post Memory` (per-chat buffer), the active-product
catalog injected into its system prompt, and five publish tools.

**Two tools added:**

| Tool | Type | Does |
|---|---|---|
| `search_web` | OpenRouter **online/web-enabled model** on cred `EbbUdiq5aCjllGWD` | Live web search for "what's trending in \<niche\>". Scope decision #2: reuse the existing OpenRouter account — **no new search-API credential** (no SerpApi, Perplexity, Brave). |
| `save_campaign` | `httpRequestTool` | `POST {BASE}/api/n8n/ai-studio/campaigns`, header `x-n8n-access-token`. Called **once**, only after the owner explicitly approves in chat. |

**Existing tools, unchanged and reused for the "auto-create on Facebook and
Instagram" path:** `publish_photo_post`, `publish_text_post`,
`create_instagram_media` → `publish_instagram_media`, `publish_tiktok_post`.

### `save_campaign` body contract

```
name            required   campaign name
niche           required   the niche researched
objective       required   what the campaign is for
headline        required   ad copy
primary_text    required   ad copy
cta             required   ad copy
research_summary optional  what search_web found
hashtags        optional
platform        optional   meta | facebook_instagram | whatsapp
target_audience optional   JSON object
telegram_chat_id optional  provenance
status          optional   omit → server defaults to "ready";
                           send "published" ONLY if the FB/IG publish
                           tools already ran successfully this turn
```

The route 400s on a missing required field or an out-of-range
`platform`/`status`. It **always inserts** — there is no dedup, so the agent
must not call it twice for one approval.

### System prompt additions (Egyptian Arabic, same voice as today)

Three behaviours to add without disturbing the existing publishing rules:

1. **Research** — when the owner asks what's trending in a niche, call
   `search_web` first and ground the answer in what came back; say so plainly if
   nothing useful returned, never invent trends.
2. **Negotiate** — propose a full campaign as readable chat text (not JSON):
   name, objective, headline, primary text, CTA, hashtags, audience. On a change
   request, revise only that part and re-present the whole campaign. Repeat
   until the owner agrees.
3. **Approve** — only on an explicit typed approval ("تمام", "أوكي", "انشر",
   "موافق"), call `save_campaign` **once** with the exact agreed values. If the
   message is ambiguous between approval and revision, **ask for confirmation
   first** — the same rule the existing prompt already applies before
   publishing. If the owner also asked to post it to Facebook/Instagram, run
   the publish tools first, then save with `status: "published"`.

### Why chat approval and not inline buttons

Buttons cannot express "make the headline shorter" — a negotiation loop needs
free text, and every revision would otherwise need a fresh card. The mechanism
is also already proven in this exact agent: it gates live FB/IG/TikTok
publishing on a typed approval today. Full reasoning and the accepted tradeoff:
`spec.md` §Approval Model.

**Do not add an `ais:`-style `callback_query` branch back.** It is being
deleted (`tasks.md` T046) and its HTTP node targets a route that no longer
exists.

---

## 4. Credential & config plan

### Credentials — all reuse, none new

| Node(s) | Decision | Exact name |
|---|---|---|
| Telegram trigger + replies | **reuse** | **Telegram account** (`AsXbM9hYArJ88apL`) |
| Conversational agent + `search_web` | **reuse** | **OpenRouter account** (`EbbUdiq5aCjllGWD`) |
| Voice transcription (existing path) | **reuse** | **Google Gemini(PaLM) Api account** (`pj3wNPsZG5Yic3Ho`) |
| Conversation memory | **reuse** | in-workflow `memoryBufferWindow` (no Postgres needed) |

Previously listed as "new credentials required" and **no longer needed**:
Pinterest, Etsy, Reddit, Google Trends/SerpApi, Amazon/Rainforest, TikTok
scraping, and a dedicated image-generation provider. The trend-scraping
pipeline they served is deleted, and web search reuses OpenRouter.
**Meta Ads API** remains a future-phase credential — not needed, because this
cut posts organically and never touches the Marketing API.

### Non-secret config (literal values, **not** `$env.*`)

Per the existing convention in these workflows:

| Config key | Value |
|---|---|
| `apiBase` | `https://7alm-pro.up.railway.app` |
| `n8nAccessToken` | the value the **deployed** app validates — header `x-n8n-access-token` (see §0 and `tasks.md` T052) |
| Live table | `ad_campaigns` — the only table this feature reads or writes |

`adminChatId` is **no longer needed**: the agent replies into whichever chat
messaged it, and there is no unsolicited outbound card any more.

---

## 5. Blocker list

| Area | Status | Reason |
|---|---|---|
| Telegram conversation loop | ✅ **UNBLOCKED** | Existing bot + credential; agent already runs there |
| OpenRouter agent | ✅ **UNBLOCKED** | Proven in 3 workflows |
| Web search | ✅ **UNBLOCKED** | Decision #2 — OpenRouter online model, no new account |
| Campaign persistence | ✅ **BUILT** | Migration applied; route + service + repository shipped |
| `N8N_API_ACCESS_TOKEN` on the deployed app | 🟡 **VERIFY** | Set locally (`123456`); unconfirmed on Railway. Unset → `save_campaign` 503s and nothing persists (`tasks.md` T052) |
| Admin `chatId` | ✅ **MOOT** | No unsolicited outbound message exists |
| Trend scraping credentials | ⊘ **NOT NEEDED** | Trend pipeline removed |
| Image generation | ⊘ **NOT NEEDED** in this cut | Campaigns reuse existing product imagery |
| **Meta Marketing API (paid ads)** | ⛔ **out of scope** | Decision #1 — organic posts now; paid campaigns are a named future phase |
| WhatsApp broadcast / bulk send | ⛔ **out of scope** | Only single-send exists (`whatsapp.service.ts`); `platform='whatsapp'` records intent for a manual launch |
| Analytics ingestion | ⛔ **out of scope** | No `analytics` / `ai_memory` writes |

---

## 6. What ships first

The whole cut is small enough to ship at once, and everything it needs already
exists. Order of operations:

1. **Verify `N8N_API_ACCESS_TOKEN` on Railway** (`tasks.md` T052). Longest lead
   time, no upstream dependency, and it decides whether anything persists.
   Start here.
2. **Edit `telegram-fb-post-workflow.json`**: remove the dead `ais:` branch
   (T046), add `search_web` + `save_campaign` and the extended prompt (T045).
   The existing FB/IG/TikTok publishing rules must come through byte-intact —
   that path is live production.
3. **Rebuild `/admin/ai-studio`** as the campaigns list with the
   `published`/`archived` actions (T047, T048).
4. **Smoke test end to end** (T051): niche question → search → two revisions →
   approve → exactly one `ad_campaigns` row (`status='ready'`) → visible in the
   dashboard → mark published.

---

## 7. Handoff notes

**Do not** create a second `telegramTrigger` (§2). **Do not** reintroduce
inline-button approval (§3). **Do not** rebuild the fingerprint/dedup machinery
reflexively — the campaign flow has no dedup by design, and whether it needs
one is an open question, not a known gap (`tasks.md` T049).

**Reference patterns to copy verbatim from the existing workflow:**
the `@n8n/n8n-nodes-langchain.agent` + `httpRequestTool` + `$fromAI(...)` tool
shape from the current publish tools; the `x-n8n-access-token` header and
`neverError:true` HTTP shape from whatsapp's "Call 7alm API"; and the existing
approval-gate prompt language — *"ما تنشرش أبدًا قبل ما صاحب المتجر يوافق
صراحة"*, *"لو رسالته مش واضحة… اسأله يأكد"*, *"انشر مرة واحدة بس لكل موافقة"* —
which the campaign flow should mirror rather than reword.
