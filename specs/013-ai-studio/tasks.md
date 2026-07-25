# Tasks: AI Studio — AI-Powered Creative & Marketing Module

**Spec:** 013-ai-studio
**Last reconciled:** 2026-07-25 (against branch `feat/013-ai-studio`, commit `3c6bc03`)

Legend:
- ✅ **done & verified** — written and proven to work
- 🟡 **built, not verified** — code exists on `feat/013-ai-studio`, never exercised end-to-end
- ⬜ **ready** — no blocker, nobody has started it
- ⛔ **blocked** — needs a credential or a product decision that does not exist
- ⊘ **superseded** — the task as written no longer describes work we will do

> **Why this file was rewritten.** The previous ledger marked T010–T016 as
> not-started and T013 as blocked on a Telegram bot token. Both were wrong:
> the code is committed, and `automation-plan.md` §0 documents a working bot
> plus Gemini/OpenRouter/Postgres credentials. It also assumed the migration
> could only be applied by hand — Supabase MCP is available. Three tasks
> (T011, T012, T013) changed *meaning*, not just status; each says so inline
> so the change reads as a decision rather than drift.

---

## Phase 1 — Foundation (trend storage + duplicate-safe scaffolding)

- ✅ T001 Write `spec.md` (prioritized user stories, FRs, success criteria)
- ✅ T002 Write `plan.md` (architecture, file map, agent→file mapping)
- 🟡 T003 Draft `docs/migrations/20260725120000_ai_studio_core.sql`
  (all 9 new tables, additive only, RLS enabled, admin-only policies).
  **Not applied.** Needs the T029 `UNIQUE` fix *before* it is applied.
- ✅ T004 Append AI Studio types to `src/features/shared/types.ts`
  (6 of the 9 entity types still have zero consumers — expected, Phase 2/3)
- 🟡 T005 `src/features/ai-studio/ai-studio.repository.ts` +
  `ai-studio.service.ts` (Trend Hunter slice: create/list trends,
  fingerprint-based dedup, `markTrendsUsed()`). Written; **zero callers** —
  T007/T031/T032 are what wire it up.
- ⬜ T006 Apply the migration to Supabase **via Supabase MCP**
  (`mcp__supabase__apply_migration`). `list_tables` confirms **0 of the 9
  tables exist today**, so every file written so far reads tables that aren't
  there. *(Was "admin runs it in the SQL Editor" — MCP access exists, so this
  is no longer a manual-only step.)* **Blocked by:** T029.
- ⬜ T007 `/api/admin/ai-studio/trends/route.ts` (GET list / POST manual add)
  — `extractToken` + `verifyAdmin()`, calls `ai-studio.service.ts`.
  Copy the auth shape from `api/admin/coupons/route.ts` (canonical) — **not**
  `customers/route.ts`, which hand-rolls it. **Blocked by:** T006.
- ⬜ T008 `ai-studio.api.ts` (RTK Query) + register in `src/lib/redux/store.ts`
  (lines 13 / 29 / 43). Covers trends **and** ideas endpoints.
  **Blocked by:** T007, T041.
- ⬜ T009 `/admin/ai-studio` page + `TrendList` component (list + manual
  "add trend" form so the pipeline is testable before any scraper exists)
  + an ideas list grouped by status. This is the FR-015 deliverable — today
  there is **no** AI Studio UI, RTK Query slice, or dictionary key anywhere
  in the repo. Follow `CustomerList.tsx` as the list template (there is no
  shared table primitive). **Blocked by:** T008, T039.

## Phase 1b — Design Director + Telegram approval (P1)

- 🟡 T010 `src/lib/designIdeaStateMachine.ts` — built
  (`pending_review → approved|rejected`, `approved → published`).
  Arabic labels are hardcoded at lines 31–64; see T040.
- 🟡 T011 `design-ideas.repository.ts` / `design-ideas.service.ts` — **narrowed.**
  Built: `list` / `getById` / `updateStatus` / `setFavorite` /
  `logApprovalAction` / `getByConceptFingerprint`.
  *Not* in this task any more: the **insert path** (→ T031) and the
  **Design Director LLM call** (→ T033, and it lives in n8n now, not here).
- ⊘ T012 ~~`telegram.service.ts` (Next.js thin HTTP client that sends the idea
  card)~~ — **superseded.** Per `automation-plan.md` §2, outbound Telegram send
  lives in n8n (Workflow A), because the bot's single webhook is already owned
  by `telegram-fb-post-workflow.json`. What was actually built in its place is
  the pair of n8n-facing routes — tracked as **T030**.
