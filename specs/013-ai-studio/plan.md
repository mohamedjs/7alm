# Implementation Plan: AI Studio — AI-Powered Creative & Marketing Module

**Spec:** 013-ai-studio
**Date:** 2026-07-25

---

## Architecture Approach

AI Studio is a **new bounded context** (`ai-studio`) that sits alongside the
existing domains and follows the same 4-layer pattern used everywhere else in
the repo (Repository → Service → API Route → RTK Query/Hooks). It reuses,
rather than replaces:

- `src/lib/supabase.ts` for all data access (new `*.repository.ts` files only)
- `src/lib/auth.ts` (`verifyAdmin`) for every new **admin-facing** API route;
  machine-to-machine n8n routes use the shared-secret convention instead —
  see the FR-013 amendment in `spec.md`
- the n8n integration pattern already proven by `whatsapp`/order-notification
  workflows, for scheduling trend-collection runs and handling the Telegram
  webhook
- `GEMINI_API_TOKEN` for text-generation agents (trend summarization, idea
  generation, marketing copy, analytics insight)
- the existing `products` table as the single source of truth for anything
  sellable — AI Studio never introduces a parallel catalog

Because the full pipeline (8 agents, external trend APIs, image generation,
Meta Ads) is large, it ships in **phases**, each an independently working
slice per `spec.md`'s prioritized user stories. Phase 1 (this session's
scaffolding) covers the data model, shared types, and the Trend Hunter
repository/service slice as a concrete pattern for the remaining agents to
follow.

```
┌──────────────────────────────────────────────────────────────────┐
│ Pages (Phase 1: stub / Phase 2: full)                             │
│ └── /admin/ai-studio/page.tsx          (NEW — trends/ideas list)  │
├──────────────────────────────────────────────────────────────────┤
│ Components                                                        │
│ ├── TrendList.tsx                      (NEW)                     │
│ ├── DesignIdeaBoard.tsx                (NEW)                     │
│ └── AssetGallery.tsx                   (NEW)                     │
├──────────────────────────────────────────────────────────────────┤
│ Features (Client)                                                 │
│ ├── ai-studio/ai-studio.api.ts         (NEW — RTK Query)         │
│ └── ai-studio/ai-studio.hooks.ts       (NEW)                      │
├──────────────────────────────────────────────────────────────────┤
│ Features (Server) — one repository+service pair per agent domain  │
│ ├── ai-studio/ai-studio.repository.ts  (NEW — Phase 1, shipped)  │
│ ├── ai-studio/ai-studio.service.ts     (NEW — Phase 1, "Trend    │
│ │                                        Hunter" + "Market        │
│ │                                        Research" agents)        │
│ │   ^ shipped as `ai-studio.*`, not the `trends.*` originally     │
│ │     planned here; the names below are still aspirational        │
│ ├── ai-studio/design-ideas.repository.ts     (Phase 1b)          │
│ ├── ai-studio/design-ideas.service.ts        (Phase 1b, "Design   │
│ │                                              Director" agent)   │
│ ├── ai-studio/telegram.service.ts   (SUPERSEDED — outbound send   │
│ │                                    lives in n8n, automation-    │
│ │                                    plan.md §2; see tasks T012)  │
│ ├── ai-studio/generated-assets.repository.ts (Phase 2, "Prompt    │
│ │                                              Engineer" +        │
│ │                                              "Mockup Director") │
│ ├── ai-studio/marketing-content.repository.ts(Phase 2, "Marketing │
│ │                                              Manager")          │
│ ├── ai-studio/ad-campaigns.repository.ts     (Phase 2, "Ads       │
│ │                                              Manager")          │
│ ├── ai-studio/analytics.repository.ts        (Phase 3, "Business  │
│ │                                              Analyst")          │
│ └── ai-studio/ai-memory.repository.ts        (Phase 3)           │
├──────────────────────────────────────────────────────────────────┤
│ API Routes                                                        │
│ ├── /api/admin/ai-studio/trends/route.ts         (NEW — Phase 1) │
│ ├── /api/admin/ai-studio/trends/collect/route.ts (NEW — Phase 1, │
│ │                                                  triggered by    │
│ │                                                  n8n schedule)   │
│ ├── /api/admin/ai-studio/ideas/route.ts          (NEW — Phase 1b)│
│ ├── /api/n8n/ai-studio/{ideas,trends}/route.ts   (NEW — n8n read │
│ │                                    + Director sink, shared     │
│ │                                    secret, not verifyAdmin)    │
│ ├── /api/webhooks/n8n/ai-studio/idea-action/route.ts  (NEW)      │
│ ├── /api/webhooks/telegram/route.ts   (SUPERSEDED — a second     │
│ │                                    telegramTrigger would steal │
│ │                                    the bot's only webhook;     │
│ │                                    receiver is an n8n branch)  │
│ └── ... (assets/marketing/ads/analytics routes — Phase 2/3)      │
├──────────────────────────────────────────────────────────────────┤
│ Database (additive only — see migration file)                     │
│ ├── trends                              (NEW)                     │
│ ├── design_ideas                        (NEW)                     │
│ ├── design_versions                     (NEW)                     │
│ ├── generated_assets                    (NEW)                     │
│ ├── marketing_content                   (NEW)                     │
│ ├── ad_campaigns                        (NEW)                     │
│ ├── analytics                           (NEW)                     │
│ ├── ai_memory                           (NEW)                     │
│ └── telegram_approval_logs              (NEW)                     │
├──────────────────────────────────────────────────────────────────┤
│ n8n                                                                │
│ ├── ai-studio-trend-collection-workflow.json   (deferred — no    │
│ │                                    scraper credentials exist)  │
│ ├── ai-studio-idea-dispatcher-workflow.json    (NEW, shipped)    │
│ ├── ai-studio-design-director-workflow.json    (NEW, Phase 1b)   │
│ └── telegram-fb-post-workflow.json — callback_query branch       │
│     (the approval receiver; NOT a standalone workflow)           │
└──────────────────────────────────────────────────────────────────┘
```

