# Tasks: AI Studio — Conversational Marketing-Campaign Builder

**Spec:** 013-ai-studio
**Last reconciled:** 2026-07-26 (against branch `feat/013-ai-studio`, after the conversational pivot)

Legend:
- ✅ **done & verified** — written and proven to work
- 🟡 **built, not verified** — code exists, never exercised end-to-end
- ⬜ **ready** — no blocker, nobody has started it
- ⛔ **blocked** — needs a credential or a product decision that does not exist
- ⊘ **superseded / removed** — no longer work we will do

> **Why this file was rewritten (2026-07-26).** The feature pivoted from a
> trend → design-idea → Telegram-button pipeline to a conversational
> marketing-campaign builder (`spec.md` §Scope Pivot). The old pipeline was
> shipped and then **deleted from the app**. Rather than renumber — T001–T042
> are cross-referenced from `plan.md` and `automation-plan.md` — dead tasks are
> marked ⊘ **in place** with a one-line reason, and new work starts at **T043**.

---

## Superseded — the trend → design-idea pipeline (T001–T042)

All of the following described the removed pipeline. Nothing here is work that
will be done. The database tables they created still exist, dormant.

**Phase 1 (trend storage):**

- ⊘ T001 / T002 spec + plan for the trend pipeline — *rewritten for the pivot; both files now describe the campaign builder.*
- ⊘ T003 `docs/migrations/20260725120000_ai_studio_core.sql` — *applied; created the 9 tables. Seven are now dormant, one (`ad_campaigns`) was widened by the 2026-07-26 migration. Kept as history, not re-run.*
- ⊘ T004 AI Studio entity types — *replaced. `types.ts` now holds only `AdCampaign` / `AdCampaignInput` / `AdCampaignStatus` / `AdCampaignPlatform`; `Trend`, `TrendInput`, `DesignIdea`, `DesignVersion`, `GeneratedAsset`, `MarketingContent`, `AiMemoryEntry`, `TelegramApprovalLog`, `TelegramApprovalAction` were deleted as orphans.*
- ⊘ T005 Trend Hunter repository/service — *files deleted.*
- ⊘ T006 Apply the core migration — *was applied; superseded by the campaigns restructure migration (T043a, see "Shipped" below).*
- ⊘ T007 `/api/admin/ai-studio/trends` — *route deleted.*
- ⊘ T008 trends+ideas RTK Query — *`ai-studio.api.ts` survives but was rewritten for campaigns only.*
- ⊘ T009 `/admin/ai-studio` trends + ideas UI — *replaced by the campaigns list (T047).*

**Phase 1b (Design Director + Telegram buttons):**

- ⊘ T010 `src/lib/designIdeaStateMachine.ts` — *deleted. No state machine exists in the campaign flow; see `plan.md` §Why this shape.*
- ⊘ T011 `design-ideas.repository.ts` / `.service.ts` — *deleted.*
- ⊘ T012 `telegram.service.ts` — *was already superseded; now moot entirely.*
- ⊘ T013 Telegram `callback_query` receiver branch — *the `ais:` branch is being removed from `telegram-fb-post-workflow.json`; see T046. Campaign approval is chat text, not buttons (`spec.md` §Approval Model).*
- ⊘ T014 `telegram_approval_logs` audit writes — *route deleted; table dormant. There is no per-action audit log in the campaign flow — the conversation itself is the record, and `telegram_chat_id` on the row is the provenance link.*
- ⊘ T015 `ai-studio-idea-dispatcher-workflow.json` — *file deleted.*
- ⊘ T016 "Publish" → `products` row — *`createDraftFromDesignIdea()` removed from `products.repository.ts`. Campaigns never create products.*
- ⊘ T029 (B1) `UNIQUE (concept_fingerprint)` — *the fingerprint/dedup mechanism is gone with the design-idea tables. Note the campaign flow has **no dedup at all** — see T049.*
- ⊘ T030 the two n8n-facing idea routes — *both deleted; replaced by the single `POST /api/n8n/ai-studio/campaigns`.*
- ⊘ T031 `design_ideas` insert path — *moot.*
- ⊘ T032 `GET /api/n8n/ai-studio/trends` — *route deleted.*
- ⊘ T033 LLM Design Director n8n workflow — *file deleted. The campaign agent replaces it and lives inside the existing Telegram workflow.*
- ⊘ T034 Pin the two n8n secret values — *half survives, half is moot. `N8N_WEBHOOK_SECRET` no longer matters to this feature (the `/api/webhooks/n8n/ai-studio/*` route is deleted). `N8N_API_ACCESS_TOKEN` matters **more** than before — it now gates the only n8n→7alm write path. Carried forward as **T052**.*
- ⊘ T035 / T036 / T037 / T038 (B2–B5) — *all four were fixes to the dispatcher and the `ais:` callback branch. Both are being deleted; the fixes go with them.*
- ⊘ T039 / T040 / T041 admin UI plumbing, state-machine label extraction, ideas admin route — *replaced by T047 (campaigns dashboard) and T048 (i18n keys); T040 is moot with the state machine gone.*
- ⊘ T042 `edit` / `regenerate` Telegram buttons — *moot. Free-text revision **is** the mechanism now; there is nothing left to defer.*

