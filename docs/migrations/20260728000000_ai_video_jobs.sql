-- Video generation jobs for the Telegram marketing agent (spec 015).
-- OpenRouter's video API is asynchronous (submit -> poll/callback), so we
-- persist each job here and resolve it via the OpenRouter webhook
-- (POST /api/webhooks/openrouter/video) with a poll fallback
-- (GET /api/n8n/ai-studio/videos/pending).
--
-- One row per generation request. The final video lands in Supabase Storage
-- (bucket 7alm, prefix ai-studio/videos/) and video_url stores its public
-- https URL — never bytes, for the same reason as campaign images (spec 014 §0).

CREATE TABLE IF NOT EXISTS ai_video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Optional link to the campaign this video was generated for. CASCADE so
  -- deleting a campaign cleans up its video job rows (the storage objects are
  -- orphaned, same accepted tradeoff as images).
  campaign_id uuid REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  -- When refining an existing video (image-to-video / first-frame mode), the
  -- previous video's public URL. Host-allowlisted in the service, same as
  -- images' previous_image_url.
  previous_video_url text,
  -- OpenRouter's job id, returned by POST /api/v1/videos. Used for polling.
  openrouter_job_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','failed','cancelled','expired')),
  -- Public https URL of the generated video once status = 'completed'.
  video_url text,
  cost numeric,
  error text,
  -- The Telegram chat id to notify when the video is ready. The callback
  -- route sends a sendVideo message here directly — the agent cannot poll.
  telegram_chat_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS ai_video_jobs_status_idx ON ai_video_jobs(status);
CREATE INDEX IF NOT EXISTS ai_video_jobs_openrouter_job_id_idx ON ai_video_jobs(openrouter_job_id);
CREATE INDEX IF NOT EXISTS ai_video_jobs_campaign_id_idx ON ai_video_jobs(campaign_id);
