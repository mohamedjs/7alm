# Feature Specification: AI Studio — Conversational Marketing-Campaign Builder

**Feature Branch**: `013-ai-studio`

**Created**: 2026-07-25

**Pivoted**: 2026-07-26 — see "Scope Pivot" below

**Status**: Backend + DB shipped; frontend + n8n in progress

**Input** *(verbatim user request, 2026-07-26)*:

> "I am looking to build a marketing-focused Telegram chatbot. Based on my
> input — for example, asking what is currently trending in a specific niche —
> the AI will automatically conduct a standard web search... gather all the
> search results and immediately suggest a marketing campaign based on that
> data. The chatbot and I will converse back and forth until we agree on a
> final campaign. Once I approve it, the campaign details should automatically
> reflect in my personal dashboard. From there, I can either review it and
> manually launch the campaign on platforms like WhatsApp and Instagram, or I
> can instruct the chatbot to automatically create the campaign on Facebook and
> Instagram via an automated workflow."

---

## Scope Pivot (2026-07-26)

This spec previously described a **trend → LLM design idea → Telegram approval
card (4 inline buttons) → draft product** pipeline. That pipeline was built and
shipped, then **replaced entirely** by the conversational campaign builder
described above. It is **not** a parallel system — the trend/design-idea
feature is gone from the app.

### The three scope decisions taken before implementation

1. **Facebook/Instagram publishing = organic auto-posts only.** "Automatically
   create the campaign on Facebook and Instagram" is satisfied by the *existing*
   FB/IG posting tools already live in
   `automation/telegram-fb-post-workflow.json`. Real **paid Meta Ads campaigns**
   (Marketing API — budget, targeting, spend) are an explicit **future phase**
   and are not built.
2. **Web search = an OpenRouter web-enabled/online model**, reusing the existing
   OpenRouter credential. No new search-API account (SerpApi, Perplexity, Brave,
   etc.) is provisioned.
3. **This replaces the trend→design-idea pipeline.** One Telegram bot, one
   conversational agent, one campaign artifact.

### What was removed from the app

App code for `trends`, `design_ideas`, `design_versions`, `generated_assets`,
`marketing_content`, `ai_memory`, and `telegram_approval_logs` — repositories,
services, API routes, admin components, the `designIdeaStateMachine`, the two
`ai-studio-*` n8n workflows, and the corresponding shared types — was deleted.

**The tables themselves were deliberately left in place**, empty and dormant.
Rationale: dropping tables is hard to reverse, deleting app code is cheap. If a
future design-idea flow returns, the schema is still there.

---

## Critical Constraints

- NEVER rebuild existing features (products, orders, dashboard, storefront, the
  existing n8n workflows).
- Extend the existing database using additive/widening migrations only; never
  drop an existing table.
- Reuse the existing Telegram bot, the existing OpenRouter credential, and the
  existing FB/IG publishing tools — do not provision parallel infrastructure.
- Never break backward compatibility with `products`, `orders`, or the
  storefront. In particular, the FB/IG/TikTok posting path inside
  `telegram-fb-post-workflow.json` is **live production** and must keep working.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Owner asks what's trending in a niche; agent researches (Priority: P1)

The store owner messages the Telegram bot in Egyptian Arabic — e.g. "إيه
الترند في جرابات الموبايل دلوقتي؟" — and the agent performs a live web search
and comes back with a synthesized summary of what it found.

**Why this priority**: Research is the input to every campaign. Without it the
agent is guessing, which is exactly what the owner asked to eliminate.

**Independent Test**: Send a niche question in Telegram; confirm the agent
invokes its `search_web` tool and its reply contains findings that are not in
the product catalog or its system prompt.

**Acceptance Scenarios**:

1. **Given** an owner message naming a niche, **When** the agent runs,
   **Then** it calls `search_web` and grounds its reply in the returned results.
2. **Given** a search that returns nothing useful, **When** the agent replies,
   **Then** it says so plainly rather than fabricating trends.

---

### User Story 2 — Agent proposes a campaign; owner negotiates it (Priority: P1)