**Phase 2 / Phase 3 (imagery, marketing copy, analytics):**

- ⊘ T017 image-generation provider decision — *no image generation in this cut; campaigns reuse existing product imagery via the existing publish tools.*
- ⊘ T018 / T019 `generated-assets` + QA gate — *moot.*
- ⊘ T020 `marketing-content` service — *moot; ad copy is now fields on `ad_campaigns`, produced conversationally.*
- ⊘ T021 `ad-campaigns` "Ads Manager" agent — *superseded in mechanism, not intent: `ad_campaigns` is now written by the chat agent via one API route, not by a scheduled LLM agent.*
- ⊘ T022 `DesignIdeaBoard` / `AssetGallery` — *moot.*
- ⊘ T023 / T024 / T025 analytics ingestion, `ai_memory`, learning loop — *unchanged in status: never built, still out of scope (`spec.md` §Explicitly Out of Scope).*

**Cross-cutting — these three survive the pivot and are restated below:**

- ⊘ T026 → restated as **T050** (tsc + build green)
- ⊘ T027 → restated as **T048** (bilingual/RTL rules on the new UI)
- ⊘ T028 → restated as **T044** (route auth, now matching FR-010)

---

## Shipped this session (campaign builder)

- ✅ **T043a** Apply `docs/migrations/20260726000000_ai_studio_campaigns_restructure.sql`
  via Supabase MCP — widen `ad_campaigns` (nullable `marketing_content_id` +
  `platform`, new CHECK `meta|facebook_instagram|whatsapp`, nine new text
  columns, `telegram_chat_id` index), drop `NOT NULL` on
  `marketing_content.design_idea_id`. **No table dropped** — the seven
  design-idea tables are left dormant deliberately (data changes are hard to
  reverse; app-code changes are cheap).
- ✅ **T043b** Delete the design-idea pipeline app code (see the ⊘ list above for
  the full inventory) and the eight orphaned shared types.
- 🟡 **T043c** `campaigns.repository.ts` + `campaigns.service.ts` —
  `list(status?)`, `getById(id)`, `saveApprovedCampaign(input)` (always a fresh
  INSERT: negotiation lives in n8n's per-chat memory, so there is no
  session/upsert concept), `updateStatus(id, status)`.
- 🟡 **T043d** `POST /api/n8n/ai-studio/campaigns` — `requireN8nAccess`
  (`x-n8n-access-token`). Validates that `name`/`niche`/`objective`/`headline`/
  `primary_text`/`cta` are present, and that `platform`/`status` are in range.
  `status` defaults server-side to `"ready"`.
- 🟡 **T043e** `GET /api/admin/ai-studio/campaigns?status=` and
  `PATCH /api/admin/ai-studio/campaigns/[id]` — `extractToken` + `verifyAdmin()`.
- 🟡 **T043f** `ai-studio.api.ts` rewritten to campaigns only
  (`useGetCampaignsQuery`, `useUpdateCampaignStatusMutation`).

> These are 🟡 not ✅: the code is written and type-checks, but no campaign has
> been saved end-to-end from Telegram yet — which T052 gates.

## Open work

- ⬜ **T052 Confirm `N8N_API_ACCESS_TOKEN` on the deployed app.** *(Highest
  value, no upstream dependency, start first.)* `.env.local` now has
  `N8N_API_ACCESS_TOKEN='123456'`, matching the literal the live workflows
  send — **locally resolved.** Still unverified on the **deployed Railway
  environment**. If it is unset there, `requireN8nAccess` returns **503**,
  `save_campaign` fails, and no campaign is ever persisted — the whole feature
  is silently dead while the chat still looks like it works.
  *Also verify, do not blind-fix:* `AGENTS.md` documents the variable as
  `N8N_ACCESS_TOKEN`; the code reads `N8N_API_ACCESS_TOKEN`. Renaming the wrong
  one breaks every existing `/api/n8n/*` route.
  **Blocks:** live firing of T043d, T045.
- 🟡 **T044 Route auth matches FR-010.** Admin routes use `extractToken` +
  `verifyAdmin()`; the single n8n route uses `x-n8n-access-token` →
  `N8N_API_ACCESS_TOKEN`. No public AI Studio endpoint exists. *(Built as
  described; verify once T052 lands.)*
- 🟡 **T045 Extend the `Generate FB Post` agent** in
  `automation/telegram-fb-post-workflow.json` — *edit landed in the working
  tree, unverified at runtime.* Both tool nodes are present. Two new tools on
  the existing agent:
  - `search_web` — an OpenRouter **web-enabled/online model** on the existing
    OpenRouter credential (`EbbUdiq5aCjllGWD`). No new search-API account.
  - `save_campaign` — `httpRequestTool` POSTing to
    `/api/n8n/ai-studio/campaigns` with `x-n8n-access-token`.

  Plus an extended Egyptian-Arabic system prompt covering market research,
  campaign negotiation, and **chat-based approval** — no inline buttons. The
  existing FB/IG/TikTok publishing rules must stay byte-intact.
  **Blocked by:** T052 (for it to actually persist).
