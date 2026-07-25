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
- `src/lib/auth.ts` (`verifyAdmin`) for every new API route
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
│ ├── ai-studio/trends.repository.ts     (NEW — Phase 1)           │
│ ├── ai-studio/trends.service.ts        (NEW — Phase 1, "Trend    │
│ │                                        Hunter" + "Market        │
│ │                                        Research" agents)        │
│ ├── ai-studio/design-ideas.repository.ts     (Phase 1b)          │
│ ├── ai-studio/design-ideas.service.ts        (Phase 1b, "Design   │
│ │                                              Director" agent)   │
│ ├── ai-studio/telegram.service.ts            (Phase 1c)          │
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
│ ├── /api/webhooks/telegram/route.ts              (NEW — Phase 1c)│
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
│ ├── ai-studio-trend-collection-workflow.json   (NEW, Phase 1)    │
│ └── ai-studio-telegram-approval-workflow.json  (NEW, Phase 1c)   │
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

Per the safety rules for this task: the migration SQL is **drafted but not
executed** against the live Supabase project this session (no Supabase MCP
connection is available in this environment, and schema changes are
irreversible-by-default). The admin should review
`docs/migrations/20260725120000_ai_studio_core.sql` and run it via the
Supabase SQL Editor when ready — same manual-apply convention already used
for every prior migration in `docs/migrations/`.

## Open Blockers (credentials/decisions needed before Phase 1b+ can run for real)

1. **Telegram bot token + admin chat ID** — not present in `.env.local`.
2. **Trend-source access** — Pinterest/Etsy/TikTok/Instagram/Google
   Trends/Reddit/Amazon each need either an official API key or an agreed
   scraping approach (ToS-compliant). None configured today.
3. **Image generation provider** — `GEMINI_API_TOKEN` exists (good for text
   agents) but photorealistic 8K product photography needs a decision on
   provider (e.g. Gemini image models, or a dedicated image-gen API) plus a
   quality-gate implementation for the Image Standards checklist.
4. **Meta Ads API access** — needed only for the (out-of-scope-for-v1)
   auto-publish step; drafting doesn't require it.

None of these block Phase 1 (trend storage + duplicate-safe idea scaffolding
+ spec/plan/migration draft), which is what ships this session.
