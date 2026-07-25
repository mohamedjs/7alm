-- ============================================================
-- AI Studio — core schema (trend discovery → design → approval →
-- assets → marketing → ads → analytics → memory)
-- Spec: specs/013-ai-studio/spec.md, specs/013-ai-studio/plan.md
-- Run this in Supabase SQL Editor
-- NOTE: this file is NOT applied automatically — apply manually.
-- All tables are NEW and additive. No existing table/column is modified.
-- ============================================================

-- 1. Trends — raw signal collected from external sources
CREATE TABLE IF NOT EXISTS trends (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL CHECK (source IN
                  ('pinterest','etsy','tiktok','instagram','google_trends','reddit','amazon','manual')),
  fingerprint   text NOT NULL,               -- dedup key: hash of source + normalized signal
  raw_signal    jsonb NOT NULL DEFAULT '{}', -- original payload from the source
  summary       text,                        -- AI-generated summary (Trend Hunter / Market Research)
  score         numeric(5,2),                -- relevance/momentum score, source-defined scale
  status        text NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','summarized','used','archived')),
  collected_at  timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_trends_status ON trends (status);
CREATE INDEX IF NOT EXISTS idx_trends_source ON trends (source);

-- 2. Design Ideas — AI-proposed concepts derived from trend(s)
CREATE TABLE IF NOT EXISTS design_ideas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  description       text NOT NULL,
  concept_fingerprint text NOT NULL,          -- normalized-concept hash, used for duplicate detection
  source_trend_ids  uuid[] NOT NULL DEFAULT '{}',
  status            text NOT NULL DEFAULT 'pending_review'
                    CHECK (status IN
                      ('pending_review','approved','rejected','possible_duplicate','published')),
  is_favorite       boolean NOT NULL DEFAULT false,
  product_id        uuid REFERENCES public.products(id) ON DELETE SET NULL, -- set on publish
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_ideas_status ON design_ideas (status);
CREATE INDEX IF NOT EXISTS idx_design_ideas_concept_fingerprint ON design_ideas (concept_fingerprint);

-- 3. Design Versions — each iteration (original + regenerations) of an idea
CREATE TABLE IF NOT EXISTS design_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_idea_id uuid NOT NULL REFERENCES design_ideas(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  prompt        text NOT NULL,               -- prompt used for this version (Prompt Engineer output)
  admin_feedback text,                       -- free-text feedback from "Edit" action
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (design_idea_id, version_number)
);

-- 4. Generated Assets — images produced from an approved design version
CREATE TABLE IF NOT EXISTS generated_assets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_version_id uuid NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
  asset_type        text NOT NULL CHECK (asset_type IN ('studio','lifestyle','transparent_png')),
  image_url         text NOT NULL,
  status            text NOT NULL DEFAULT 'pending_review'
                    CHECK (status IN ('pending_review','approved','rejected_qa')),
  qa_notes          text,                    -- Mockup Director's QA checklist notes
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_assets_status ON generated_assets (status);

-- 5. Marketing Content — copy generated for an approved, imaged design
CREATE TABLE IF NOT EXISTS marketing_content (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_idea_id uuid NOT NULL REFERENCES design_ideas(id) ON DELETE CASCADE,
  headline      text,
  primary_text  text,
  cta           text,
  language      text NOT NULL DEFAULT 'ar' CHECK (language IN ('ar','en')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 6. Ad Campaigns — Meta Ads drafts (never auto-published)
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_content_id  uuid NOT NULL REFERENCES marketing_content(id) ON DELETE CASCADE,
  platform              text NOT NULL DEFAULT 'meta' CHECK (platform IN ('meta')),
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','published','archived')),
  target_audience       jsonb DEFAULT '{}',
  daily_budget          numeric(10,2),
  external_campaign_id  text,                -- populated only once/if actually published via Ads API
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns (status);

-- 7. Analytics — ingested performance data for a published design/campaign
CREATE TABLE IF NOT EXISTS analytics (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_idea_id uuid REFERENCES design_ideas(id) ON DELETE SET NULL,
  ad_campaign_id uuid REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  metric_date    date NOT NULL,
  impressions    integer DEFAULT 0,
  clicks         integer DEFAULT 0,
  conversions    integer DEFAULT 0,
  spend          numeric(10,2) DEFAULT 0,
  revenue        numeric(10,2) DEFAULT 0,
  raw_payload    jsonb DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_design_idea ON analytics (design_idea_id);

-- 8. AI Memory — distilled learnings reused as generation context
CREATE TABLE IF NOT EXISTS ai_memory (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text NOT NULL CHECK (category IN
                  ('trend_pattern','design_preference','audience_insight','pricing','general')),
  insight       text NOT NULL,
  confidence    numeric(3,2) DEFAULT 0.50,   -- 0..1, increases as more data confirms it
  source_analytics_ids uuid[] DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 9. Telegram Approval Logs — audit trail for every approval action
CREATE TABLE IF NOT EXISTS telegram_approval_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_idea_id uuid NOT NULL REFERENCES design_ideas(id) ON DELETE CASCADE,
  action         text NOT NULL CHECK (action IN
                  ('approve','reject','edit','regenerate','favorite','publish')),
  telegram_user_id text,
  previous_status  text,
  new_status       text,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_approval_logs_idea ON telegram_approval_logs (design_idea_id);

-- ============================================================
-- Row Level Security — service role only (same convention as
-- social_connections: backend uses the Supabase service role, which
-- bypasses RLS, so no policies are defined for anon/authenticated).
-- ============================================================
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_approval_logs ENABLE ROW LEVEL SECURITY;