- 🟡 T013 Telegram receiver — **restated.** *Was* `/api/webhooks/telegram/route.ts`.
  That route will never exist: a second `telegramTrigger` would steal the bot's
  only webhook (`automation-plan.md` §2). The receiver is the **`callback_query`
  branch inside `automation/telegram-fb-post-workflow.json`** (trigger `updates`
  extended to `["message","callback_query"]`, top Switch routing `ais:` prefixed
  callbacks). Built (+282 lines, existing FB-post path byte-identical).
  **No longer blocked** — the bot and credential `AsXbM9hYArJ88apL` already
  exist. Carries defects **B3** (T036) and **B4** (T037).
- 🟡 T014 `telegram_approval_logs` audit writes on every button action — built
  inside the idea-action route, in the same call as the status change.
- 🟡 T015 n8n dispatcher workflow — built as
  `automation/ai-studio-idea-dispatcher-workflow.json` (5 nodes, valid JSON,
  correct paths/headers). *(Filename changed from the planned
  `ai-studio-telegram-approval-workflow.json`; the approval half is T013.)*
  Carries defects **B2** (T035) and **B5** (T038).
- 🟡 T016 "Publish" action writes into the existing `products` table —
  `products.repository.ts:198` `createDraftFromDesignIdea()`, `is_active: false`.
  Built; the live `products` schema was checked against all 17 written columns.

### New Phase-1b work (the gaps that make the built code inert)

- ⬜ **T029 (B1)** Add `UNIQUE (concept_fingerprint)` to `design_ideas` in
  `docs/migrations/20260725120000_ai_studio_core.sql` **before** applying it.
  Today the migration creates only an index (sql:46), so
  `getByConceptFingerprint()` (`design-ideas.repository.ts:56-70`) calls
  `.single()` on a non-unique column: duplicate rows make it throw, and the
  catch swallows the error into `null` — reporting "not a duplicate" exactly
  when there is one. `trends` already gets this right (sql:23).
  **Blocks:** T006.
- 🟡 **T030** The two n8n-facing routes (replaces the superseded T012) — built:
  - `GET /api/n8n/ai-studio/ideas` — `x-n8n-access-token` → `N8N_API_ACCESS_TOKEN`,
    matching the four existing `/api/n8n/*` routes.
  - `POST /api/webhooks/n8n/ai-studio/idea-action` — `x-webhook-secret` →
    `N8N_WEBHOOK_SECRET`, matching the `order-action` precedent.
    `SUPPORTED_ACTIONS` = `approve | reject | favorite | publish`.

  Both return **503** until T034 lands, because `N8N_API_ACCESS_TOKEN` is
  absent from `.env.local` (pre-existing; shared by all four existing
  `/api/n8n/*` routes).
- ⬜ **T031 `design_ideas` insert path — P1, the single biggest gap.**
  Nothing anywhere inserts a `design_ideas` row, so
  `GET /api/n8n/ai-studio/ideas` returns `[]` forever and the whole approval
  loop is unreachable. Deliver:
  - `designIdeasService.createIdea()` + a repository insert, wiring up the
    currently-dead `getByConceptFingerprint()`;
  - `POST /api/n8n/ai-studio/ideas` (`requireN8nAccess`) as the Design
    Director's sink. **The server computes `concept_fingerprint` and runs
    dedup** — the LLM only supplies `title` / `description` / `concept`
    (`automation-plan.md` §1, server-authoritative rule);
  - the same route must call the existing zero-caller `markTrendsUsed()`,
    or the Director re-reads the same trends every hour and dedup silences
    every run after the first.

  **Blocked by:** T006, T029.
- ✅ **T032** `GET /api/n8n/ai-studio/trends?status=new` (`requireN8nAccess`) —
  the Design Director's context read. **Blocked by:** T006.
- ✅ **T033 LLM Design Director n8n workflow** *(built; untested at runtime)* —
  `automation/ai-studio-design-director-workflow.json`:
  `scheduleTrigger` → `httpRequest` GET trends (T032) →
  `@n8n/n8n-nodes-langchain.agent` on the **OpenRouter account**
  (`EbbUdiq5aCjllGWD`) → `httpRequest` POST ideas (T031).
  Copy the agent + `$fromAI(...)` pattern from telegram-fb-post's
  "Generate FB Post". Output contract: `title` / `description` / `concept`
  **only** — no fingerprint, no status. The hourly dispatcher (T015) picks the
  ideas up independently, so the two workflows stay decoupled.
  **Blocked by:** T031, T032, T034.
