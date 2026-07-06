"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Client-side Supabase client used exclusively for Realtime subscriptions.
 * All data mutations still go through API routes (Repository → Service pattern).
 *
 * MUST use the publishable/anon key (sb_publishable_... or legacy anon JWT).
 * Secret keys (sb_secret_...) are rejected by Supabase in browsers and must
 * never be exposed via NEXT_PUBLIC_* — they would let anyone bypass RLS.
 *
 * With RLS enabled, realtime postgres_changes events are only delivered for
 * rows the subscriber can SELECT. Call `setRealtimeAuth(adminToken)` after
 * login so the channel is authorized as the admin user.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_KEY ||
  "";

if (!supabaseUrl || !supabaseKey) {
  // Don't throw at module load — the hook handles the missing-client
  // case gracefully so the app doesn't crash if env vars aren't set.
  console.warn(
    "[supabase-client] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Realtime will be disabled."
  );
}

if (supabaseKey.startsWith("sb_secret_")) {
  console.error(
    "[supabase-client] ❌ A SECRET key is exposed to the browser via NEXT_PUBLIC_*. " +
      "Supabase blocks secret keys in browsers (realtime will not connect) and this " +
      "leaks the key to anyone. Use the sb_publishable_... key instead."
  );
}

/**
 * Authorize the realtime connection as a logged-in user (e.g. the admin's
 * Supabase access token). Required for postgres_changes to pass RLS when
 * tables are locked down to authenticated admins.
 */
export function setRealtimeAuth(accessToken: string | null) {
  supabaseClient?.realtime.setAuth(accessToken);
}

export const supabaseClient = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;
