# Implementation Plan: AI Studio — Conversational Marketing-Campaign Builder

**Spec:** 013-ai-studio
**Date:** 2026-07-25
**Rewritten:** 2026-07-26 for the conversational-campaign pivot (`spec.md` §Scope Pivot)

---

## Architecture Approach

The pivot collapses what was an 8-agent, 9-table, 4-workflow pipeline into a
much smaller shape: **one Telegram conversation, one existing n8n agent given
two new tools, one database table, three API routes, one dashboard page.**

The guiding split is unchanged from the original plan and still holds:

> **n8n owns the outside world and the LLM loop; Next.js owns the truth.**

- **n8n** holds the credentials, runs the conversational agent, performs the web
  search, keeps per-chat conversation memory, and calls the publish tools.
- **Next.js** is the only writer of domain state. It validates and persists the
  approved campaign, and serves it to the dashboard.
- n8n never writes `ad_campaigns` directly — it calls a 7alm API route, exactly
  as the WhatsApp workflow's "Call 7alm API" node already does.

Everything reused rather than rebuilt: the Telegram bot and its credential, the
OpenRouter credential, `src/lib/supabase.ts`, `src/lib/auth.ts`
(`verifyAdmin`), `src/lib/n8n-auth.ts` (`requireN8nAccess`), the RTK Query
`baseQueryWithAuth`, and the five FB/IG/TikTok publish tools already wired into
the `Generate FB Post` agent.

```
┌──────────────────────────────────────────────────────────────────┐
│ Telegram (owner ↔ bot, Egyptian Arabic, free text)                │
│   "إيه الترند في…؟" → research → proposal → revise → "تمام"        │
├──────────────────────────────────────────────────────────────────┤
│ n8n — automation/telegram-fb-post-workflow.json (ONE workflow)    │
│  Receive Telegram Messages (telegramTrigger, owns the webhook)    │
│    └── Generate FB Post (langchain agent, OpenRouter + memory)    │
│         tools: search_web            (NEW — online model)         │
│                save_campaign         (NEW — POST 7alm)            │
│                publish_photo_post    (existing)                   │
│                publish_text_post     (existing)                   │
│                create_instagram_media / publish_instagram_media   │
│                publish_tiktok_post   (existing)                   │
├──────────────────────────────────────────────────────────────────┤
│ API Routes                                                        │
│  POST  /api/n8n/ai-studio/campaigns        x-n8n-access-token     │
│  GET   /api/admin/ai-studio/campaigns      verifyAdmin            │
│  PATCH /api/admin/ai-studio/campaigns/[id] verifyAdmin            │
├──────────────────────────────────────────────────────────────────┤
│ Features (Server)                                                 │
│  src/features/ai-studio/campaigns.service.ts                      │
│  src/features/ai-studio/campaigns.repository.ts                   │
├──────────────────────────────────────────────────────────────────┤
│ Features (Client)                                                 │
│  src/features/ai-studio/ai-studio.api.ts   (RTK Query)            │
├──────────────────────────────────────────────────────────────────┤
│ Pages / Components                                                │
│  /admin/ai-studio  → campaigns list (in progress)                 │
├──────────────────────────────────────────────────────────────────┤
│ Database                                                          │
│  ad_campaigns  (widened — the only live table)                    │
│  trends, design_ideas, design_versions, generated_assets,         │
│  marketing_content, ai_memory, telegram_approval_logs  (DORMANT)  │
└──────────────────────────────────────────────────────────────────┘
```

## Why this shape

- **One workflow, not four.** The original plan decomposed into Workflow A
  (dispatcher), B (callback receiver branch), C (assets), D (design director).
  The campaign flow needs none of them: research, negotiation, approval, and
  publishing all happen in a single conversation, so they all belong to the
  single agent that already owns that conversation. See `automation-plan.md` §3.
- **The agent extension is additive, not a new agent.** `Generate FB Post`
  already knows the product catalog, already speaks Egyptian Arabic, already
  gates publishing on typed approval, and already holds per-chat memory. Adding
  `search_web` and `save_campaign` to it is a smaller and safer change than
  standing up a second agent that would then need its own memory, its own
  catalog access, and its own share of the bot's single webhook.