Immediately after research, the agent proposes a concrete marketing campaign
(name, objective, headline, primary text, CTA, hashtags, audience). The owner
replies with changes — "خلي الهيدلاين أقصر", "غيّر الجمهور للشباب" — and the
agent revises and re-presents. This repeats until they agree.

**Why this priority**: The back-and-forth *is* the feature. A one-shot
suggestion with an accept/reject button is a different product than what was
asked for.

**Independent Test**: After a research turn, send two rounds of change
requests; confirm each reply carries the full revised campaign with the
requested change applied and the untouched fields preserved.

**Acceptance Scenarios**:

1. **Given** research results, **When** the agent proposes, **Then** the
   proposal includes name, objective, headline, primary text, CTA, and hashtags
   as readable chat text (not JSON).
2. **Given** a proposed campaign, **When** the owner requests a change,
   **Then** the agent revises only that part and re-presents the whole campaign.
3. **Given** the conversation spans several turns, **When** the owner refers to
   "the one before", **Then** the agent has that context — conversation memory
   is keyed per Telegram chat id inside n8n, not in the database.

---

### User Story 3 — Owner approves in chat; campaign lands in the dashboard (Priority: P1)

The owner types an approval — "تمام", "أوكي", "انشر", "موافق" — and the agent
persists the agreed campaign. It then appears in `/admin/ai-studio`.

**Why this priority**: This is the human-in-the-loop gate and the bridge from
chat to the dashboard. Nothing is persisted or published without it.

**Independent Test**: Approve a negotiated campaign in chat; confirm exactly one
new `ad_campaigns` row exists with `status = 'ready'` and the negotiated field
values, and that it renders in the admin dashboard.

**Acceptance Scenarios**:

1. **Given** an agreed campaign, **When** the owner sends an explicit approval,
   **Then** the agent calls `save_campaign` once and confirms in chat.
2. **Given** the owner's message is ambiguous between "approve" and "change
   this", **When** the agent processes it, **Then** it asks for confirmation
   instead of saving.
3. **Given** a saved campaign, **When** the admin opens `/admin/ai-studio`,
   **Then** the campaign is listed with its status and full copy.

---

### User Story 4 — Owner launches manually, or instructs the agent to auto-post (Priority: P1)

From the dashboard the admin reviews the campaign and launches it by hand on
WhatsApp/Instagram; **or**, in the same Telegram conversation, tells the agent
to publish it to Facebook and Instagram, which it does with the FB/IG tools it
already has.

**Why this priority**: The user request explicitly names both paths. Neither is
optional.

**Independent Test (manual path)**: Mark a campaign `published` from the
dashboard; confirm the status persists. **(auto path)**: instruct the agent to
publish; confirm the FB/IG tools fire and the campaign is saved with
`status = 'published'`.

**Acceptance Scenarios**:

1. **Given** a `ready` campaign, **When** the admin marks it published or
   archived in the dashboard, **Then** `ad_campaigns.status` updates.
2. **Given** an approved campaign, **When** the owner asks the agent to post it
   to Facebook and Instagram, **Then** the agent runs the existing publish tools
   and only claims success after they actually succeed.
3. **Given** the agent published in the same turn as approval, **When** it saves
   the campaign, **Then** it sends `status = "published"`; otherwise the server
   default `"ready"` applies.

### Edge Cases

- **Web search unavailable / model has no live access** → the agent says it
  could not research rather than inventing trends.
- **Owner abandons the conversation mid-negotiation** → nothing is written.
  Only an explicit approval produces a row; there is no draft persistence.
- **Owner approves twice, or the tool call is retried** → **a duplicate
  `ad_campaigns` row is created.** `saveApprovedCampaign` is always a fresh
  INSERT with no dedup (the old `concept_fingerprint` mechanism was deleted with
  the design-idea pipeline). Mitigated only by the agent's "once per approval"
  prompt rule. Tracked as deferred — see Assumptions.
