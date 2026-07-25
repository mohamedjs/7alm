# Feature Specification: AI Studio — AI-Powered Creative & Marketing Module

**Feature Branch**: `013-ai-studio`

**Created**: 2026-07-25

**Status**: Draft

**Input**: `CLAUDE_PROJECT_CONTEXT.md` — "Create an AI-powered creative and marketing module for a mobile phone case business: trend discovery, AI design ideation, Telegram approval workflow, photorealistic mockup generation, marketing copy, Meta Ads drafts, ad performance analysis, and learning from historical data."

---

## Critical Constraints (from project context)

- NEVER rebuild existing features (products, orders, dashboard, storefront, n8n workflows).
- Inspect the current codebase before changing anything (done — see `plan.md`).
- Extend the existing database using additive migrations only; never replace existing tables.
- Reuse existing services/APIs/workflows (auth, `whatsapp`/n8n patterns, `social` OAuth, Supabase, Gemini).
- Never break backward compatibility with `products`, `orders`, or the storefront.
- Approved design ideas must link to the **existing** `products` table — AI Studio does not introduce a parallel product system.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trend Hunter feeds Design Director (Priority: P1)

An admin wants the system to continuously surface trending phone-case-relevant
design themes (patterns, colors, pop-culture motifs) from Pinterest, Etsy,
TikTok, Instagram, Google Trends, and Reddit, so design ideation starts from
real market signal instead of guesswork.

**Why this priority**: Every downstream step (idea generation, images, ads)
depends on trend data existing. This is the entry point of the whole pipeline
and the smallest independently-shippable slice.

**Independent Test**: Trigger a trend-collection run (manually from the admin
UI or a scheduled n8n workflow); confirm new rows appear in `trends` with a
source, a summary, and a dedup-safe fingerprint, visible in an admin list view.

**Acceptance Scenarios**:

1. **Given** a configured trend source, **When** a collection run executes,
   **Then** new trend records are stored with `source`, `raw_signal`,
   `summary`, `score`, and `collected_at`.
2. **Given** a trend that was already stored yesterday, **When** the same
   signal reappears, **Then** the system updates its recency/score instead of
   creating a duplicate row.

---

### User Story 2 - AI generates design ideas from trends, prevents duplicates (Priority: P1)

An admin wants the AI to turn stored trends into concrete, unique phone-case
design concepts, checked against previously generated ideas so the same
concept isn't proposed twice.

**Why this priority**: This is the creative core of the module and the first
point where the business gets tangible output (an idea worth showing to a
human).

**Independent Test**: Run idea generation against a seeded trend; confirm a
`design_ideas` row is created with a description + prompt draft, and that
re-running against the same trend does not create a near-duplicate (checked
via a similarity/fingerprint check against existing ideas).

**Acceptance Scenarios**:

1. **Given** one or more `trends` rows, **When** the Design Director agent
   runs, **Then** it creates `design_ideas` rows each linked to their source
   trend(s), with status `pending_review`.
2. **Given** an idea whose concept closely matches an existing non-rejected
   idea, **When** generation runs, **Then** the duplicate is either skipped or
   flagged `possible_duplicate` rather than silently inserted.

---

### User Story 3 - Telegram approval workflow (Priority: P1)

An admin (business owner) wants to review new design ideas on Telegram and
Approve / Reject / Edit / Regenerate / Favorite / Publish them from their
phone, without opening the dashboard.

**Why this priority**: This is the explicit human-in-the-loop control point
called out in the project context — nothing should reach image generation,
ads, or the live product catalog without a human decision. Without this, the
rest of the pipeline cannot run safely.

**Independent Test**: Send a pending idea to Telegram; tap "Approve"; confirm
the `design_ideas.status` transitions to `approved` and the action is logged.
Tap "Reject" on another; confirm it transitions to `rejected`.

**Acceptance Scenarios**:

1. **Given** a `pending_review` idea, **When** the admin taps Approve in
   Telegram, **Then** `design_ideas.status` → `approved` and a timestamped
   decision is recorded.
2. **Given** a `pending_review` idea, **When** the admin taps Reject,
   **Then** status → `rejected` and the idea is excluded from future
   duplicate-checks as "already tried."
3. **Given** an idea, **When** the admin taps Regenerate, **Then** a new
   `design_versions` row is created under the same idea and re-sent for
   review; the original version is preserved.
4. **Given** an approved idea, **When** the admin taps Publish, **Then** the
   system creates/links a row in the existing `products` table (draft/inactive
   until the admin explicitly activates it in the existing Products UI).

---

### User Story 4 - Photorealistic mockup & image generation (Priority: P2)

An admin wants an approved idea turned into premium, photorealistic product
photography (studio shots + lifestyle mockups) meeting the Image Standards in
`CLAUDE_PROJECT_CONTEXT.md`, ready to attach to a product and to Meta Ads.

**Why this priority**: Required before a design can become a sellable product
or ad creative, but only runs after human approval (P1), so it is correctly
sequenced second.

**Independent Test**: Trigger generation on an `approved` idea; confirm one or
more `generated_assets` rows are created (transparent PNG studio shot +
lifestyle mockup), each referencing the source `design_versions` row and
passing a basic image QA check (dimensions, background, no obvious artifacts
flagged by the Mockup Director agent).

