-- Stores the final approved campaign visual (spec 014). One column, singular:
-- iterations live in the n8n per-chat conversation memory and as orphaned
-- objects in Supabase Storage; only the approved image lands on the row —
-- the same rule the ad copy already follows.
-- Applied via Supabase MCP on 2026-07-26.

ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS image_url text;