- **Ambiguous approval** → the agent asks for confirmation before saving or
  publishing (a rule already proven in the same agent's FB-post path).
- **Instagram publish requested with no image** → the agent refuses for
  Instagram and says so; Instagram cannot take a text-only post.
- **TikTok** → publishable by the agent's existing `publish_tiktok_post` tool,
  but **not representable as a campaign `platform`** (the CHECK allows only
  `meta | facebook_instagram | whatsapp`). Acceptable: campaigns are a Meta/
  WhatsApp concept here.
- **`N8N_API_ACCESS_TOKEN` unset on the deployed app** → `save_campaign`
  receives a **503** and no campaign is ever persisted. See `tasks.md` T052.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let the store owner start a marketing
  conversation from Telegram by naming a niche or a question, in Egyptian
  Arabic, with no command syntax.
- **FR-002**: The system MUST perform a live web search for that niche using an
  OpenRouter web-enabled/online model on the existing OpenRouter credential —
  no new search-provider account.
- **FR-003**: The system MUST synthesize the search results into a concrete
  proposed campaign containing at minimum: name, niche, objective, headline,
  primary text, CTA, and hashtags.
- **FR-004**: The system MUST support unbounded conversational refinement of the
  proposal, preserving unmodified fields across revisions, with per-chat
  conversation memory held in n8n.
- **FR-005**: The system MUST persist a campaign **only** on an explicit owner
  approval in chat, and MUST ask for confirmation when the message is ambiguous.
- **FR-006**: Approval MUST be expressed as free-text chat, **not** Telegram
  inline buttons — see "Approval Model" below.
- **FR-007**: A persisted campaign MUST appear in the admin dashboard at
  `/admin/ai-studio` without any Telegram involvement.
- **FR-008**: The admin MUST be able to change a campaign's status
  (`ready → published | archived`) from the dashboard, to record a manual
  WhatsApp/Instagram launch.
- **FR-009**: On the owner's instruction, the agent MUST be able to publish the
  approved campaign as **organic posts** to Facebook and Instagram using the
  publish tools already live in `telegram-fb-post-workflow.json`, and MUST NOT
  claim success unless the tools succeeded.
- **FR-010**: No AI Studio API route may be public.
  **Admin-facing** routes (`/api/admin/ai-studio/*`) MUST use `extractToken` +
  `verifyAdmin()`. The **machine-to-machine** route called by n8n
  (`POST /api/n8n/ai-studio/campaigns`) MUST use the established
  `x-n8n-access-token` → `N8N_API_ACCESS_TOKEN` shared-secret convention, as the
  other `/api/n8n/*` routes do.
  *(This supersedes the older FR-013 and its amendment. The
  `x-webhook-secret` → `/api/webhooks/n8n/ai-studio/*` half no longer applies —
  that route was deleted with the design-idea pipeline.)*
- **FR-011**: The system MUST NOT modify or remove any existing table, column,
  or API route used by `products`, `orders`, `customers`, or
  `social_connections`, and MUST NOT alter the existing FB/IG/TikTok posting
  behaviour of `telegram-fb-post-workflow.json`.

### Approval Model — chat-driven, no inline buttons

Campaign approval happens by the owner **typing** an approval ("تمام", "انشر",
"موافق", "okay") in the ongoing conversation. There are **no Telegram inline
keyboard buttons** for campaigns.

**Primary reason — buttons don't fit a negotiation.** The user asked for
"converse back and forth until we agree on a final campaign." A fixed button set
attached to a card can only express a decision on *that* card; it cannot carry
"make the headline shorter." Every revision would need a new card, and the
approved artifact would be whichever card the owner happened to tap — not the
one they actually agreed to in conversation.

**Corroboration — the pattern is already proven in this repo.** The
`Generate FB Post` agent in `automation/telegram-fb-post-workflow.json` gates
live Facebook/Instagram/TikTok publishing on exactly this mechanism today: its
system prompt forbids publishing before an explicit typed approval of the latest
draft. Campaign approval reuses that proven gate rather than introducing a
second, different approval mechanism into the same bot.

**Tradeoff — less deterministic than a button tap.** Free text must be
classified as approval vs. revision by the model. Accepted, because it is what
the user explicitly asked for, and because the existing prompt already carries
two mitigations that the campaign flow inherits:

- ambiguity is escalated, not guessed — *"لو رسالته مش واضحة هل هي موافقة ولا
  طلب تعديل، اسأله يأكد قبل النشر"*;
- publishing is once-per-approval — *"انشر مرة واحدة بس لكل موافقة"*.

The residual risk is a duplicate `ad_campaigns` row on a repeated approval,
which is visible and archivable in the dashboard rather than destructive.

### Key Entities

- **AdCampaign** — the single artifact this feature produces: a marketing
  campaign negotiated in chat and approved by the owner. Carries the niche and
  objective, the research summary the agent based it on, the ad copy (headline,
  primary text, CTA, hashtags), an optional target audience and platform, a
  status, and the Telegram chat id it came from.

**Dormant** (tables exist, no app code reads or writes them): `trends`,
`design_ideas`, `design_versions`, `generated_assets`, `marketing_content`,
`ai_memory`, `telegram_approval_logs`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A niche question in Telegram returns a research-grounded campaign
  proposal in a single conversational turn, with no dashboard interaction.
- **SC-002**: An approved campaign is visible in `/admin/ai-studio` with its
  full negotiated copy — the "reflect in my personal dashboard" requirement.
- **SC-003**: Nothing is persisted or published without an explicit owner
  approval turn in chat.
- **SC-004** *(rewritten 2026-07-26)*: **Zero paid ad spend** — no Meta
  Marketing API integration exists in this feature at all, so no code path can
  create a paid campaign or set a budget. Publishing is limited to organic
  Facebook/Instagram posts, and only on an explicit owner instruction.
  *(Previously: "all `ad_campaigns` rows remain in `draft` until an admin
  confirms publication." That is now false — the shipped route defaults `status`
  to `"ready"` and accepts `"published"`. The safety property that actually
  holds is the one stated above.)*
- **SC-005**: Existing `products`, `orders`, storefront, and the live FB/IG/
  TikTok posting flow have zero regressions (`npx tsc --noEmit` and
  `npm run build` pass; the FB-post branch of the Telegram workflow is
  unchanged in behaviour).

## Assumptions

- The Telegram bot, its n8n `telegramApi` credential, and the OpenRouter
  credential all already exist and are proven in production — nothing new is
  provisioned. See `automation-plan.md` §0.
- Telegram permits one webhook per bot, and the existing FB-post workflow owns
  it. The campaign agent therefore lives **inside that same workflow**, not in a
  new one. See `automation-plan.md` §2.
- Conversation state lives in n8n's per-chat memory. The database stores only
  approved outcomes — there is no campaign "session" or draft table, and
  therefore no resume-after-restart guarantee for an in-flight negotiation.
- Campaign dedup is **not implemented**. One approval turn = one INSERT. A
  repeated approval yields a duplicate row; archiving it in the dashboard is the
  remedy.

## Explicitly Out of Scope / Deferred

None of the following changed in this session, and none is built:

- **Real paid Meta Ads campaigns** (Marketing API): budget, targeting, bidding,
  spend, campaign/adset/ad object creation, `daily_budget` and
  `external_campaign_id` are columns on `ad_campaigns` but nothing populates
  them. This is the named future phase.
- **WhatsApp broadcast / bulk send**: only single-recipient send exists, via the
  pre-existing `src/features/whatsapp/whatsapp.service.ts` → n8n path. A
  campaign with `platform = 'whatsapp'` is a *record* of intent; the owner
  launches it manually.
- **Analytics ingestion and the learning loop**: no `analytics` writes, no
  `ai_memory` distillation, no performance feedback into future campaigns.
- **Image generation** for campaign creative: campaigns reuse existing product
  imagery through the existing publish tools; nothing generates new assets.
- **The trend → design-idea → product pipeline**: removed, not paused. See
  "Scope Pivot".