- **No state machine.** `ad_campaigns.status` has four values
  (`draft | ready | published | archived`) but no transition graph is enforced —
  the admin route accepts any valid status. The deleted
  `designIdeaStateMachine.ts` existed because Telegram buttons could fire out of
  order against a shared row; a chat conversation with a single participant has
  no such race. Adding a state machine here would be enforcing an invariant
  nothing threatens.
- **No session/draft table.** Negotiation state lives in n8n's per-chat memory.
  The database records only outcomes. This is why `saveApprovedCampaign` is a
  plain INSERT rather than an upsert against a session id.
- **Nothing was dropped from the database.** Widening columns is reversible in
  practice; dropping tables is not. The seven dormant tables cost nothing.

## Data Model

Migration: `docs/migrations/20260726000000_ai_studio_campaigns_restructure.sql`
— **applied live via Supabase MCP on 2026-07-26.** The file is the checked-in
record of that change, per the `docs/migrations/` convention.

### `ad_campaigns` — changes

| Change | Detail |
|---|---|
| `marketing_content_id` | `NOT NULL` dropped — campaigns no longer descend from `marketing_content` |
| `platform` | `NOT NULL` + default dropped; CHECK replaced with `platform IS NULL OR platform IN ('meta','facebook_instagram','whatsapp')` |
| **new columns** | `name`, `niche`, `objective`, `research_summary`, `headline`, `primary_text`, `cta`, `hashtags`, `telegram_chat_id` — all `text`, all **nullable** |
| new index | `ad_campaigns_chat_id_idx` on `telegram_chat_id` |
| unchanged | `status` (`draft | ready | published | archived`), `target_audience`, `daily_budget`, `external_campaign_id`, timestamps |

Also: `marketing_content.design_idea_id` `NOT NULL` dropped (harmless — that
table is dormant).

**Required-ness is enforced in the API route, not the schema.** Every new column
is nullable in Postgres; `POST /api/n8n/ai-studio/campaigns` rejects a body
missing `name`, `niche`, `objective`, `headline`, `primary_text`, or `cta`. The
`AdCampaign` TypeScript type mirrors the database (nullable), while
`AdCampaignInput` mirrors the route contract (required). That asymmetry is
deliberate — it keeps the pre-existing rows valid.

`daily_budget` and `external_campaign_id` exist but nothing writes them; they
are the seams for a future paid-Ads phase.

**Not representable:** TikTok. The agent can post to TikTok with its existing
tool, but the `platform` CHECK has no TikTok value. Campaigns are a Meta/
WhatsApp concept in this cut.

## API Contract

### `POST /api/n8n/ai-studio/campaigns` — the agent's `save_campaign` sink

Auth: `x-n8n-access-token` → `N8N_API_ACCESS_TOKEN` via `requireN8nAccess`
(`src/lib/n8n-auth.ts`, constant-time compare, **503 when the env var is
unset**).

Body:

| Field | Required | Notes |
|---|---|---|
| `name`, `niche`, `objective` | ✅ | 400 if missing/blank |
| `headline`, `primary_text`, `cta` | ✅ | 400 if missing/blank |
| `research_summary`, `hashtags` | — | free text |
| `platform` | — | validated against `meta | facebook_instagram | whatsapp` |
| `target_audience` | — | JSON object, defaults to `{}` |
| `telegram_chat_id` | — | provenance |
| `status` | — | **defaults server-side to `"ready"`**; the agent sends `"published"` only if it already ran the FB/IG publish tools in the same turn |

Returns `{ success, data: AdCampaign }`. Always inserts — no upsert, no dedup.

### `GET /api/admin/ai-studio/campaigns?status=` — dashboard list

Auth: `extractToken` + `verifyAdmin()`. Optional `status` filter; an invalid
value is ignored rather than erroring. Ordered by `created_at DESC`.

### `PATCH /api/admin/ai-studio/campaigns/[id]` — dashboard status change

