# Feature Specification: Campaign Video Generation

**Feature Branch**: `015-ops-video-campaigns`
**Created**: 2026-07-28
**Extends**: `specs/014-campaign-image-generation/` — same Telegram marketing agent, same approval discipline, same URL-not-bytes contract. This spec is additive.
**Status**: Implemented (migration applied, backend + Telegram wiring complete).

**Requirement** *(as settled with the user)*:

> Add campaign video generation to the Telegram marketing agent. Use
> `bytedance/seedance-2.0` on OpenRouter (same account as images). Video
> generation is asynchronous and significantly more expensive than images,
> so the agent must require explicit owner request before invoking.

### Settled decisions — do not re-litigate

| Question | Decision |
|---|---|
| Vendor / model | **OpenRouter `bytedance/seedance-2.0`** — same account as images, no new vendor. |
| Sync vs async | **Async (submit → callback → poll fallback).** Video takes minutes; the agent's tool-result channel is one-shot and cannot wait. |
| Delivery to owner | **OpenRouter callback → Telegram `sendVideo` directly.** The agent cannot poll; the callback route is the only place that knows the video is ready. |
| Cost discipline | **Prompt-level explicit-request gate + server-side cost logging.** No hard cap in this cut (matches spec 014's stance on images). |
| Persistence | **New `ai_video_jobs` table.** One row per generation request. The final video URL is stored on the row, not on `ad_campaigns` (a campaign can have many video attempts; only the approved one would ever be linked, and that linkage is out of scope here). |
| Callback auth | **Optional HMAC signature verification** via `OPENROUTER_WEBHOOK_SECRET`. If unset, the route accepts unsigned callbacks — the only mutation is completing a video job row, and the callback URL is not enumerable. |

---

## 0. The async constraint — read this first

Unlike image generation (synchronous, returns a URL in the same HTTP
response), video generation on OpenRouter is **asynchronous**:

1. `POST /api/v1/videos` → returns `{ id, polling_url, status: "pending" }` immediately (HTTP 202).
2. The job runs for **minutes** on OpenRouter's side.
3. On completion, OpenRouter POSTs to the `callback_url` we supplied.
4. Alternatively, poll `GET /api/v1/videos/{jobId}` until `status: "completed"`.

The agent's `httpRequestTool` is **one-shot**: it makes one HTTP call and
returns the response to the agent's context. It cannot poll. So the
tool returns the job id immediately, and the video is delivered to the
owner **out-of-band** via the OpenRouter callback, which sends a
Telegram `sendVideo` directly to the owner's chat.

This is the single most important architectural difference from spec 014,
and it drives every design choice below.

---

## 1. The OpenRouter video API contract

Verified against OpenRouter's live docs (2026-07-28):

### Submit

```
POST https://openrouter.ai/api/v1/videos
Authorization: Bearer <OPENROUTER_API_KEY>
Content-Type: application/json

{
  "model": "bytedance/seedance-2.0",
  "prompt": "<cinematic English description>",
  "callback_url": "https://7alm-pro.up.railway.app/api/webhooks/openrouter/video",
  "frame_images": [                              // omit for text-to-video
    { "type": "image_url", "image_url": { "url": "https://…/previous.mp4" } }
  ]
}
```

Response (HTTP 202):
```json
{
  "id": "job-abc123",
  "polling_url": "https://openrouter.ai/api/v1/videos/job-abc123",
  "status": "pending"
}
```

### Poll

```
GET https://openrouter.ai/api/v1/videos/{jobId}
Authorization: Bearer <OPENROUTER_API_KEY>
```

Response (terminal state):
```json
{
  "id": "job-abc123",
  "status": "completed",
  "generation_id": "gen-xyz789",
  "unsigned_urls": [
    "https://storage.openrouter.ai/…/video.mp4"
  ],
  "usage": { "cost": 0.50 }
}
```

- `unsigned_urls` are **temporary** — we must download and store the video
  ourselves (same URL-not-bytes contract as images, spec 014 §0).
- Terminal statuses: `completed`, `failed`, `cancelled`, `expired`.

### Callback webhook

When a job reaches a terminal state, OpenRouter POSTs to `callback_url`:

```json
{
  "type": "video.generation.completed",
  "created_at": "2026-07-28T12:00:00.000Z",
  "data": {
    "id": "job-abc123",
    "status": "completed",
    "generation_id": "gen-xyz789",
    "unsigned_urls": ["https://…/video.mp4"],
    "usage": { "cost": 0.50 }
  }
}
```

- Header `X-OpenRouter-Signature: t=<timestamp>,v1=<hmac>` — present if a
  workspace signing secret is configured.
- Header `X-OpenRouter-Idempotency-Key: <job_id>-<status>` — for retry
  deduplication. Our service is idempotent on its own (terminal status is
  a no-op), so we don't rely on this header.

---

## 2. Data model

**New table `ai_video_jobs`** (migration `20260728000000_ai_video_jobs.sql`):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `campaign_id` | uuid FK→`ad_campaigns(id)` ON DELETE CASCADE | Optional. A campaign can have many video attempts. |
| `prompt` | text NOT NULL | The prompt submitted to OpenRouter. |
| `previous_video_url` | text | For refinement (image-to-video mode). Host-allowlisted. |
| `openrouter_job_id` | text | OpenRouter's job id, for polling. |
| `status` | text CHECK IN (`pending`,`in_progress`,`completed`,`failed`,`cancelled`,`expired`) | |
| `video_url` | text | Public https URL of the stored video, once `completed`. |
| `cost` | numeric | From `usage.cost`. |
| `error` | text | Error message on failure. |
| `telegram_chat_id` | text | The chat to notify on completion. |
| `created_at` / `updated_at` / `completed_at` | timestamptz | |

**Why a new table, not a column on `ad_campaigns`:** A campaign can have
multiple video generation attempts (the owner refines, regenerates, tries
a different angle). Only the approved one would ever be linked to the
campaign row, and that linkage is out of scope here. A jobs table also
models the async lifecycle cleanly — a column on `ad_campaigns` would
conflate "the campaign's chosen video" with "a generation in progress".

**Orphaned storage objects are accepted**, same tradeoff as images (spec
014 §5). Every rejected iteration leaves a video file in the bucket.
Videos are larger than images (~5-20 MB each), so this is more noticeable
on a bill — add a GC job if it ever shows up.

---

## 3. Backend

### Service: `src/features/ai-studio/videos.service.ts`

`VideosService`:
- `submit(input)` — POST to OpenRouter, persist the job, return `{ job, pollingUrl }`.
- `pollAndUpdate(job)` — poll OpenRouter for one job, update the row. Used by the poll-fallback endpoint.
- `handleCallback(payload)` — idempotent status update from an OpenRouter webhook. On `completed`: download → store in Supabase Storage → update row → send Telegram `sendVideo`.
- `downloadAndStore(unsignedUrl)` — fetches the video bytes, uploads to bucket `7alm` prefix `ai-studio/videos/`, returns the public https URL.
- `notifyTelegram(job)` — sends `sendVideo` to `telegram_chat_id` via the Bot API. No-op if `TELEGRAM_BOT_TOKEN` is unset.

### Routes

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/n8n/ai-studio/videos` | `requireN8nAccess` | Agent's `generate_campaign_video` tool. Submit a job, return `{ job_id, status, polling_url }` immediately. |
| `GET /api/n8n/ai-studio/videos/[id]` | `requireN8nAccess` | Status check for a single job. |
| `GET /api/n8n/ai-studio/videos/pending` | `requireN8nAccess` | Poll-fallback: returns stale jobs (>2 min in `pending`/`in_progress`) and proactively polls OpenRouter for each. Called by an n8n cron workflow, not the agent. |
| `POST /api/webhooks/openrouter/video` | Optional HMAC | OpenRouter callback receiver. Verifies `X-OpenRouter-Signature` if `OPENROUTER_WEBHOOK_SECRET` is set. |

### Repository: `src/features/ai-studio/videos.repository.ts`

Standard Supabase queries: `create`, `getById`, `getByOpenrouterJobId`,
`listByStatus`, `listStale`, `updateStatus` (idempotent — terminal status
is a no-op on re-application).

---

## 4. Telegram wiring

### New tool: `generate_campaign_video`

`httpRequestTool` node in `telegram-fb-post-workflow.json`, mirroring
`generate_campaign_image`'s shape:
- POST `/api/n8n/ai-studio/videos`
- Header `x-n8n-access-token: 123456` (existing repo convention)
- Body via `$fromAI`: `prompt`, `previous_video_url?`, `campaign_id?`, `telegram_chat_id` (required)
- Returns `{ success, job_id, status, polling_url }` — **not a URL**

### System message changes

1. **Capability menu** — on the first message of a chat, or when the owner
   sends `/help` / `القائمة`, the agent lists its capabilities including
   the new video generation.

2. **`## فيديو الكامباين (جديد)` section** — same approval discipline as
   images (explicit owner request only, costs real money), plus:
   - The tool returns a job id, not a URL — the video arrives
     out-of-band in Telegram.
   - `telegram_chat_id` must be passed (the callback needs it).
   - Restate the current video job id in every campaign draft (memory
     window mitigation, same as images).
   - Refinement via `previous_video_url`.
   - If the owner asks about status: "still generating, will arrive
     shortly" — never claim it's done.

---

## 5. Security

- **`OPENROUTER_API_KEY`** — reused from spec 014, no new secret.
- **`OPENROUTER_VIDEO_CALLBACK_URL`** — new env var, the public URL of the
  callback route. Must be HTTPS (OpenRouter rejects non-HTTPS).
- **`OPENROUTER_WEBHOOK_SECRET`** — optional, for HMAC signature
  verification. Strongly recommended in production.
- **`TELEGRAM_BOT_TOKEN`** — new env var, for the callback route to send
  `sendVideo` directly. If unset, the job completes but the owner won't
  get a push message (the dashboard/poll endpoint still surfaces it).
- **`previous_video_url` host-allowlisted** to our Supabase Storage URL —
  same guard as images, stops an LLM-supplied URL from pushing arbitrary
  third-party content through the vendor.
- **All n8n-facing routes are `requireN8nAccess`-guarded.** The callback
  route is the only public surface, and it only mutates video job rows.
- **No new secret enters a git-tracked file.** The workflow sends only
  `x-n8n-access-token: 123456`, the existing repo convention.
- **Cost is metered per video.** `usage.cost` is logged server-side on
  every callback. Videos are significantly more expensive than images
  (seedance-2.0 bills per video-second), so the prompt-level
  explicit-request gate is load-bearing.

---

## 6. Honest quality note

- **As ad creative: good.** Seedance 2.0 is a current-generation video
  model; a cinematic 4-8 second clip from a campaign brief is a solved
  problem.
- **Not broadcast-grade.** Same caveat as images: fine for social ads,
  not fine for a TV spot. Resolution caps at 1080p.
- **Refinement drifts more than images.** Each video round is a fresh
  generation conditioned on the previous video, not a layer edit. After
  3-4 rounds, detail wanders significantly. Mitigation: prefer
  re-generating from the original brief with a cumulative instruction
  over chaining edits indefinitely.
- **Audio is generated by default.** `generate_audio` defaults to true
  on models that support it. If silent video is wanted, the prompt
  should say so — but seedance-2.0's audio is ambient/music, not voiceover.

---

## Requirements

- **FR-001**: The agent MUST generate a campaign video from a text prompt
  it derives from the negotiated campaign, on the owner's explicit
  request only.
- **FR-002**: The agent MUST support conversational refinement of that
  video via `previous_video_url` (image-to-video / first-frame mode).
- **FR-003**: Video generation MUST use OpenRouter's `bytedance/seedance-2.0`
  model. No new vendor.
- **FR-004**: Every generated video MUST be stored in Supabase Storage
  and represented everywhere as a **public https URL**, never as bytes.
- **FR-005**: The owner MUST receive the completed video as a Telegram
  `sendVideo` in the same chat they negotiated in, without the agent
  needing to poll.
- **FR-006**: The submission MUST return immediately with a job id — the
  agent's tool-result channel is one-shot and cannot wait for the
  minutes-long generation.
- **FR-007**: A poll-fallback endpoint MUST exist for jobs whose OpenRouter
  callback never arrived.
- **FR-008**: The callback endpoint MUST verify the OpenRouter HMAC
  signature when `OPENROUTER_WEBHOOK_SECRET` is configured.
- **FR-009**: The callback handler MUST be idempotent — a duplicate
  callback for an already-terminal job is a no-op.
- **FR-010**: Cost (`usage.cost`) MUST be logged server-side on every
  completion.
- **FR-011**: The agent's system message MUST require explicit owner
  request before invoking `generate_campaign_video`, and MUST instruct
  the agent to tell the owner the video is being generated (not done).
- **FR-012**: The agent's system message MUST include a capability menu
  that lists video generation as an option.
