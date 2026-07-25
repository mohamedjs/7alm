# Tasks: AI Studio — AI-Powered Creative & Marketing Module

**Spec:** 013-ai-studio

Legend: ✅ done this session · ⛔ blocked on missing credentials/decision · ⬜ ready to start (no blocker) once picked up

---

## Phase 1 — Foundation (trend storage + duplicate-safe scaffolding)

- ✅ T001 Write `spec.md` (prioritized user stories, FRs, success criteria)
- ✅ T002 Write `plan.md` (architecture, file map, agent→file mapping)
- ✅ T003 Draft `docs/migrations/20260725120000_ai_studio_core.sql`
  (all 9 new tables, additive only, RLS enabled, admin-only policies)
- ✅ T004 Append AI Studio types to `src/features/shared/types.ts`
- ✅ T005 Scaffold `src/features/ai-studio/ai-studio.repository.ts` +
  `ai-studio.service.ts` (Trend Hunter slice: create/list trends,
  fingerprint-based dedup) as the reference pattern for later agent modules
- ⬜ T006 Review & run the migration in Supabase SQL Editor (admin action —
  not run automatically this session)
- ⬜ T007 `/api/admin/ai-studio/trends/route.ts` (GET list / POST manual add)
  — auth via `verifyAdmin()`, calls `ai-studio.service.ts`
- ⬜ T008 `ai-studio.api.ts` (RTK Query) + register in `src/lib/redux/store.ts`
- ⬜ T009 `/admin/ai-studio` page + `TrendList` component (list + manual
  "add trend" form so the pipeline is testable before any scraper exists)

## Phase 1b — Design Director + Telegram approval (P1, depends on Phase 1)

- ⬜ T010 `design_idea` state machine: `src/lib/designIdeaStateMachine.ts`
  (mirrors `orderStateMachine.ts`: `pending_review → approved|rejected`,
  `approved → published`, any → new `design_versions` row on `regenerate`)
- ⬜ T011 `design-ideas.repository.ts` / `design-ideas.service.ts`
  ("Design Director" agent — Gemini prompt using `trends` + `ai_memory`
  context; duplicate check against existing non-rejected ideas)
- ⬜ T012 `telegram.service.ts` (send idea card with inline
  Approve/Reject/Edit/Regenerate/Favorite/Publish buttons — same
  thin-HTTP-client shape as `n8n-whatsapp.service.ts`)
- ⛔ T013 `/api/webhooks/telegram/route.ts` — **blocked**: needs
  `TELEGRAM_BOT_TOKEN` + admin chat ID in `.env.local` (not present today)
- ⬜ T014 `telegram_approval_logs` audit writes on every button action
- ⬜ T015 n8n workflow: `ai-studio-telegram-approval-workflow.json`
  (follow the existing `whatsapp-ai-workflow.json` pattern: webhook →
  validate secret → route to handler)
- ⬜ T016 "Publish" action: write into existing `products` repository
  (`is_active: false` by default) instead of a new table; admin activates
  manually from the existing Products UI

## Phase 2 — Imagery + marketing + ad drafts (P2, depends on Phase 1b)

- ⛔ T017 Decide image-generation provider (Gemini image model vs. a
  dedicated image API) — **blocked on a product decision + possibly a new
  API key**
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
- ⬜ T022 Admin UI: `DesignIdeaBoard` (kanban by status) + `AssetGallery`

## Phase 3 — Analytics feedback loop (P3, depends on Phase 2 shipping + real data)

- ⬜ T023 `analytics.repository.ts` — ingestion endpoint/job for
  campaign performance data (source TBD: manual CSV import first, Meta
  Ads API later)
- ⬜ T024 `ai-memory.repository.ts` / `.service.ts` ("Business Analyst"
  agent — summarizes `analytics` into reusable insight rows)
- ⬜ T025 Wire `ai_memory` into `design-ideas.service.ts` generation prompt
  context (closes the learning loop described in the project context)

## Cross-cutting / hygiene (any phase)

- ⬜ T026 `npx tsc --noEmit` and `npm run build` must stay green after every
  phase (non-negotiable per `AGENTS.md`)
- ⬜ T027 Every new admin page/component follows the bilingual/RTL rules in
  `AGENTS.md` (logical CSS properties, `t(key)` dictionary strings)
- ⬜ T028 Every new API route requires `verifyAdmin()` — no public AI Studio
  endpoints (FR-013)

---

## Summary of Blockers Requiring Admin Input

| # | Blocker | Needed for |
|---|---|---|
| 1 | Telegram bot token + chat ID | T013 (approval webhook) |
| 2 | Trend-source API/scraping access (Pinterest, Etsy, TikTok, Instagram, Google Trends, Reddit, Amazon) | Real (non-manual) trend collection |
| 3 | Image-generation provider decision + credentials | T017–T019 |
| 4 | Meta Ads API access (optional for v1 — drafts don't need it) | Future auto-publish, not blocking Phase 2 |

Nothing above blocks Phase 1, which is fully scaffolded this session.
