# Tasks: Campaign Video Generation

**Spec**: `specs/015-ops-video-campaigns/spec.md`
**Plan**: `specs/015-ops-video-campaigns/plan.md`

## Database

- [x] T001 — Write migration `20260728000000_ai_video_jobs.sql` (table + indexes)
- [x] T002 — Apply migration to Supabase

## Types

- [x] T003 — Add `VideoJobStatus`, `VideoJob`, `VideoJobInput` to `src/features/shared/types.ts`

## Repository

- [x] T004 — Create `src/features/ai-studio/videos.repository.ts` (create, getById, getByOpenrouterJobId, listByStatus, listStale, updateStatus)

## Service

- [x] T005 — Create `src/features/ai-studio/videos.service.ts`
  - [x] T005a — `submit()` (POST to OpenRouter, persist job)
  - [x] T005b — `pollAndUpdate()` (poll one job)
  - [x] T005c — `handleCallback()` (idempotent status update)
  - [x] T005d — `downloadAndStore()` (fetch + upload to Supabase Storage)
  - [x] T005e — `notifyTelegram()` (sendVideo via Bot API)

## Routes

- [x] T006 — `POST /api/n8n/ai-studio/videos` (submit, n8n-only)
- [x] T007 — `GET /api/n8n/ai-studio/videos/[id]` (status, n8n-only)
- [x] T008 — `GET /api/n8n/ai-studio/videos/pending` (poll fallback, n8n-only)
- [x] T009 — `POST /api/webhooks/openrouter/video` (callback, optional HMAC)

## n8n workflow

- [x] T010 — Add `generate_campaign_video` tool node to `telegram-fb-post-workflow.json`
- [x] T011 — Wire tool as `ai_tool` input to `Generate FB Post` agent
- [x] T012 — Add `## فيديو الكامباين` section to system message
- [x] T013 — Add capability menu to system message

## Verification

- [ ] T014 — `npx tsc --noEmit` passes
- [ ] T015 — `npm run build` passes
- [ ] T016 — All workflow JSON files parse
- [ ] T017 — Manual review: video tool `$fromAI` fields match route body schema
