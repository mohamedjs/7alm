"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";

/**
 * The payload shape Supabase Realtime delivers for postgres_changes.
 */
export interface RealtimePayload<T = Record<string, unknown>> {
  type: "INSERT" | "UPDATE" | "DELETE" | "*";
  eventType: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  old: T | null;
  new: T | null;
}

export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimeNotification {
  message: string;
  type: "info" | "success";
}

interface UseRealtimeOptions {
  /** Event filter: "*", "INSERT", "UPDATE", "DELETE". Default "*". */
  event?: RealtimeEventType;
  /** Optional column filter, e.g. "status=eq.pending". */
  filter?: string;
  /** Called for every incoming event. */
  onEvent?: (payload: RealtimePayload) => void;
  /** If true, show a notification banner (set externally). Default false. */
  showNotification?: boolean;
}

interface UseRealtimeResult {
  /** The most recent event payload (null until first event arrives). */
  lastEvent: RealtimePayload | null;
  /** Total number of events received since mount. */
  eventCount: number;
  /** Whether the realtime channel is currently connected. */
  isConnected: boolean;
  /** Notification banner state (message + type), null when cleared. */
  notification: RealtimeNotification | null;
  /** Manually clear the notification banner. */
  clearNotification: () => void;
}

/**
 * Global realtime subscription hook.
 *
 * Usage:
 *   const { lastEvent, isConnected, notification } = useRealtime("orders", {
 *     event: "*",
 *     onEvent: (payload) => console.log("order changed:", payload),
 *   });
 *
 * Automatically calls `router.refresh()` on every change so Server
 * Components re-fetch the latest data. Multiple components can
 * subscribe to the same table — each gets its own channel.
 *
 * If the Supabase client env vars are missing, the hook is a no-op
 * (returns isConnected: false, never fires events) so the app keeps
 * working without realtime.
 *
 * Pattern adapted from the dahabayas project's useRealtimeRefresh.
 */
export function useRealtime(
  table: string,
  options: UseRealtimeOptions = {}
): UseRealtimeResult {
  const { event = "*", filter, onEvent, showNotification = false } = options;
  const router = useRouter();
  const [lastEvent, setLastEvent] = useState<RealtimePayload | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [notification, setNotification] = useState<RealtimeNotification | null>(null);
  const onEventRef = useRef(onEvent);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest callback without re-subscribing
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!supabaseClient) {
      console.warn(`[useRealtime] No Supabase client — realtime disabled for table "${table}"`);
      return;
    }

    const channelName = `realtime:${table}:${event}:${filter || "all"}:${Date.now()}`;
    console.log(`[useRealtime] Setting up channel "${channelName}" for table "${table}"`);

    const postgresConfig: Record<string, string> = {
      event,
      schema: "public",
      table,
    };

    if (filter) {
      postgresConfig.filter = filter;
    }

    // Capture a non-null reference so the cleanup closure stays type-safe.
    const client = supabaseClient;
    const channel = client.channel(channelName);

    // Cast to bypass Supabase's strict overload resolution — the runtime
    // contract is correct (event name + config + callback). The type
    // library narrows the overloads in a way that rejects the string
    // config object shape we pass.
    (channel as unknown as {
      on: (
        type: string,
        config: Record<string, string>,
        cb: (payload: unknown) => void
      ) => {
        subscribe: (
          cb: (status: string, err: unknown) => void
        ) => unknown;
      };
    })
      .on("postgres_changes", postgresConfig, (payload: unknown) => {
        const typed = payload as RealtimePayload;
        console.log(`[useRealtime] ✅ Change received on "${table}":`, typed);

        setLastEvent(typed);
        setEventCount((c) => c + 1);
        onEventRef.current?.(typed);

        // Trigger server refresh to re-fetch latest data
        router.refresh();

        // Optional notification banner
        if (showNotification) {
          let message = `The ${table} list has been updated.`;
          if (typed.eventType === "INSERT")
            message = `A new ${table.slice(0, -1)} has been added.`;
          if (typed.eventType === "UPDATE")
            message = `A ${table.slice(0, -1)} has been updated.`;
          if (typed.eventType === "DELETE")
            message = `A ${table.slice(0, -1)} has been removed.`;

          setNotification({ message, type: "info" });

          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          timerRef.current = setTimeout(() => setNotification(null), 5000);
        }
      })
      .subscribe((status: string, err: unknown) => {
        console.log(`[useRealtime] Channel "${channelName}" status:`, status);
        if (err) console.error(`[useRealtime] ❌ Subscription error:`, err);
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      client.removeChannel(channel);
      setIsConnected(false);
    };
  }, [router, table, event, filter, showNotification]);

  const clearNotification = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setNotification(null);
  };

  return {
    lastEvent,
    eventCount,
    isConnected,
    notification,
    clearNotification,
  };
}

/**
 * Convenience hook: subscribe to a table and refresh the router on
 * any change. This is the simplest pattern — drop it into any page
 * that needs live updates.
 *
 * Usage:
 *   useRealtimeRefresh("orders", "orders-channel");
 *
 * Adapted from the dahabayas project's useRealtimeRefresh.
 */
export function useRealtimeRefresh(
  table: string,
  channelName: string,
  options?: { showNotification?: boolean }
) {
  return useRealtime(table, {
    event: "*",
    showNotification: options?.showNotification ?? false,
  });
}
