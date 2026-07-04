"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Client-side Supabase client used exclusively for Realtime subscriptions.
 * All data mutations still go through API routes (Repository → Service pattern).
 *
 * Uses NEXT_PUBLIC_SUPABASE_KEY which can be either the anon key or
 * service role key depending on the project setup.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  // Don't throw at module load — the hook handles the missing-client
  // case gracefully so the app doesn't crash if env vars aren't set.
  console.warn(
    "[supabase-client] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_KEY. Realtime will be disabled."
  );
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
