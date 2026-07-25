-- Restructures ad_campaigns for the conversational campaign-builder flow (spec 013 pivot:
-- replaces the schedule-driven trend -> design-idea -> Telegram-card pipeline with a chat-driven
-- "research a niche -> negotiate a campaign -> approve in chat -> optional auto-publish" flow).
-- Additive/widening only: design_ideas, trends, and marketing_content tables/rows are left in
-- place, unused, in case a future design-idea flow needs them again.
-- Applied via Supabase MCP on 2026-07-26; this file documents that change for the repo history.

ALTER TABLE marketing_content ALTER COLUMN design_idea_id DROP NOT NULL;
ALTER TABLE ad_campaigns ALTER COLUMN marketing_content_id DROP NOT NULL;

ALTER TABLE ad_campaigns DROP CONSTRAINT ad_campaigns_platform_check;
ALTER TABLE ad_campaigns ALTER COLUMN platform DROP NOT NULL;
ALTER TABLE ad_campaigns ALTER COLUMN platform DROP DEFAULT;
ALTER TABLE ad_campaigns ADD CONSTRAINT ad_campaigns_platform_check
  CHECK (platform IS NULL OR platform IN ('meta', 'facebook_instagram', 'whatsapp'));

ALTER TABLE ad_campaigns ADD COLUMN name text;
ALTER TABLE ad_campaigns ADD COLUMN niche text;
ALTER TABLE ad_campaigns ADD COLUMN objective text;
ALTER TABLE ad_campaigns ADD COLUMN research_summary text;
ALTER TABLE ad_campaigns ADD COLUMN headline text;
ALTER TABLE ad_campaigns ADD COLUMN primary_text text;
ALTER TABLE ad_campaigns ADD COLUMN cta text;
ALTER TABLE ad_campaigns ADD COLUMN hashtags text;
ALTER TABLE ad_campaigns ADD COLUMN telegram_chat_id text;

CREATE INDEX IF NOT EXISTS ad_campaigns_chat_id_idx ON ad_campaigns (telegram_chat_id);