**Acceptance Scenarios**:

1. **Given** an `approved` design version, **When** image generation runs,
   **Then** `generated_assets` rows are created with `asset_type` (studio /
   lifestyle), `image_url`, and `status = pending_review`.
2. **Given** a generated asset, **When** it fails the quality checklist
   (wrong phone proportions, missing camera cutout, cartoonish style),
   **Then** it is flagged `rejected_qa` and never auto-attached to a product.

---

### User Story 5 - Marketing copy + Meta Ads draft preparation (Priority: P2)

An admin wants AI-drafted marketing copy (headlines, captions, ad copy) and a
ready-to-review Meta Ads draft (not auto-published) for each approved,
imaged design.

**Why this priority**: Converts an approved design into a launch-ready asset
bundle; still gated behind human review before spend.

**Independent Test**: Trigger copy generation on a design with approved
assets; confirm `marketing_content` rows are created, and an `ad_campaigns`
row is created in `status = draft` (never `active`) referencing that content.

**Acceptance Scenarios**:

1. **Given** approved assets, **When** the Marketing Manager agent runs,
   **Then** `marketing_content` rows are created (headline, primary text,
   CTA variants) linked to the design.
2. **Given** marketing content, **When** the Ads Manager agent runs,
   **Then** an `ad_campaigns` row is created in `draft` status with target
   audience/budget suggestions; nothing is submitted to Meta's Ads API
   automatically.

---

### User Story 6 - Ad performance analysis & AI memory feedback loop (Priority: P3)

An admin wants the system to analyze how published designs/ads performed and
feed that back into future trend scoring and idea generation, so the AI
"learns" what sells.

**Why this priority**: This is the long-term learning loop; it depends on
real campaign data existing first (P1–P2 shipped and running for a while),
so it is correctly last.

**Independent Test**: Seed `analytics` with sample performance rows for a
published design; run the Business Analyst agent; confirm `ai_memory` gains
a new entry summarizing what worked, and that a subsequent idea-generation
run's prompt context includes that memory.

**Acceptance Scenarios**:

1. **Given** `analytics` rows for a design (CTR, CPA, ROAS, conversions),
   **When** the Business Analyst agent runs, **Then** an `ai_memory` row is
   created summarizing the learning (e.g. "pastel florals outperform bold
   geometrics for this audience").
2. **Given** existing `ai_memory` rows, **When** the Design Director
   generates new ideas, **Then** the generation prompt incorporates relevant
   memory entries.

### Edge Cases

- What happens when a trend source's API/scraper is unavailable or rate-limited?
  → the run is logged as a partial failure per-source; other sources continue.
- What happens when the AI proposes an idea nearly identical to a **published**
  product already on the storefront? → must be blocked, not just flagged.
- What happens when an admin taps two conflicting Telegram buttons in a race
  (e.g. Approve and Reject in quick succession)? → the state machine only
  accepts the transition valid from the idea's current status; the second tap
  is a no-op with a "already handled" reply.
- What happens if image generation returns a low-quality or non-compliant
  image? → auto-flag `rejected_qa`, never silently attach to a product or ad.
- What happens if Meta Ads credentials are not configured? → `ad_campaigns`
  stays in `draft`; publishing to Meta is a manual, explicitly-confirmed step,
  never automatic (see Assumptions).
- What happens to `ai_memory` as it grows unbounded? → summarized/pruned
  periodically (out of scope for v1; tracked as a follow-up).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST collect trend signals from configurable sources
  (Pinterest, Etsy, TikTok, Instagram, Google Trends, Reddit, Amazon) and
  persist them to `trends` without duplicating unchanged signals.
- **FR-002**: System MUST generate phone-case design ideas from stored trends
  via an AI Design Director agent, persisting each to `design_ideas`.
- **FR-003**: System MUST prevent (or clearly flag) duplicate design ideas
  before they reach human review.
- **FR-004**: System MUST support an Approve / Reject / Edit / Regenerate /
  Favorite / Publish workflow over Telegram for every design idea.
- **FR-005**: System MUST record every Telegram approval decision with actor,
  timestamp, and resulting status transition (audit trail).
- **FR-006**: System MUST only generate product images for ideas that have
  been explicitly approved by a human.
- **FR-007**: Generated images MUST meet the Image Standards in
  `CLAUDE_PROJECT_CONTEXT.md` (photorealistic, studio lighting, correct phone
  proportions/camera cutouts, transparent PNG option, lifestyle mockups);
  non-conforming output MUST be flagged, not auto-published.
- **FR-008**: System MUST generate marketing copy variants per approved,
  imaged design.
- **FR-009**: System MUST prepare Meta Ads drafts in a non-published `draft`
  state; actual ad publication requires an explicit separate confirmation
  step outside this module's automatic scope.
- **FR-010**: System MUST link an approved+published idea to a row in the
  **existing** `products` table rather than creating a parallel catalog.
- **FR-011**: System MUST ingest ad/campaign performance data into
  `analytics` and derive learnings into `ai_memory`.
- **FR-012**: Idea generation MUST be able to incorporate relevant
  `ai_memory` entries as context.
- **FR-013** *(amended 2026-07-25 — see note below)*: No AI Studio API route
  may be public. **Admin-facing** routes (`/api/admin/ai-studio/*`, everything
  the dashboard calls) MUST authenticate via the existing `extractToken` +
  `verifyAdmin()` mechanism. **Machine-to-machine** routes called by n8n MUST
  authenticate via the shared-secret convention already established elsewhere
  in this repo: `x-n8n-access-token` → `N8N_API_ACCESS_TOKEN` for `/api/n8n/*`
  (as the four existing `/api/n8n/*` routes do), and `x-webhook-secret` →
  `N8N_WEBHOOK_SECRET` for `/api/webhooks/n8n/*` (as `order-action` does).

  > **Amendment rationale.** As originally written, FR-013 required
  > `verifyAdmin()` on *every* route, which n8n cannot satisfy — it holds no
  > admin JWT. The shipped n8n-facing routes therefore use shared secrets.
  > This is a **deliberate decision recorded here**, not a violation: SC-005
  > is about regressions to existing functionality, and the convention being
  > followed is the one `/api/webhooks/n8n/order-action` already ships in
  > production. `tasks.md` T028 mirrors this wording.
- **FR-014**: System MUST NOT modify or remove any existing table, column, or
  API route used by `products`, `orders`, `customers`, or `social_connections`.
- **FR-015**: System MUST expose an admin dashboard section
  (`/admin/ai-studio`) to view trends, ideas, versions, assets, and campaign
  drafts without requiring Telegram (Telegram is the fast path, not the only
  path).

### Key Entities *(include if feature involves data)*

- **Trend**: A collected market signal (source, raw payload, AI summary,
  relevance score, timestamp). Feeds idea generation.
- **DesignIdea**: A proposed phone-case concept derived from one or more
  trends; has a review status and links to its `DesignVersion`s.
- **DesignVersion**: A specific iteration of an idea (original or a
  regenerated revision), carrying the prompt used and admin feedback.
- **GeneratedAsset**: An image (studio/lifestyle/transparent PNG) produced
  from an approved design version, with a QA status.
- **MarketingContent**: Copy (headlines, captions, CTAs) generated for an
  approved design.
- **AdCampaign**: A Meta Ads draft (audience, budget, creative references,
  status) tied to marketing content; never auto-published.
- **Analytics**: Performance data ingested for a published design/campaign.
- **AiMemory**: A distilled learning/insight derived from analytics, reused
  as generation context.
- **TelegramApprovalLog** *(sub-entity of DesignIdea)*: Audit trail of every
  Approve/Reject/Edit/Regenerate/Favorite/Publish action.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A trend-to-Telegram-review cycle (collect → generate idea →
  notify admin) completes without manual intervention in under 5 minutes per
  batch.
- **SC-002**: Zero duplicate design ideas reach Telegram review across a
  30-day sample (duplicate-prevention check is effective).
- **SC-003**: 100% of generated images that reach a product listing have
  passed the QA flag check (no `rejected_qa` asset is ever attached to a
  live product).
- **SC-004**: 100% of `ad_campaigns` rows created by the pipeline remain in
  `draft` until an admin explicitly confirms publication — zero automatic ad
  spend.
- **SC-005**: Existing `products`, `orders`, and storefront functionality has
  zero regressions after AI Studio ships (`npx tsc --noEmit` and
  `npm run build` pass; existing admin pages unaffected).

## Assumptions

- ~~Telegram is reused via a new bot (no existing Telegram integration exists
  today); a `TELEGRAM_BOT_TOKEN` / chat ID will need to be provisioned.~~
  **Corrected 2026-07-25:** a live bot and n8n credential already exist
  (`automation-plan.md` §0), so no token needs provisioning and no
  `TELEGRAM_BOT_TOKEN` env var is needed — n8n holds the credential. Only the
  admin **chat id** must be seeded once. Because Telegram allows one webhook
  per bot and `telegram-fb-post-workflow.json` already owns it, the approval
  receiver is a `callback_query` branch on that workflow, not a new
  trigger or a 7alm webhook route (`automation-plan.md` §2).
- Image generation and trend-source scraping require external AI/API
  credentials beyond the existing `GEMINI_API_TOKEN` (e.g. an image-gen
  provider, and API/scraping access for Pinterest/Etsy/TikTok/Instagram/
  Google Trends/Reddit/Amazon). These are **not yet available** and are
  called out explicitly rather than assumed.
- Meta Ads publishing integration (beyond drafting) is out of scope for v1;
  `ad_campaigns` are prepared for a human to manually place via Meta's own
  tools, or a future explicit "publish" action once credentials exist.
- n8n is reused for scheduling/orchestrating recurring jobs (trend collection
  cadence, Telegram webhook handling) following the existing pattern used by
  `whatsapp`/order-notification workflows, rather than introducing a new
  runtime.
- v1 ships incrementally: Trend Hunter + Design Director + Telegram approval
  (P1) first, since everything else depends on a working human-approval gate.