Auth: `extractToken` + `verifyAdmin()`. Body `{ status }`, validated against the
four statuses. Used to record a manual WhatsApp/Instagram launch (`published`)
or retire a campaign (`archived`).

**These three are the complete API surface.** No other AI Studio endpoint
exists; every earlier `/api/n8n/ai-studio/{ideas,trends}`,
`/api/admin/ai-studio/{ideas,trends}`, and
`/api/webhooks/n8n/ai-studio/idea-action` route was deleted.

## File Change Map

### Shipped this session

| File | Layer | Status |
|---|---|---|
| `docs/migrations/20260726000000_ai_studio_campaigns_restructure.sql` | DB | Applied via Supabase MCP |
| `src/features/shared/types.ts` | Types | `AdCampaign` / `AdCampaignInput` / `AdCampaignStatus` / `AdCampaignPlatform`; all design-idea types removed |
| `src/features/ai-studio/campaigns.repository.ts` | Server | `list` / `getById` / `create` / `updateStatus` |
| `src/features/ai-studio/campaigns.service.ts` | Server | `list` / `getById` / `saveApprovedCampaign` / `updateStatus` |
| `src/app/api/n8n/ai-studio/campaigns/route.ts` | API | POST, `requireN8nAccess` |
| `src/app/api/admin/ai-studio/campaigns/route.ts` | API | GET, `verifyAdmin` |
| `src/app/api/admin/ai-studio/campaigns/[id]/route.ts` | API | PATCH, `verifyAdmin` |
| `src/features/ai-studio/ai-studio.api.ts` | Client | RTK Query: `useGetCampaignsQuery`, `useUpdateCampaignStatusMutation` |

### In progress (unverified at the time of writing)

| Work | Owner |
|---|---|
| `/admin/ai-studio` campaigns list + nav/dictionary repoint | frontend agent |
| `telegram-fb-post-workflow.json`: dead `ais:` branch dropped, `search_web` + `save_campaign` tools added — **in the working tree; not yet re-imported into the live n8n instance** | n8n agent |

### Deleted

`ai-studio.{repository,service,hooks}.ts` (trend versions),
`design-ideas.{repository,service}.ts`, `src/lib/designIdeaStateMachine.ts`,
`/api/n8n/ai-studio/{ideas,trends}`, `/api/admin/ai-studio/{ideas,trends}`,
`/api/webhooks/n8n/ai-studio/idea-action`,
`components/admin/ai-studio/{TrendsList,AddTrendForm,IdeasList}.tsx`,
`automation/ai-studio-idea-dispatcher-workflow.json`,
`automation/ai-studio-design-director-workflow.json`,
`products.repository.ts::createDraftFromDesignIdea()`, and the eight orphaned
shared types.

## Open Items

1. **`N8N_API_ACCESS_TOKEN` on the deployed app.** Present in local `.env.local`
   as `'123456'`, matching the literal the live workflows send. **Unverified on
   the deployed Railway environment** — if it is unset there,
   `requireN8nAccess` returns 503 and `save_campaign` silently never persists
   anything. This is the single highest-value thing to confirm (`tasks.md`
   T052).
2. **Naming discrepancy, do not "fix" blindly.** `AGENTS.md` documents the n8n
   variable as `N8N_ACCESS_TOKEN`; the code reads `N8N_API_ACCESS_TOKEN`.
   `.env.local` has the latter. Verify against the deployed environment before
   changing either — renaming the wrong one breaks every `/api/n8n/*` route.
3. **The dead `ais:` callback branch is removed from the working-tree
   workflow** (`Message Kind?`, `Parse Callback`, `Idea Action → 7alm`,
   `Answer Callback`, `Edit Card Status`), and `search_web` + `save_campaign`
   are present. **The live n8n instance still runs the previous version until
   the JSON is re-imported** — nothing is verified at runtime yet
   (`tasks.md` T045, T046).
4. **No campaign dedup.** A retried or repeated `save_campaign` creates a
   duplicate row. Accepted for now; archiving is the remedy.
5. **Paid Meta Ads, WhatsApp broadcast, and analytics remain out of scope** —
   see `spec.md` §Explicitly Out of Scope.