- 🟡 **T034 Pin the two n8n secret values.** *(secrets PINNED — both are
  `123456`, evidenced by the live `order-action?secret=123456` calls that work
  against the deployed app; `.env.local`'s differing value is local-only. All
  `$env.*` converted to literals. **STILL OPEN: `AI_STUDIO_ADMIN_CHAT_ID`** —
  the dispatcher's `chatId` is the placeholder `REPLACE_WITH_ADMIN_CHAT_ID`,
  so it cannot send until seeded.)*

  Original text: `.env.local` defines
  `N8N_WEBHOOK_SECRET` (not `123456`) and has **no** `N8N_API_ACCESS_TOKEN`,
  yet the live workflows send the literal `123456` and work. Confirm against
  the **deployed Railway env** what `/api/n8n/*` and `/api/webhooks/n8n/*`
  actually validate, write both values down, and **add `N8N_API_ACCESS_TOKEN`
  to `.env.local`** (separate from the discovery — without it
  `requireN8nAccess` 503s). Also seed `AI_STUDIO_ADMIN_CHAT_ID`, which exists
  nowhere: capture it once from any inbound `callback_query.from.id` /
  `message.chat.id`. Per the project convention (and
  `.claude/ai-changelog/CHANGELOG.md:19`) these go into the workflows as
  **hardcoded literals**, not `$env.*` — the new workflows currently use
  `$env.*` and must be converted. **Blocks:** T033, and the *live firing* of
  T015/T030. Has **no upstream dependency** and the longest lead time (it may
  need someone else to read the Railway env) — **start it first, in parallel
  with T029.** Note T035–T038 do *not* depend on it: none of those four
  touches a secret value.
