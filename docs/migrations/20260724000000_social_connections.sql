-- ============================================================
-- Social Platform Connections — OAuth "connect accounts" foundation
-- Spec: docs/specs/social-connections.md (§3)
-- Run this in Supabase SQL Editor
-- NOTE: this file is NOT applied automatically — apply manually.
-- ============================================================

-- 1. Create social_connections table
CREATE TABLE IF NOT EXISTS social_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform          text NOT NULL CHECK (platform IN ('facebook','instagram','tiktok','whatsapp')),
  account_id        text,                 -- provider's account/user id (null until connected)
  account_name      text,                 -- handle/display name → shown as "Connected as @handle"
  avatar_url        text,
  access_token      text,                 -- ENCRYPTED at rest (never returned to client)
  refresh_token     text,                 -- ENCRYPTED at rest, nullable
  token_expires_at  timestamptz,
  scopes            text[] NOT NULL DEFAULT '{}',
  status            text NOT NULL DEFAULT 'disconnected'
                    CHECK (status IN ('disconnected','connected','expired','revoked','error')),
  error_message     text,
  metadata          jsonb NOT NULL DEFAULT '{}',
  connected_by      uuid REFERENCES public.admins(id) ON DELETE SET NULL,
  connected_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform)                       -- one connection per platform for now
);

-- 2. Index for status lookups (admin dashboard list view)
CREATE INDEX IF NOT EXISTS idx_social_connections_status
  ON social_connections (status);

-- 3. Lock the table down — backend only ever accesses it with the Supabase
--    service role (which bypasses RLS). No policies are defined on purpose,
--    so anon/authenticated roles have zero access even if ever granted.
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
