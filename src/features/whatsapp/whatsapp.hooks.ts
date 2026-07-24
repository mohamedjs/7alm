"use client";

import { useCallback, useState } from "react";
import {
  useGetMessagesQuery,
  useSendMessageMutation,
} from "@/features/customers/customers.api";
import { useRealtime } from "@/features/realtime/realtime.hooks";

/**
 * Drives the WhatsApp chat panel for a single customer: fetches the
 * message history, subscribes to realtime updates on that customer's
 * rows, and exposes a compose/send flow.
 */
export function useWhatsAppChat(customerId: string) {
  const [page] = useState(1);
  const [composeText, setComposeText] = useState("");

  const { data, isLoading, refetch } = useGetMessagesQuery(
    { customerId, page, limit: 50 },
    { skip: !customerId },
  );

  const [sendMessageMutation, { isLoading: isSending }] =
    useSendMessageMutation();

  // Real-time: refetch messages when whatsapp_messages changes for this customer.
  useRealtime("whatsapp_messages", {
    event: "*",
    filter: `customer_id=eq.${customerId}`,
    onEvent: () => refetch(),
  });

  const sendMessage = useCallback(async () => {
    const trimmed = composeText.trim();
    if (!trimmed || isSending) return;
    try {
      await sendMessageMutation({ customerId, body: trimmed }).unwrap();
      setComposeText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [composeText, isSending, customerId, sendMessageMutation]);

  return {
    messages: data?.data ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isSending,
    composeText,
    setComposeText,
    sendMessage,
    refetch,
  };
}