## Why this shape

- **One repository/service pair per agent domain**, not one giant
  `ai-studio.service.ts`. This directly satisfies the project-context
  instruction: *"Claude should create separate services/modules for each
  responsibility."* Agents map to files as:

  | Agent | Primary file(s) |
  |---|---|
  | Trend Hunter | `trends.repository.ts` / `trends.service.ts` (collection) |
  | Market Research | `trends.service.ts` (scoring/summarization) |
  | Design Director | `design-ideas.repository.ts` / `design-ideas.service.ts` |
  | Prompt Engineer | `generated-assets.service.ts` (prompt construction) |
  | Mockup Director | `generated-assets.service.ts` (image QA gate) |
  | Marketing Manager | `marketing-content.repository.ts` / `.service.ts` |
  | Ads Manager | `ad-campaigns.repository.ts` / `.service.ts` |
  | Business Analyst | `analytics.repository.ts` + `ai-memory.repository.ts` / `.service.ts` |

- **Telegram as its own service** (`telegram.service.ts`), mirroring how
  `whatsapp.service.ts` wraps an external messaging channel — same shape,
  different provider.
- **State machine reused conceptually**: `design_ideas.status` follows the
  same pattern as `src/lib/orderStateMachine.ts` (`pending_review → approved
  | rejected`, `approved → published`). A new
  `src/lib/designIdeaStateMachine.ts` will be added in Phase 1b so the
  Telegram buttons and the admin UI share one source of truth for valid
  transitions — exactly like `OrdersTable` reads `orderStateMachine.ts`.
- **No parallel product system**: "Publish" writes into the existing
  `products` table (as `is_active = false` initially) via the existing
  `products.repository.ts`, not a new table.

## File Change Map (Phase 1 — this session)

### New Files

| File | Layer | Purpose |
|---|---|---|
| `specs/013-ai-studio/spec.md` | Docs | Feature spec |
| `specs/013-ai-studio/plan.md` | Docs | This file |
| `specs/013-ai-studio/tasks.md` | Docs | Phased task breakdown |
| `docs/migrations/20260725120000_ai_studio_core.sql` | DB | New tables (not applied — see below) |
| `src/features/shared/types.ts` | Types | AI Studio entity types (appended) |
| `src/features/ai-studio/ai-studio.repository.ts` | Server | Trend Hunter data access (Phase 1 slice) |
| `src/features/ai-studio/ai-studio.service.ts` | Server | Trend Hunter + duplicate-fingerprint logic |

### Explicitly Deferred (Phase 1b+, not touched this session)

API routes, RTK Query, admin UI pages/components, Telegram webhook, n8n
workflow JSON, image generation, Meta Ads integration, analytics ingestion —
see `tasks.md` for sequencing and the credentials each phase blocks on.

## Database Migration Policy

The migration SQL was **drafted but not executed** in the authoring session.
**Correction:** Supabase MCP *is* available in this environment, and
`list_tables` confirms **none of the 9 AI Studio tables exist yet**. The
migration will therefore be applied via `mcp__supabase__apply_migration`
(tasks.md T006) rather than pasted into the Supabase SQL Editor by hand.
`docs/migrations/20260725120000_ai_studio_core.sql` stays the checked-in
source of truth, per the existing `docs/migrations/` convention.

**One edit is required before it is applied:** add `UNIQUE
(concept_fingerprint)` to `design_ideas` (tasks.md T029) — the file currently
creates only an index, and `getByConceptFingerprint()` calls `.single()`
against it. Schema changes are irreversible-by-default, so the `UNIQUE` goes
in first, not as a follow-up.

## Open Blockers (credentials/decisions needed before Phase 1b+ can run for real)

**Unblocked since this plan was written** (see `automation-plan.md` §0 for the
credential IDs):

1. ~~**Telegram bot token + admin chat ID**~~ — a live bot and the
   `telegramApi` credential `AsXbM9hYArJ88apL` already exist and are proven by
   `telegram-fb-post-workflow.json`. Only the admin **chat id** still needs
   seeding once from an inbound update (tasks.md T034).
2. ~~**LLM access**~~ — Gemini (`pj3wNPsZG5Yic3Ho`), OpenRouter
   (`EbbUdiq5aCjllGWD`) and the Supabase Postgres credential are all live.
3. ~~**Supabase migration access**~~ — MCP available; see above.

**Still blocked:**

4. **Trend-source access** — Pinterest/Etsy/TikTok/Instagram/Google
   Trends/Reddit/Amazon each need either an official API key or an agreed
   scraping approach (ToS-compliant). **None configured today** → the first
   cut degrades to the manual "add trend" form.
5. **Image generation provider** — `GEMINI_API_TOKEN` exists (good for text
   agents) but photorealistic 8K product photography needs a decision on
   provider (e.g. Gemini image models, or a dedicated image-gen API) plus a
   quality-gate implementation for the Image Standards checklist.
6. **Meta Ads API access** — needed only for the (out-of-scope-for-v1)
   auto-publish step; drafting doesn't require it.

**Verify, not blocked:** the two n8n secret values — `.env.local` has no
`N8N_API_ACCESS_TOKEN` (so `requireN8nAccess` 503s) and defines a
`N8N_WEBHOOK_SECRET` that differs from the `123456` the live workflows send.
Confirm against the deployed Railway env before wiring anything (T034).

Neither remaining blocker stops the first cut — trend → LLM idea → Telegram →
approve → publish → `products` — which uses only credentials that already
exist.
