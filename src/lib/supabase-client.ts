"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Client-side Supabase client using the anon key.
 *
 * This is safe to import in client components. It is used exclusively
 * for Realtime subscriptions — all data mutations still go through
 * API routes (Repository → Service pattern).
 *
 * The anon key is public by design (it's meant to be exposed to the
 * browser). Row Level Security in Supabase controls what data is
 * accessible.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  // Don't throw at module load — the hook handles the missing-client
  // case gracefully so the app doesn't crash if env vars aren't set.
  console.warn(
    "[supabase-client] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Realtime will be disabled."
  );
}

export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
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