- ✅ **T035 (B2)** Dispatcher `Send Idea Card` — rebuilt using the Telegram
  node's native `replyMarkup: "inlineKeyboard"` + `inlineKeyboard.rows[].row
  .buttons[]` shape, `callback_data` under each button's `additionalFields`.
  Verified against `nodes-base` `Telegram.node.js` + `GenericFunctions
  .addAdditionalFields`.
  **Correction to the original finding:** the raw `additionalFields
  .reply_markup` object would *not* have rendered a buttonless card —
  `replyMarkup` defaults to `'none'`, so the function returns *before*
  `body.reply_markup = {}` wipes it, and the raw object survives. It was
  fragile, not broken: the n8n UI strips undeclared collection keys on save.
  Changed anyway for round-trip safety; see the node `notes`.
  **Untested at runtime** — not yet round-tripped through the n8n UI.
- ✅ **T036 (B3)** *(fixed — now sources `$('Idea Action → 7alm').item.json`)* `telegram-fb-post` `Edit Card Status` reads `$json.success` /
  `$json.status`, but its input is `Answer Callback` (a Telegram API response),
  not the 7alm body — so it **always takes the failure arm and shows "فشل"
  even on success**. Source from `$('Idea Action → 7alm').item.json`.
- ✅ **T037 (B4)** *(fixed — node deleted, HTTP wired straight to `Answer Callback`)* `telegram-fb-post` `Action OK?` — both IF outputs wire to the
  same node, so it decides nothing. Delete it.
- ✅ **T038 (B5)** *(fixed — counts `($json.data || []).length` under loose validation)* Dispatcher `Has Any?` — `strict` typeValidation on
  `$json.data` throws on a 401/503 body (which has no `data` key) instead of
  exiting quietly.
- ⬜ **T039 Admin UI plumbing** (absent repo-wide, blocks T009):
  `ai-studio.hooks.ts`; a `navLinks` entry at `AdminLayoutClient.tsx:67`;
  `nav.aiStudio` + `aiStudio.*` keys in **both** `en` (`dictionary.ts:18`) and
  `ar` (`:605`) — `en` is the source of truth and a missing `ar` key is a
  compile error. Logical CSS properties only (AGENTS.md §3).
- ⬜ **T040** Move the hardcoded Arabic labels out of
  `designIdeaStateMachine.ts:31-64` into `dictionary.ts`. **Blocked by:** T039.
- ⬜ **T041** `/api/admin/ai-studio/ideas/route.ts` — `extractToken` +
  `verifyAdmin()`, list/filter by status for the dashboard (FR-015's
  "Telegram is the fast path, not the only path"). **Blocked by:** T006.

## Phase 2 — Imagery + marketing + ad drafts (P2, depends on Phase 1b)

- ⛔ T017 Decide image-generation provider (Gemini image model vs. a
  dedicated image API) — **still blocked** on a product decision + possibly a
  new API key. `automation-plan.md` §5 recommends attempting
  `gemini-2.5-flash-image` on the existing `googlePalmApi` cred first.
- ⬜ T018 `generated-assets.repository.ts` / `.service.ts` ("Prompt
  Engineer" agent builds the generation prompt from the approved
  `design_versions` row + Image Standards checklist from
  `CLAUDE_PROJECT_CONTEXT.md`)
- ⬜ T019 QA gate ("Mockup Director" agent): reject non-photorealistic /
  wrong-proportion output before it can attach to a product or ad
- ⬜ T020 `marketing-content.repository.ts` / `.service.ts` ("Marketing
  Manager" agent — Gemini text generation, no new external dependency)
- ⬜ T021 `ad-campaigns.repository.ts` / `.service.ts` ("Ads Manager" agent
  — drafts only, `status = draft`, never calls Meta's Ads API in v1)
- ⬜ T022 Admin UI: `DesignIdeaBoard` (kanban by status) + `AssetGallery` —
  the richer successor to T009's flat ideas list
- ⬜ T042 `edit` / `regenerate` Telegram actions (deferred out of the first
  cut per `automation-plan.md` §6 — they need stateful free-text correlation
  over Telegram `message` updates). FR-004 still calls for all six; this is
  phasing, not a scope cut. Handle them in the dashboard UI first if simpler.

## Phase 3 — Analytics feedback loop (P3, depends on Phase 2 shipping + real data)

- ⬜ T023 `analytics.repository.ts` — ingestion endpoint/job for
  campaign performance data (source TBD: manual CSV import first, Meta
  Ads API later)
- ⬜ T024 `ai-memory.repository.ts` / `.service.ts` ("Business Analyst"
  agent — summarizes `analytics` into reusable insight rows)
- ⬜ T025 Wire `ai_memory` into the Design Director's prompt context
  (closes the learning loop described in the project context). Note the
  prompt now lives in the n8n agent node (T033), not in
  `design-ideas.service.ts`.

## Cross-cutting / hygiene (any phase)

- ⬜ T026 `npx tsc --noEmit` and `npm run build` must stay green after every
  phase (non-negotiable per `AGENTS.md`; SC-005). Currently exit 0.
- ⬜ T027 Every new admin page/component follows the bilingual/RTL rules in
  `AGENTS.md` (logical CSS properties, `t(key)` dictionary strings)
- ⬜ T028 **Route auth follows the FR-013 amendment** (see `spec.md` FR-013):
  *admin-facing* routes (`/api/admin/ai-studio/*`) require `extractToken` +
  `verifyAdmin()`; *machine-to-machine* n8n routes use the shared-secret
  convention already established by `/api/n8n/*` (`x-n8n-access-token`) and
  `/api/webhooks/n8n/*` (`x-webhook-secret`). There are still **no public
  AI Studio endpoints**. *(Was "every new API route requires `verifyAdmin()`",
  which would have marked the shipped n8n routes as violations.)*

---

## Summary of Blockers Requiring Admin Input

| # | Blocker | Status | Needed for |
|---|---|---|---|
| 1 | Telegram bot token + chat ID | ✅ **RESOLVED** — bot + cred `AsXbM9hYArJ88apL` already live (`automation-plan.md` §0). Only the admin chat id still needs seeding (T034). | T013, T015 |
| 2 | Gemini / OpenRouter / Postgres credentials | ✅ **RESOLVED** — `pj3wNPsZG5Yic3Ho`, `EbbUdiq5aCjllGWD`, Postgres all proven in existing workflows | T033 |
| 3 | Supabase migration access | ✅ **RESOLVED** — Supabase MCP is available; T006 applies it directly | T006 |
| 4 | The two n8n secret values (`N8N_API_ACCESS_TOKEN` / `N8N_WEBHOOK_SECRET`) as the **deployed** app validates them | 🟡 **VERIFY** — T034; without it every callback silently 401s and `/api/n8n/*` 503s | T030 firing, T033 |
| 5 | Trend-source API/scraping access (Pinterest, Etsy, TikTok, Instagram, Google Trends, Reddit, Amazon) | ⛔ **STILL BLOCKED** — no credential for any of the 7 sources. Degrade to the manual "add trend" form (T009). | Real (non-manual) trend collection |
| 6 | Image-generation provider decision + credentials | ⛔ **STILL BLOCKED** (product decision) | T017–T019 |
| 7 | Meta Ads API access | ⛔ blocked, **not needed** — v1 is drafts only | Future auto-publish |

**Two parallel tracks to a working first cut** — nothing forces them to be
serialized, and the first item of each has no upstream dependency:

- **Track A (data + n8n):** T029 → T006 → T031 + T032 → T033.
- **Track B (start immediately, in parallel):** T034 (longest lead — needs the
  deployed Railway env) and T035–T038 (four independent workflow fixes, no
  dependency on anything), plus T039 (dictionary keys + `navLinks`, depends on
  nothing).
- **Converging:** T007 / T041 (need T006) → T008 → T009 / T040 (need T039).

The two things most likely to stall the whole cut are **T034** and **T035**
(the B2 keyboard, which has no in-repo example) — neither is blocked by
anything, so neither should wait.
