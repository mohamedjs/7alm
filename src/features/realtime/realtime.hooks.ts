"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/redux/hooks";
import { getSocket } from "@/lib/realtime/socket";

/**
 * Live updates from the NestJS realtime gateway (socket.io + Redis), which
 * replaced Supabase Realtime. The hook keeps its v1 signature so pages did
 * not change: `useRealtime("orders", { onEvent })`.
 *
 * Server events: orders:changed, catalog:changed, crm:whatsapp,
 * inbox:message, inbox:status, inbox:comment.
 */
export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimePayload<T = Record<string, unknown>> {
  type: string;
  table: string;
  new: T | null;
}

export interface RealtimeNotification {
  message: string;
  type: "info" | "success";
}

interface UseRealtimeOptions {
  event?: RealtimeEventType;
  /** v1 PostgREST-style filter, e.g. `customer_id=eq.<uuid>` (applied client-side). */
  filter?: string;
  onEvent?: (payload: RealtimePayload) => void;
  showNotification?: boolean;
}

/** Which gateway events stand for which v1 table subscription. */
const TABLE_EVENTS: Record<string, string[]> = {
  orders: ["orders:changed"],
  products: ["catalog:changed"],
  categories: ["catalog:changed"],
  whatsapp_messages: ["crm:whatsapp"],
  inbox: ["inbox:message", "inbox:status", "inbox:comment"],
};

const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function matchesFilter(filter: string | undefined, payload: Record<string, unknown>): boolean {
  if (!filter) return true;
  const m = /^([a-z_]+)=eq\.(.+)$/.exec(filter);
  if (!m) return true;
  const value = payload[m[1]] ?? payload[toCamel(m[1])];
  return value === undefined || String(value) === m[2];
}

export function useRealtime(table: string, options: UseRealtimeOptions = {}) {
  const { filter, onEvent, showNotification = false } = options;
  const router = useRouter();
  const token = useAppSelector((s) => s.auth.token);
  const [lastEvent, setLastEvent] = useState<RealtimePayload | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [notification, setNotification] = useState<RealtimeNotification | null>(null);
  const onEventRef = useRef(onEvent);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    const events = TABLE_EVENTS[table] ?? [`${table}:changed`];
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const handler = (eventName: string) => (data: Record<string, unknown>) => {
      if (!matchesFilter(filter, data ?? {})) return;
      const payload: RealtimePayload = { type: String(data?.type ?? eventName), table, new: data ?? null };
      setLastEvent(payload);
      setEventCount((c) => c + 1);
      onEventRef.current?.(payload);
      router.refresh();
      if (showNotification) {
        setNotification({ message: `The ${table} list has been updated.`, type: "info" });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setNotification(null), 5000);
      }
    };
    const bound = events.map((e) => [e, handler(e)] as const);
    socket.on("connect", onConnect);
    socket.on("ready", onConnect);
    socket.on("disconnect", onDisconnect);
    bound.forEach(([e, h]) => socket.on(e, h));
    if (socket.connected) queueMicrotask(onConnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("ready", onConnect);
      socket.off("disconnect", onDisconnect);
      bound.forEach(([e, h]) => socket.off(e, h));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router, table, filter, showNotification, token]);

  return {
    lastEvent,
    eventCount,
    isConnected,
    notification,
    clearNotification: () => {
      if (timer.current) clearTimeout(timer.current);
      setNotification(null);
    },
  };
}

export function useRealtimeRefresh(table: string, _channelName?: string, options?: { showNotification?: boolean }) {
  return useRealtime(table, { event: "*", showNotification: options?.showNotification ?? false });
}
