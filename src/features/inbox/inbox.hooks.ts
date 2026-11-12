"use client";

import { useEffect, useMemo, useState } from "react";
import { useRealtime } from "@/features/realtime/realtime.hooks";
import type { DictKey } from "@/features/i18n/dictionary";
import type { InboxChannel, InboxConversation, SocialComment } from "@/features/shared/types";
import {
  useGetCommentsQuery,
  useGetConversationsQuery,
  useGetCountsQuery,
  useGetThreadQuery,
  usePatchCommentMutation,
  useReplyToCommentMutation,
  useSendMessageMutation,
  useSetConversationStatusMutation,
} from "./inbox.api";

const HOUR = 3600_000;

/** Same window rules the backend enforces (domain/policies.ts) — shown to the admin before sending. */
export function replyWindow(channel: InboxChannel, lastInboundAt: string | null, now = Date.now()): { key: DictKey; canSend: boolean } {
  const age = lastInboundAt ? now - new Date(lastInboundAt).getTime() : Infinity;
  if (age <= 24 * HOUR) return { key: "inbox.window.open", canSend: true };
  if (channel === "whatsapp") return { key: "inbox.window.template", canSend: true };
  if (age <= 7 * 24 * HOUR) return { key: "inbox.window.humanAgent", canSend: true };
  return { key: "inbox.window.closed", canSend: false };
}

/** Conversation list + selected thread + composer for the Messages tab. */
export function useInboxMessages() {
  const [channel, setChannel] = useState<InboxChannel | "">("");
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const list = useGetConversationsQuery({ channel: channel || undefined, status, search: search.trim() || undefined });
  const thread = useGetThreadQuery(selectedId ?? "", { skip: !selectedId });
  const counts = useGetCountsQuery();
  const [send, sendState] = useSendMessageMutation();
  const [setConversationStatus] = useSetConversationStatusMutation();

  const { isConnected } = useRealtime("inbox", {
    onEvent: (p) => {
      list.refetch();
      counts.refetch();
      const conversationId = (p.new as { conversationId?: string } | null)?.conversationId;
      if (selectedId && (!conversationId || conversationId === selectedId)) thread.refetch();
    },
  });

  // Opening a thread marks it read on the server; refresh the list badges once it has loaded.
  const threadLoadedAt = thread.fulfilledTimeStamp;
  useEffect(() => {
    if (threadLoadedAt) {
      list.refetch();
      counts.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadLoadedAt]);

  const selected: InboxConversation | undefined = useMemo(() => list.data?.find((c) => c.id === selectedId) ?? thread.data, [list.data, selectedId, thread.data]);
  const window = selected ? replyWindow(selected.channel, selected.last_inbound_at) : null;

  const submit = async () => {
    const text = draft.trim();
    if (!text || !selectedId) return;
    try {
      await send({ conversationId: selectedId, text }).unwrap();
      setDraft("");
    } catch {
      /* error surfaced through sendState */
    }
  };

  return {
    filters: { channel, setChannel, status, setStatus, search, setSearch },
    conversations: list.data ?? [],
    isLoadingList: list.isLoading,
    counts: counts.data,
    selectedId,
    select: setSelectedId,
    selected,
    thread: thread.data,
    isLoadingThread: thread.isFetching && !thread.data,
    window,
    draft,
    setDraft,
    submit,
    isSending: sendState.isLoading,
    sendError: (sendState.error as { data?: { error?: string } } | undefined)?.data?.error ?? null,
    toggleClosed: () => selected && setConversationStatus({ id: selected.id, status: selected.status === "open" ? "closed" : "open" }),
    isLive: isConnected,
  };
}

/** Comments tab: list, public/private reply, hide, mark answered. */
export function useInboxComments() {
  const [platform, setPlatform] = useState<"facebook" | "instagram" | "">("");
  const [status, setStatus] = useState<"open" | "done">("open");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const comments = useGetCommentsQuery({ platform: platform || undefined, status });
  const [reply, replyState] = useReplyToCommentMutation();
  const [patch] = usePatchCommentMutation();

  useRealtime("inbox", { onEvent: () => comments.refetch() });

  const send = async (c: SocialComment, kind: "public" | "private") => {
    const text = (drafts[c.id] ?? "").trim();
    if (!text) return;
    try {
      await reply({ id: c.id, text, kind }).unwrap();
      setDrafts((d) => ({ ...d, [c.id]: "" }));
    } catch {
      /* surfaced via replyState */
    }
  };

  return {
    platform,
    setPlatform,
    status,
    setStatus,
    comments: comments.data ?? [],
    isLoading: comments.isLoading,
    drafts,
    setDraft: (id: string, v: string) => setDrafts((d) => ({ ...d, [id]: v })),
    send,
    isReplying: replyState.isLoading,
    replyError: (replyState.error as { data?: { error?: string } } | undefined)?.data?.error ?? null,
    toggleHidden: (c: SocialComment) => patch({ id: c.id, hidden: !c.is_hidden }),
    markDone: (c: SocialComment) => patch({ id: c.id, status: "done" }),
  };
}