- 🟡 **T046 Remove the dead `ais:` callback branch** from the same workflow —
  *done in the working tree; re-import into n8n still unverified.* The five
  nodes (`Message Kind?`, `Parse Callback`, `Idea Action → 7alm`,
  `Answer Callback`, `Edit Card Status`) are gone from the JSON. They were
  unreachable — nothing emits `ais:` callbacks since the dispatcher workflow
  was deleted — and `Idea Action → 7alm` pointed at the **deleted**
  `/api/webhooks/n8n/ai-studio/idea-action`. **The live n8n instance still runs
  the old version until the JSON is re-imported.**
- 🟡 **T047 Rebuild `/admin/ai-studio` as a campaigns list** — *in progress,
  unverified.* Replaces the trends/ideas UI. Reads
  `useGetCampaignsQuery`, shows the negotiated copy (name, niche, objective,
  research summary, headline, primary text, CTA, hashtags) and allows
  `ready → published | archived` via `useUpdateCampaignStatusMutation` — the
  "review it and manually launch on WhatsApp/Instagram" path from the user
  request.
- 🟡 **T048 Nav + i18n for the campaigns page** — *in progress, unverified.*
  Repoint the `navLinks` entry in `AdminLayoutClient.tsx` and replace the
  `aiStudio.*` dictionary keys in **both** `en` and `ar` (a missing `ar` key is
  a compile error). Logical CSS properties only, every string through `t(key)`
  (AGENTS.md §3).
- ⬜ **T049 Decide whether campaign dedup is needed.** `saveApprovedCampaign` is
  an unconditional INSERT — a repeated or retried `save_campaign` produces a
  duplicate row. Currently mitigated only by the agent's "once per approval"
  prompt rule, and remediable by archiving in the dashboard. Do nothing unless
  duplicates actually show up; the deleted `concept_fingerprint` machinery is
  the thing not to rebuild reflexively.
- ⬜ **T050 `npx tsc --noEmit` and `npm run build` stay green** (SC-005,
  non-negotiable per `AGENTS.md`), and the live FB/IG/TikTok posting flow is
  unchanged in behaviour.
- ⬜ **T051 End-to-end smoke test** once T052 + T045–T048 land: ask the bot
  about a niche → confirm it searched → negotiate two revisions → approve →
  confirm exactly one `ad_campaigns` row with `status='ready'` → confirm it
  renders in `/admin/ai-studio` → mark it `published`.

---

## Blockers

| # | Blocker | Status | Needed for |
|---|---|---|---|
| 1 | Telegram bot + credential | ✅ **RESOLVED** — live bot, cred `AsXbM9hYArJ88apL`, already owns the webhook (`automation-plan.md` §0) | T045, T046 |
| 2 | OpenRouter credential (agent + web search) | ✅ **RESOLVED** — `EbbUdiq5aCjllGWD`, proven in 3 workflows. Decision #2: web search reuses it via an online model, no new account | T045 |
| 3 | Supabase migration access | ✅ **RESOLVED** — MCP; the restructure migration is applied | T043a |
| 4 | `N8N_API_ACCESS_TOKEN` as the **deployed** app validates it | 🟡 **VERIFY (T052)** — set locally; unconfirmed on Railway. Without it `save_campaign` 503s and nothing persists | T043d firing, T045, T051 |
| 5 | Admin Telegram chat id | ✅ **MOOT** — the agent replies into the chat that messaged it; no unsolicited outbound card exists any more, so nothing needs seeding |
| 6 | Trend-source scraping credentials (Pinterest/Etsy/TikTok/IG/Google Trends/Reddit/Amazon) | ⊘ **NO LONGER NEEDED** — the trend pipeline is removed; web search replaces it | — |
| 7 | Image-generation provider | ⊘ **NO LONGER NEEDED** in this cut — campaigns reuse existing product imagery | — |
| 8 | Meta Marketing API (paid ads) | ⛔ **out of scope, deferred** — decision #1: organic FB/IG auto-posts now, paid campaigns are a named future phase | Future paid-ads phase |

**Critical path:** T052 (verify the token on Railway) → T045/T046 (n8n agent
edit) + T047/T048 (dashboard) → T050 → T051. T052 has no upstream dependency
and the longest lead time — it may require someone to read the deployed
environment — so it should not wait on the in-flight n8n and frontend work.

## Deferred — explicitly not in this session

Unchanged from before the pivot and confirmed still out of scope
(`spec.md` §Explicitly Out of Scope):

- **Paid Meta Ads campaigns** (Marketing API: budget, targeting, spend).
  `daily_budget` / `external_campaign_id` are unwritten seams.
- **WhatsApp broadcast / bulk send.** Only single-recipient send exists, via the
  pre-existing `whatsapp.service.ts` → n8n path. `platform='whatsapp'` records
  intent; the owner launches manually.
- **Analytics ingestion and the learning feedback loop** (`analytics`,
  `ai_memory` — tables exist, dormant, nothing reads or writes them).
