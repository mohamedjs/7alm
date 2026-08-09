# Implementation Plan: Campaign Video Generation

**Spec**: `specs/015-ops-video-campaigns/spec.md`
**Status**: Implemented.

## Architecture

```
Telegram owner message
  → n8n "Generate FB Post" agent
    → generate_campaign_video tool (httpRequestTool)
      → POST /api/n8n/ai-studio/videos  (requireN8nAccess)
        → VideosService.submit()
          → POST openrouter.ai/api/v1/videos  (callback_url set)
          → persist ai_video_jobs row (status=pending)
        ← returns { job_id, status: "pending", polling_url } immediately
      ← tool result to agent: "video is being generated, job_id=…"
    → agent tells owner: "الفيديو بيتولّد، هيوصلك قريب"

  (minutes later, out-of-band)

OpenRouter job completes
  → POST /api/webhooks/openrouter/video  (optional HMAC)
    → VideosService.handleCallback()
      → idempotent status check (skip if already terminal)
      → download unsigned_urls[0] → upload to Supabase Storage
      → update ai_video_jobs row (status=completed, video_url=…)
      → Telegram sendVideo to telegram_chat_id  (if TELEGRAM_BOT_TOKEN set)

  (fallback if callback never arrives)

n8n cron workflow (every 5 min)
  → GET /api/n8n/ai-studio/videos/pending  (requireN8nAccess)
    → VideosService.pollAndUpdate() for each stale job
      → GET openrouter.ai/api/v1/videos/{jobId}
      → same download/store/notify path as callback
```

## Components

### Database
- `docs/migrations/20260728000000_ai_video_jobs.sql` — `ai_video_jobs` table + indexes. **Applied.**

### Types
- `src/features/shared/types.ts` — `VideoJobStatus`, `VideoJob`, `VideoJobInput`.

### Repository
- `src/features/ai-studio/videos.repository.ts` — `VideosRepository` (create, getById, getByOpenrouterJobId, listByStatus, listStale, updateStatus).

### Service
- `src/features/ai-studio/videos.service.ts` — `VideosService` (submit, pollAndUpdate, handleCallback, downloadAndStore, notifyTelegram).

### Routes
- `src/app/api/n8n/ai-studio/videos/route.ts` — POST submit (n8n-only).
- `src/app/api/n8n/ai-studio/videos/[id]/route.ts` — GET status (n8n-only).
- `src/app/api/n8n/ai-studio/videos/pending/route.ts` — GET stale jobs + poll (n8n-only).
- `src/app/api/webhooks/openrouter/video/route.ts` — POST callback (optional HMAC).

### n8n workflow
- `automation/telegram-fb-post-workflow.json` — new `generate_campaign_video` tool node + system message extension (video section + capability menu).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes (reused from 014) | OpenRouter auth. |
| `OPENROUTER_VIDEO_CALLBACK_URL` | Yes | Public HTTPS URL of the callback route. |
| `OPENROUTER_WEBHOOK_SECRET` | Recommended | HMAC signing secret for callback verification. |
| `TELEGRAM_BOT_TOKEN` | Yes (for push delivery) | Bot token for the callback route to send `sendVideo`. |
| `N8N_API_ACCESS_TOKEN` | Yes (reused) | `requireN8nAccess` guard. |

## Tradeoffs

- **No hard cost cap.** Same stance as spec 014: prompt-level gate +
  server-side logging. An agent generating videos in a loop is the
  realistic failure mode; add a cap only if it shows up on a bill.
- **Optional callback auth.** If `OPENROUTER_WEBHOOK_SECRET` is unset, the
  callback route accepts unsigned POSTs. Acceptable because the only
  mutation is completing a video job row, and the callback URL is not
  enumerable. Documented in the spec.
- **Orphaned storage objects.** Every rejected video iteration leaves a
  file in the bucket (~5-20 MB each). No GC job in this cut.
- **No `video_url` on `ad_campaigns`.** A campaign can have many video
  attempts; linking the approved one to the campaign row is out of scope.
  The jobs table is the source of truth for now.
